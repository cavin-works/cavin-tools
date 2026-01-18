import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useImageConverterStore } from './store/imageConverterStore';
import { FileUploadZone } from './components/FileUploadZone';
import { FileList } from './components/FileList';
import { ConvertSettings } from './components/ConvertSettings';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import type { ImageInfo, ConvertTask, ConvertResult, BatchProgressEvent } from './types';

export function ImageConverter() {
  const {
    tasks,
    addTask,
    updateTask,
    getConvertParams,
    isBatchProcessing,
    setBatchProcessing,
    setBatchProgress,
    targetFormat,
  } = useImageConverterStore();

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

  // 监听批量转换进度
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupProgressListener() {
      unlisten = await listen<BatchProgressEvent>('batch-progress', (event) => {
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

        const task: ConvertTask = {
          id: `${Date.now()}-${Math.random()}`,
          inputPath: path,
          filename: info.filename,
          originalFormat: info.format.toLowerCase(),
          targetFormat,
          status: 'pending',
          progress: 0,
        };

        addTask(task);
      } catch (error) {
        showError(`无法加载图片: ${path}`, error);
      }
    }
  }, [addTask, targetFormat]);

  const handleConvert = useCallback(async () => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');

    if (pendingTasks.length === 0) {
      showError('没有待转换的文件');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress(0);

    try {
      const params = getConvertParams();
      const inputPaths = pendingTasks.map((t) => t.inputPath);

      // 标记所有任务为处理中
      pendingTasks.forEach((task) => {
        updateTask(task.id, { status: 'processing', progress: 0 });
      });

      const results = await invoke<Array<{ Ok?: ConvertResult; Err?: string }>>(
        'batch_convert_images',
        { inputPaths, params }
      );

      // 更新每个任务的状态
      results.forEach((result, index) => {
        const task = pendingTasks[index];
        if (!task) return;

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
      showSuccess(`转换完成: ${successCount}/${results.length} 个文件`);
    } catch (error) {
      showError('批量转换失败', error);

      // 标记所有处理中的任务为失败
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
  }, [tasks, getConvertParams, updateTask, setBatchProcessing, setBatchProgress]);

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">
          图片格式转换
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

          {/* 右侧: 转换设置和操作按钮 */}
          <div className="space-y-6">
            <ConvertSettings />

            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <button
                onClick={handleConvert}
                disabled={isBatchProcessing || pendingCount === 0}
                className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400 transition-colors"
              >
                {isBatchProcessing
                  ? `转换中... ${Math.round(useImageConverterStore.getState().batchProgress)}%`
                  : `开始转换 (${pendingCount} 个文件)`}
              </button>

              {isBatchProcessing && (
                <div className="mt-4">
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className="bg-neutral-900 dark:bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${useImageConverterStore.getState().batchProgress}%` }}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none z-50">
          <p className="text-2xl font-semibold text-white">
            松开以导入图片
          </p>
        </div>
      )}
    </div>
  );
}
