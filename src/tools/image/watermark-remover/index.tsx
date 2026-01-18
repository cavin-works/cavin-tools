import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useWatermarkRemoverStore } from './store/watermarkRemoverStore';
import { FileList } from './components/FileList';
import { PreviewPanel } from './components/PreviewPanel';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import { open } from '@tauri-apps/plugin-dialog';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';
import type { RemoveTask, RemoveResult, BatchProgressEvent } from './types';

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
      console.log('文件选择被取消');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Gemini 水印去除
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

          {/* 右侧: 预览和操作按钮 */}
          <div className="space-y-6">
            {/* 预览面板 */}
            {selectedTask && selectedTask.status === 'completed' && (
              <PreviewPanel task={selectedTask} />
            )}

            {/* 操作按钮 */}
            <Card>
              <CardHeader>
                <CardTitle>去水印说明</CardTitle>
                <CardDescription>
                  自动检测 Gemini AI 生成图片的水印位置并无损去除。使用反向 Alpha 混合算法，完全本地处理，保护您的隐私。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleRemoveWatermarks}
                  disabled={isBatchProcessing || pendingCount === 0}
                  className="w-full"
                  size="lg"
                >
                  {isBatchProcessing
                    ? `处理中... ${Math.round(useWatermarkRemoverStore.getState().batchProgress)}%`
                    : `开始去水印 (${pendingCount} 个文件)`}
                </Button>

                {isBatchProcessing && (
                  <div className="mt-4">
                    <Progress value={useWatermarkRemoverStore.getState().batchProgress} className="h-2" />
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
