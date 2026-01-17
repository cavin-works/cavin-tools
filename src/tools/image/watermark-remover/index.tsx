import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useWatermarkRemoverStore } from './store/watermarkRemoverStore';
import { FileUploadZone } from './components/FileUploadZone';
import { FileList } from './components/FileList';
import { PreviewPanel } from './components/PreviewPanel';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import type { RemoveTask, RemoveResult, BatchProgressEvent } from './types';

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

export function WatermarkRemover() {
  const {
    tasks,
    addTask,
    updateTask,
    getRemoveParams,
    isBatchProcessing,
    setBatchProcessing,
    setBatchProgress,
    selectedTaskId,
  } = useWatermarkRemoverStore();

  const [isDragging, setIsDragging] = useState(false);

  // 监听文件拖拽
  useEffect(() => {
    let dragEnterUnlisten: (() => void) | undefined;
    let dragLeaveUnlisten: (() => void) | undefined;
    let dragDropUnlisten: (() => void) | undefined;

    async function setupDragListeners() {
      dragEnterUnlisten = await listen('tauri://drag-enter', () => {
        setIsDragging(true);
      });

      dragLeaveUnlisten = await listen('tauri://drag-leave', () => {
        setIsDragging(false);
      });

      dragDropUnlisten = await listen('tauri://drag-drop', (event: any) => {
        const payload = event.payload as { paths: string[] };
        setIsDragging(false);
        if (payload.paths && payload.paths.length > 0) {
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
      unlisten = await listen<BatchProgressEvent>('watermark-batch-progress', (event) => {
        setBatchProgress(event.payload.percentage);
      });
    }

    setupProgressListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [setBatchProgress]);

  const handleFilesSelected = useCallback(async (paths: string[]) => {
    for (const path of paths) {
      try {
        const info = await invoke<ImageInfo>('get_image_info', { path });

        const task: RemoveTask = {
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

  const handleRemoveWatermarks = useCallback(async () => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');

    if (pendingTasks.length === 0) {
      showError('没有待处理的文件');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress(0);

    try {
      // 标记所有任务为处理中
      pendingTasks.forEach((task) => {
        updateTask(task.id, { status: 'processing', progress: 0 });
      });

      const inputPaths = pendingTasks.map((t) => t.inputPath);
      const params = getRemoveParams();

      const results = await invoke<Array<{ Ok?: RemoveResult; Err?: string }>>(
        'batch_remove_watermarks',
        { inputPaths, params }
      );

      // 更新任务状态
      pendingTasks.forEach((task, index) => {
        const result = results[index];
        if ('Ok' in result && result.Ok) {
          updateTask(task.id, {
            status: 'completed',
            progress: 100,
            result: result.Ok,
          });
        } else if ('Err' in result) {
          updateTask(task.id, {
            status: 'failed',
            progress: 0,
            error: result.Err,
          });
        }
      });

      const successCount = results.filter((r) => 'Ok' in r).length;
      showSuccess(`处理完成: ${successCount}/${results.length} 个文件`);
    } catch (error) {
      showError('批量处理失败', error);

      pendingTasks.forEach((task) => {
        updateTask(task.id, {
          status: 'failed',
          error: String(error),
        });
      });
    } finally {
      setBatchProcessing(false);
      setBatchProgress(0);
    }
  }, [tasks, getRemoveParams, updateTask, setBatchProcessing, setBatchProgress]);

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-8">
          Gemini 水印去除
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧: 上传和文件列表 */}
          <div className="lg:col-span-2 space-y-6">
            <FileUploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isBatchProcessing}
            />

            <FileList />
          </div>

          {/* 右侧: 预览和操作按钮 */}
          <div className="space-y-6">
            {/* 预览面板 */}
            {selectedTask && selectedTask.status === 'completed' && (
              <PreviewPanel task={selectedTask} />
            )}

            {/* 操作按钮 */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  去水印说明
                </h3>
                <p className="text-sm text-neutral-600">
                  自动检测 Gemini AI 生成图片的水印位置并无损去除。使用反向 Alpha 混合算法，完全本地处理，保护您的隐私。
                </p>
              </div>

              <button
                onClick={handleRemoveWatermarks}
                disabled={isBatchProcessing || pendingCount === 0}
                className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 transition-colors"
              >
                {isBatchProcessing
                  ? `处理中... ${Math.round(useWatermarkRemoverStore.getState().batchProgress)}%`
                  : `开始去水印 (${pendingCount} 个文件)`}
              </button>

              {isBatchProcessing && (
                <div className="mt-4">
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-neutral-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${useWatermarkRemoverStore.getState().batchProgress}%` }}
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
          <p className="text-2xl font-semibold text-neutral-900">
            松开以导入图片
          </p>
        </div>
      )}
    </div>
  );
}
