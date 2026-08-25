import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useImageCompressorStore } from './store/imageCompressorStore';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { FileList } from './components/FileList';
import { CompressSettings } from './components/CompressSettings';
import { showError, showSuccess, showWarning } from '@/tools/video/editor/utils/errorHandling';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';
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
    const dragEnterUnlisten = listen('tauri://drag-enter', () => {
      setIsDragging(true);
    });

    const dragLeaveUnlisten = listen('tauri://drag-leave', () => {
      setIsDragging(false);
    });

    const dragDropUnlisten = listen('tauri://drag-drop', (event: any) => {
      const payload = event.payload as { paths: string[] };
      setIsDragging(false);
      if (payload.paths && payload.paths.length > 0) {
        handleFilesSelected(payload.paths);
      }
    });

    return () => {
      dragEnterUnlisten.then((fn) => fn()).catch(console.error);
      dragLeaveUnlisten.then((fn) => fn()).catch(console.error);
      dragDropUnlisten.then((fn) => fn()).catch(console.error);
    };
  }, []);

  // 监听批量压缩进度
  useEffect(() => {
    const unlisten = listen<BatchProgressEvent>('image-batch-progress', (event) => {
      setBatchProgress(event.payload.percentage);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(console.error);
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
      if (successCount < allResults.length) {
        showWarning(`压缩完成: 成功 ${successCount}/共 ${allResults.length},失败 ${allResults.length - successCount}`);
      } else {
        showSuccess(`压缩完成: ${successCount}/${allResults.length} 个文件`);
      }
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

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        handleFilesSelected(paths);
      }
    } catch (error) {
      // 取消选择时 open 返回 null（上方已处理），走到这里的是真实错误
      showError('打开文件选择框失败', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          图片压缩优化
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧: 上传和文件列表 */}
          <div className="lg:col-span-2 space-y-6">
            <div onClick={handleSelectFiles}>
              <FileUploadZone
                title="拖拽图片到此处"
                description="或点击按钮选择文件"
                formats="支持 PNG, JPG, WebP, GIF 格式"
                icon={<ImageIcon className="w-6 h-6 text-primary" />}
                disabled={isBatchProcessing}
                showButton={false}
              />
            </div>

            <FileList />
          </div>

          {/* 右侧: 压缩设置和操作按钮 */}
          <div className="space-y-6">
            <CompressSettings />

            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleCompress}
                  disabled={isBatchProcessing || pendingCount === 0}
                  className="w-full"
                  size="lg"
                >
                  {isBatchProcessing
                    ? `压缩中... ${Math.round(useImageCompressorStore.getState().batchProgress)}%`
                    : `开始压缩 (${pendingCount} 个文件)`}
                </Button>

                {isBatchProcessing && (
                  <div className="mt-4">
                    <Progress value={useImageCompressorStore.getState().batchProgress} className="h-2" />
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
          <p className="text-2xl font-semibold text-foreground">
            松开以导入图片
          </p>
        </div>
      )}
    </div>
  );
}
