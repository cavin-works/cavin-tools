import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Download, Upload, Trash2, CheckCircle, XCircle, Loader2, ImageIcon, FolderOpen } from 'lucide-react';
import { useBackgroundRemoverStore } from './store/backgroundRemoverStore';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import type { BackgroundRemoveTask, RemoveBackgroundResult, BatchProgressEvent, ModelInfo, DownloadProgress } from './types';

// 复用 ImageInfo 类型
interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  colorType: string;
}

export function BackgroundRemover() {
  const {
    modelInfo,
    setModelInfo,
    isDownloading,
    setIsDownloading,
    downloadProgress,
    setDownloadProgress,
    tasks,
    addTask,
    updateTask,
    removeTask,
    clearTasks,
    getRemoveParams,
    isBatchProcessing,
    setBatchProcessing,
    setBatchProgress,
    batchProgress,
    selectedTaskId,
    setSelectedTask,
    outputFormat,
    setOutputFormat,
    feather,
    setFeather,
    backgroundColor,
    setBackgroundColor,
  } = useBackgroundRemoverStore();

  const [isDragging, setIsDragging] = useState(false);

  // 检查模型状态
  useEffect(() => {
    checkModelStatus();
  }, []);

  const checkModelStatus = async () => {
    try {
      const info = await invoke<ModelInfo>('check_bg_model_status');
      setModelInfo(info);
    } catch (error) {
      console.error('检查模型状态失败:', error);
    }
  };

  // 监听模型下载进度
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      unlisten = await listen<DownloadProgress>('bg-model-download-progress', (event) => {
        setDownloadProgress(event.payload.percentage);
        if (event.payload.status === 'completed') {
          checkModelStatus();
          setIsDownloading(false);
        }
      });
    }

    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // 监听文件拖拽
  useEffect(() => {
    let dragEnterUnlisten: (() => void) | undefined;
    let dragLeaveUnlisten: (() => void) | undefined;
    let dragDropUnlisten: (() => void) | undefined;

    async function setupDragListeners() {
      dragEnterUnlisten = await listen('tauri://drag-enter', () => setIsDragging(true));
      dragLeaveUnlisten = await listen('tauri://drag-leave', () => setIsDragging(false));
      dragDropUnlisten = await listen('tauri://drag-drop', (event: any) => {
        const payload = event.payload as { paths: string[] };
        setIsDragging(false);
        if (payload.paths?.length > 0) {
          handleFilesSelected(payload.paths);
        }
      });
    }

    setupDragListeners();
    return () => {
      if (dragEnterUnlisten) dragEnterUnlisten();
      if (dragLeaveUnlisten) dragLeaveUnlisten();
      if (dragDropUnlisten) dragDropUnlisten();
    };
  }, []);

  // 监听批量处理进度
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupProgressListener() {
      unlisten = await listen<BatchProgressEvent>('bg-remove-batch-progress', (event) => {
        setBatchProgress(event.payload.percentage);
      });
    }

    setupProgressListener();
    return () => { if (unlisten) unlisten(); };
  }, [setBatchProgress]);

  // 下载模型
  const handleDownloadModel = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await invoke('download_bg_model');
      showSuccess('模型下载完成');
    } catch (error) {
      showError('模型下载失败', error);
      setIsDownloading(false);
    }
  };

  // 选择文件
  const handleSelectFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      handleFilesSelected(paths);
    }
  };

  // 处理选中的文件
  const handleFilesSelected = useCallback(async (paths: string[]) => {
    for (const path of paths) {
      try {
        const info = await invoke<ImageInfo>('get_image_info', { path });
        const task: BackgroundRemoveTask = {
          id: `${Date.now()}-${Math.random()}`,
          inputPath: path,
          filename: info.filename,
          format: info.format.toLowerCase(),
          originalSize: info.fileSize,
          width: info.width,
          height: info.height,
          status: 'pending',
          progress: 0,
        };
        addTask(task);
      } catch (error) {
        showError(`无法加载图片: ${path}`, error);
      }
    }
  }, [addTask]);

  // 执行去背景
  const handleRemoveBackgrounds = async () => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length === 0) {
      showError('没有待处理的文件');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress(0);

    try {
      pendingTasks.forEach((task) => {
        updateTask(task.id, { status: 'processing', progress: 0 });
      });

      const inputPaths = pendingTasks.map((t) => t.inputPath);
      const params = getRemoveParams();

      const results = await invoke<Array<{ Ok?: RemoveBackgroundResult; Err?: string }>>(
        'batch_remove_image_backgrounds',
        { inputPaths, params }
      );

      pendingTasks.forEach((task, index) => {
        const result = results[index];
        if ('Ok' in result && result.Ok) {
          updateTask(task.id, { status: 'completed', progress: 100, result: result.Ok });
        } else if ('Err' in result) {
          updateTask(task.id, { status: 'failed', progress: 0, error: result.Err });
        }
      });

      const successCount = results.filter((r) => 'Ok' in r).length;
      showSuccess(`处理完成: ${successCount}/${results.length} 个文件`);
    } catch (error) {
      showError('批量处理失败', error);
      pendingTasks.forEach((task) => {
        updateTask(task.id, { status: 'failed', error: String(error) });
      });
    } finally {
      setBatchProcessing(false);
      setBatchProgress(0);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // 模型未下载时显示下载界面
  if (!modelInfo?.downloaded) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-neutral-200 p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Download className="w-8 h-8 text-neutral-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">需要下载 AI 模型</h2>
          <p className="text-neutral-600 mb-6">
            背景去除功能需要下载 RMBG-1.4 模型（约 176MB），模型将保存在本地，仅需下载一次。
          </p>
          {isDownloading ? (
            <div className="space-y-3">
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-neutral-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-sm text-neutral-500">下载中... {Math.round(downloadProgress)}%</p>
            </div>
          ) : (
            <button
              onClick={handleDownloadModel}
              className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 transition-colors"
            >
              开始下载模型
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-8">图片背景去除</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧: 上传和文件列表 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 上传区域 */}
            <div
              onClick={handleSelectFiles}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-neutral-900 bg-neutral-100'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white'
              }`}
            >
              <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 mb-2">点击或拖拽图片到此处</p>
              <p className="text-sm text-neutral-400">支持 PNG, JPG, WebP 格式</p>
            </div>

            {/* 文件列表 */}
            {tasks.length > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                  <span className="font-medium text-neutral-900">{tasks.length} 个文件</span>
                  <button
                    onClick={clearTasks}
                    className="text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    清空列表
                  </button>
                </div>
                <div className="divide-y divide-neutral-100 max-h-96 overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task.id)}
                      className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                        selectedTaskId === task.id ? 'bg-neutral-50' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{task.filename}</p>
                        <p className="text-sm text-neutral-500">
                          {task.width} × {task.height} · {(task.originalSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {task.status === 'pending' && (
                          <span className="text-sm text-neutral-400">待处理</span>
                        )}
                        {task.status === 'processing' && (
                          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                        )}
                        {task.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {task.status === 'failed' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                        className="p-1 text-neutral-400 hover:text-neutral-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧: 设置和操作 */}
          <div className="space-y-6">
            {/* 输出设置 */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">输出设置</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">输出格式</label>
                  <div className="flex gap-2">
                    {(['png', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOutputFormat(fmt)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          outputFormat === fmt
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    边缘羽化: {feather}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={feather}
                    onChange={(e) => setFeather(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">背景颜色</label>
                  <div className="flex gap-2">
                    {['transparent', '#ffffff', '#000000'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setBackgroundColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-colors ${
                          backgroundColor === color ? 'border-neutral-900' : 'border-neutral-200'
                        }`}
                        style={{
                          background: color === 'transparent'
                            ? 'repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 50% / 10px 10px'
                            : color,
                        }}
                        title={color === 'transparent' ? '透明' : color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 预览 */}
            {selectedTask?.status === 'completed' && selectedTask.result && (
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">处理结果</h3>
                <div className="text-sm text-neutral-600 space-y-1">
                  <p>处理耗时: {selectedTask.result.processingTimeMs}ms</p>
                  <p>输出大小: {(selectedTask.result.processedSize / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => invoke('shell_open', { path: selectedTask.result!.outputPath })}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  打开文件位置
                </button>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <button
                onClick={handleRemoveBackgrounds}
                disabled={isBatchProcessing || pendingCount === 0}
                className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 transition-colors"
              >
                {isBatchProcessing
                  ? `处理中... ${Math.round(batchProgress)}%`
                  : `开始去背景 (${pendingCount} 个文件)`}
              </button>

              {isBatchProcessing && (
                <div className="mt-4">
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-neutral-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-10 flex items-center justify-center pointer-events-none z-50">
          <p className="text-2xl font-semibold text-neutral-900">松开以导入图片</p>
        </div>
      )}
    </div>
  );
}
