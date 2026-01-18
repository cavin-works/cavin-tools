import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Download, Trash2, CheckCircle, XCircle, Loader2, ImageIcon, FolderOpen, Image as ImageIconLucide } from 'lucide-react';
import { useBackgroundRemoverStore } from './store/backgroundRemoverStore';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import type { BackgroundRemoveTask, RemoveBackgroundResult, BatchProgressEvent, ModelInfo, DownloadProgress } from './types';

// 复用 ImageInfo 类型（与 Rust 返回的 snake_case 匹配）
interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  file_size: number;
  color_type: string;
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
          originalSize: info.file_size,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">需要下载 AI 模型</h2>
            <p className="text-muted-foreground mb-6">
              背景去除功能需要下载 RMBG-1.4 模型（约 176MB），模型将保存在本地，仅需下载一次。
            </p>
            {isDownloading ? (
              <div className="space-y-3">
                <Progress value={downloadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">下载中... {Math.round(downloadProgress)}%</p>
              </div>
            ) : (
              <Button onClick={handleDownloadModel} className="w-full">
                开始下载模型
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">图片背景去除</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧: 上传和文件列表 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 上传区域 */}
            <div onClick={handleSelectFiles}>
              <FileUploadZone
                title="拖拽图片到此处"
                description="或点击按钮选择文件"
                formats="支持 PNG, JPG, WebP 格式"
                icon={<ImageIconLucide className="w-6 h-6 text-primary" />}
                disabled={isBatchProcessing}
                showButton={false}
              />
            </div>

            {/* 文件列表 */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-base">{tasks.length} 个文件</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearTasks}>
                    清空列表
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task.id)}
                        className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                          selectedTaskId === task.id
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={convertFileSrc(task.inputPath)}
                            alt={task.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <ImageIcon className="w-5 h-5 text-muted-foreground hidden" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{task.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.width} × {task.height} · {(task.originalSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {task.status === 'pending' && (
                            <span className="text-sm text-muted-foreground">待处理</span>
                          )}
                          {task.status === 'processing' && (
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                          )}
                          {task.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                          {task.status === 'failed' && (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <Button
                          onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧: 设置和操作 */}
          <div className="space-y-6">
            {/* 输出设置 */}
            <Card>
              <CardHeader>
                <CardTitle>输出设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">输出格式</Label>
                  <div className="flex gap-2">
                    {(['png', 'webp'] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        onClick={() => setOutputFormat(fmt)}
                        variant={outputFormat === fmt ? 'default' : 'secondary'}
                        className="flex-1"
                      >
                        {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">
                    边缘羽化: {feather}
                  </Label>
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[feather]}
                    onValueChange={(value) => setFeather(value[0])}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">背景颜色</Label>
                  <div className="flex gap-2">
                    {['transparent', '#ffffff', '#000000'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setBackgroundColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-colors ${
                          backgroundColor === color
                            ? 'border-primary'
                            : 'border-border'
                        }`}
                        style={{
                          background: color === 'transparent'
                            ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--muted-foreground) / 0.2) 0% 50%) 50% / 10px 10px'
                            : color,
                        }}
                        title={color === 'transparent' ? '透明' : color}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 预览 */}
            {selectedTask?.status === 'completed' && selectedTask.result && (
              <Card>
                <CardHeader>
                  <CardTitle>处理结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>处理耗时: {selectedTask.result.processingTimeMs}ms</p>
                    <p>输出大小: {(selectedTask.result.processedSize / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    onClick={() => invoke('shell_open', { path: selectedTask.result!.outputPath })}
                    variant="outline"
                    className="mt-4 w-full"
                  >
                    <FolderOpen className="w-4 h-4" />
                    打开文件位置
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleRemoveBackgrounds}
                  disabled={isBatchProcessing || pendingCount === 0}
                  className="w-full"
                >
                  {isBatchProcessing
                    ? `处理中... ${Math.round(batchProgress)}%`
                    : `开始去背景 (${pendingCount} 个文件)`}
                </Button>

                {isBatchProcessing && (
                  <div className="mt-4">
                    <Progress value={batchProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none z-50">
          <p className="text-2xl font-semibold text-foreground">松开以导入图片</p>
        </div>
      )}
    </div>
  );
}
