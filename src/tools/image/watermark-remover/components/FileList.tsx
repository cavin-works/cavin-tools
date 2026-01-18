import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useWatermarkRemoverStore } from '../store/watermarkRemoverStore';
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

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'completed':
        return task.result ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              水印尺寸: {task.result.watermarkInfo?.watermarkSize}×{task.result.watermarkInfo?.watermarkSize}
            </span>
            <span className="text-xs font-medium text-green-500">
              ✓ 已去除
            </span>
          </div>
        ) : '处理完成';
      case 'failed':
        return <span className="text-xs text-red-500">{task.error || '处理失败'}</span>;
      case 'processing':
        return <span className="text-xs text-blue-400">处理中...</span>;
      default:
        return <span className="text-xs text-neutral-500">等待中</span>;
    }
  };

  const handleClick = () => {
    if (task.status === 'completed') {
      setSelectedTask(isSelected ? null : task.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 border rounded-lg transition-colors cursor-pointer ${
        isSelected
          ? 'border-neutral-900 dark:border-white ring-1 ring-neutral-900 dark:ring-white'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
      }`}
    >
      {/* 图片预览 */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={task.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
            预览
          </div>
        )}
      </div>

      {/* 状态图标 */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {task.filename}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {task.format.toUpperCase()} • {formatFileSize(task.originalSize)} • {task.width}×{task.height}
        </p>
        <div className="mt-1">
          {getStatusText()}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          removeTask(task.id);
        }}
        className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors flex-shrink-0"
        title="移除"
      >
        <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
      </button>
    </div>
  );
}

export function FileList() {
  const { tasks, clearTasks } = useWatermarkRemoverStore();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          文件列表 ({tasks.length})
        </h3>
        <button
          onClick={clearTasks}
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          清空列表
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
