import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useImageCompressorStore } from './store/imageCompressorStore';
import { FileUploadZone } from './components/FileUploadZone';
import { FileList } from './components/FileList';
import { CompressSettings } from './components/CompressSettings';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import { themeColors } from '@/core/theme/themeConfig';
import type { ImageInfo, CompressTask, BatchProgressEvent } from './types';

// 复用 ConvertResult 类型作为 CompressResult
interface ConvertResult {
  outputPath: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
}

export function ImageCompressor() {
  const {
    tasks,
    addTask,
    updateTask,
    getCompressParams,
    isBatchProcessing,
    setBatchProcessing,
    setBatchProgress,
  } = useImageCompressorStore();

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

  // 监听批量压缩进度
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

        const task: CompressTask = {
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

  const handleCompress = useCallback(async () => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');

    if (pendingTasks.length === 0) {
      showError('没有待压缩的文件');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress(0);

    try {
      // 按格式分组（因为后端 batch_convert_images 期望所有文件使用相同参数）
      const tasksByFormat = pendingTasks.reduce((acc, task) => {
        if (!acc[task.format]) {
          acc[task.format] = [];
        }
        acc[task.format].push(task);
        return acc;
      }, {} as Record<string, CompressTask[]>);

      // 标记所有任务为处理中
      pendingTasks.forEach((task) => {
        updateTask(task.id, { status: 'processing', progress: 0 });
      });

      let totalProcessed = 0;
      const allResults: Array<{ task: CompressTask; result: { Ok?: ConvertResult; Err?: string } }> = [];

      // 对每组格式分别调用批量压缩
      for (const [format, formatTasks] of Object.entries(tasksByFormat)) {
        const inputPaths = formatTasks.map((t) => t.inputPath);
        const params = getCompressParams(format);

        try {
          const results = await invoke<Array<{ Ok?: ConvertResult; Err?: string }>>(
            'batch_convert_images',
            { inputPaths, params }
          );

          // 记录结果
          formatTasks.forEach((task, index) => {
            allResults.push({ task, result: results[index] });
          });

          totalProcessed += formatTasks.length;
          setBatchProgress((totalProcessed / pendingTasks.length) * 100);
        } catch (error) {
          // 如果某一组失败，标记该组所有任务为失败
          formatTasks.forEach((task) => {
            allResults.push({
              task,
              result: { Err: String(error) }
            });
          });
        }
      }

      // 更新所有任务的状态
      allResults.forEach(({ task, result }) => {
        if ('Ok' in result && result.Ok) {
          updateTask(task.id, {
            status: 'completed',
            progress: 100,
            result: {
              outputPath: result.Ok.outputPath,
              originalSize: result.Ok.originalSize,
              compressedSize: result.Ok.convertedSize,
              compressionRatio: result.Ok.compressionRatio,
            },
          });
        } else if ('Err' in result) {
          updateTask(task.id, {
            status: 'failed',
            progress: 0,
            error: result.Err,
          });
        }
      });

      const successCount = allResults.filter((r) => 'Ok' in r.result).length;
      showSuccess(`压缩完成: ${successCount}/${allResults.length} 个文件`);
    } catch (error) {
      showError('批量压缩失败', error);

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
  }, [tasks, getCompressParams, updateTask, setBatchProcessing, setBatchProgress]);

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">
          图片压缩优化
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

          {/* 右侧: 压缩设置和操作按钮 */}
          <div className="space-y-6">
            <CompressSettings />

            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <button
                onClick={handleCompress}
                disabled={isBatchProcessing || pendingCount === 0}
                className={themeColors.button.primary}
              >
                {isBatchProcessing
                  ? `压缩中... ${Math.round(useImageCompressorStore.getState().batchProgress)}%`
                  : `开始压缩 (${pendingCount} 个文件)`}
              </button>

              {isBatchProcessing && (
                <div className="mt-4">
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className={themeColors.primary.bg + " h-2 rounded-full transition-all duration-300"}
                      style={{ width: `${useImageCompressorStore.getState().batchProgress}%` }}
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
