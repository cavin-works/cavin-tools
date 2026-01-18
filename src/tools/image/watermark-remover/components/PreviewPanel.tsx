import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { RemoveTask } from '../types';

interface PreviewPanelProps {
  task: RemoveTask;
}

export function PreviewPanel({ task }: PreviewPanelProps) {
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (task.inputPath) {
      setOriginalUrl(convertFileSrc(task.inputPath));
    }
    if (task.result?.outputPath) {
      // 添加时间戳防止缓存
      setProcessedUrl(convertFileSrc(task.result.outputPath) + '?t=' + Date.now());
    }
  }, [task.inputPath, task.result?.outputPath]);

  if (!task.result) {
    return null;
  }

  return (
    <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        处理预览
      </h3>

      <div className="relative aspect-video bg-neutral-700 rounded-lg overflow-hidden mb-4">
        {processedUrl && (
          <img
            src={showOriginal ? originalUrl : processedUrl}
            alt={showOriginal ? '原图' : '处理后'}
            className="w-full h-full object-contain"
          />
        )}

        {/* 切换标签 */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 text-white text-xs rounded">
          {showOriginal ? '原图（有水印）' : '处理后（无水印）'}
        </div>

        {/* 对比按钮 */}
        <button
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          onTouchStart={() => setShowOriginal(true)}
          onTouchEnd={() => setShowOriginal(false)}
          className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 text-neutral-900 text-sm rounded-lg hover:bg-white transition-colors"
        >
          按住查看原图
        </button>
      </div>

      {/* 水印信息 */}
      {task.result.watermarkInfo && (
        <div className="text-sm text-neutral-400 space-y-1 bg-neutral-700 rounded-lg p-3">
          <p className="font-medium text-white mb-2">水印信息</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p>水印尺寸: <span className="font-medium text-neutral-200">{task.result.watermarkInfo.watermarkSize}×{task.result.watermarkInfo.watermarkSize}</span></p>
            <p>位置: <span className="font-medium text-neutral-200">({task.result.watermarkInfo.regionX}, {task.result.watermarkInfo.regionY})</span></p>
            <p>右边距: <span className="font-medium text-neutral-200">{task.result.watermarkInfo.marginRight}px</span></p>
            <p>下边距: <span className="font-medium text-neutral-200">{task.result.watermarkInfo.marginBottom}px</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
