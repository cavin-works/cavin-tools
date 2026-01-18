import { X, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useWatermarkRemoverStore } from '../store/watermarkRemoverStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import type { RemoveTask } from '../types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function TaskItem({ task }: { task: RemoveTask }) {
  const { removeTask, setSelectedTask, selectedTaskId } = useWatermarkRemoverStore();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');

  // 将文件路径转换为可显示的 URL
  useEffect(() => {
    if (task.inputPath) {
      const url = convertFileSrc(task.inputPath);
      setThumbnailUrl(url);
    }
  }, [task.inputPath]);

  const isSelected = selectedTaskId === task.id;

  const handleClick = () => {
    if (task.status === 'completed') {
      setSelectedTask(isSelected ? null : task.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border rounded-lg transition-colors",
        task.status === 'completed' && "cursor-pointer hover:border-primary/50",
        isSelected && "border-primary ring-2 ring-primary/20"
      )}
    >
      {/* 图片预览 */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={task.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {task.filename}
        </p>
        <p className="text-xs text-muted-foreground">
          {task.format.toUpperCase()} • {formatFileSize(task.originalSize)} • {task.width}×{task.height}
        </p>
        <div className="mt-2">
          <StatusBadge status={task.status}>
            {task.status === 'completed' && task.result ? (
              `水印 ${task.result.watermarkInfo?.watermarkSize}×${task.result.watermarkInfo?.watermarkSize}`
            ) : task.status === 'failed' && task.error ? (
              task.error
            ) : null}
          </StatusBadge>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          removeTask(task.id);
        }}
        className="flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function FileList() {
  const { tasks, clearTasks } = useWatermarkRemoverStore();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>文件列表 ({tasks.length})</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTasks}
          >
            清空列表
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
