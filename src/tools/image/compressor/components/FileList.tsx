import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useImageCompressorStore } from '../store/imageCompressorStore';
import { CompressTask } from '../types';
import { formatFileSize } from '../utils/formatUtils';

function TaskItem({ task }: { task: CompressTask }) {
  const { removeTask } = useImageCompressorStore();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');

  // 将文件路径转换为可显示的 URL
  useEffect(() => {
    if (task.inputPath) {
      const url = convertFileSrc(task.inputPath);
      setThumbnailUrl(url);
    }
  }, [task.inputPath]);

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'completed':
        return task.result ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">
              {formatFileSize(task.result.originalSize)} → {formatFileSize(task.result.compressedSize)}
            </span>
            {task.result.compressionRatio > 0 && (
              <span className="text-xs font-medium text-green-600">
                ↓ {task.result.compressionRatio.toFixed(1)}%
              </span>
            )}
          </div>
        ) : '压缩完成';
      case 'failed':
        return <span className="text-xs text-red-600">{task.error || '压缩失败'}</span>;
      case 'processing':
        return <span className="text-xs text-blue-600">压缩中... {task.progress.toFixed(0)}%</span>;
      default:
        return <span className="text-xs text-neutral-500">等待中</span>;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors">
      {/* 图片预览 */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={task.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时隐藏
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
            预览
          </div>
        )}
      </div>

      {/* 状态图标 */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">
          {task.filename}
        </p>
        <p className="text-xs text-neutral-500">
          {task.format.toUpperCase()} • {formatFileSize(task.originalSize)}
        </p>
        <div className="mt-1">
          {getStatusText()}
        </div>
      </div>

      <button
        onClick={() => removeTask(task.id)}
        className="p-1.5 hover:bg-neutral-100 rounded transition-colors flex-shrink-0"
        title="移除"
      >
        <X className="w-4 h-4 text-neutral-600" />
      </button>
    </div>
  );
}

export function FileList() {
  const { tasks, clearTasks } = useImageCompressorStore();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          文件列表 ({tasks.length})
        </h3>
        <button
          onClick={clearTasks}
          className="text-sm text-neutral-600 hover:text-neutral-900"
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
