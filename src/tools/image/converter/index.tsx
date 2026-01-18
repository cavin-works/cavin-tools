import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useImageConverterStore } from './store/imageConverterStore';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { FileList } from './components/FileList';
import { ConvertSettings } from './components/ConvertSettings';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';
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

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'] }],
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        handleFilesSelected(paths);
      }
    } catch (error) {
      console.log('文件选择被取消');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          图片格式转换
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧: 上传和文件列表 */}
          <div className="lg:col-span-2 space-y-6">
            <div onClick={handleSelectFiles}>
              <FileUploadZone
                title="拖拽图片到此处"
                description="或点击按钮选择文件"
                formats="支持 PNG, JPG, WebP, GIF, BMP, TIFF 格式"
                icon={<ImageIcon className="w-6 h-6 text-primary" />}
                disabled={isBatchProcessing}
                showButton={false}
              />
            </div>

            <FileList />
          </div>

          {/* 右侧: 转换设置和操作按钮 */}
          <div className="space-y-6">
            <ConvertSettings />

            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleConvert}
                  disabled={isBatchProcessing || pendingCount === 0}
                  className="w-full"
                  size="lg"
                >
                  {isBatchProcessing
                    ? `转换中... ${Math.round(useImageConverterStore.getState().batchProgress)}%`
                    : `开始转换 (${pendingCount} 个文件)`}
                </Button>

                {isBatchProcessing && (
                  <div className="mt-4">
                    <Progress value={useImageConverterStore.getState().batchProgress} className="h-2" />
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
