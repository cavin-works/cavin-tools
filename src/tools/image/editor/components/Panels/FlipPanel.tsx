/**
 * 翻转面板
 * 提供图片翻转参数控制
 */

import { useState } from 'react';
import { useImageQueue } from '../../contexts/ImageOperationQueueContext';
import { useImageStore } from '../../store/imageStore';
import type { FlipParams } from '../../types';
import { Plus, FlipHorizontal, FlipVertical } from 'lucide-react';

export function FlipPanel() {
  const { currentImage } = useImageStore();
  const { addToQueue } = useImageQueue();
  const [horizontal, setHorizontal] = useState(false);
  const [vertical, setVertical] = useState(false);

  const handleAddToQueue = () => {
    if (!currentImage || (!horizontal && !vertical)) return;

    const params: FlipParams = {
      horizontal,
      vertical,
    };

    const name = horizontal && vertical
      ? '水平+垂直翻转'
      : horizontal
      ? '水平翻转'
      : '垂直翻转';

    addToQueue({
      type: 'flip',
      name,
      params,
    });
  };

  if (!currentImage) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">翻转</h3>
        <p className="text-xs text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  const canAddToQueue = horizontal || vertical;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">翻转图片</h3>

      <div className="space-y-3">
        {/* 水平翻转 */}
        <button
          onClick={() => setHorizontal(!horizontal)}
          className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            horizontal
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
        >
          <FlipHorizontal className="w-4 h-4" />
          水平翻转
        </button>

        {/* 垂直翻转 */}
        <button
          onClick={() => setVertical(!vertical)}
          className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            vertical
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
        >
          <FlipVertical className="w-4 h-4" />
          垂直翻转
        </button>

        {/* 当前选择提示 */}
        {(horizontal || vertical) && (
          <div className="text-xs text-neutral-400 bg-neutral-700/50 rounded px-2 py-2 text-center">
            {horizontal && vertical && '已选择：水平 + 垂直'}
            {horizontal && !vertical && '已选择：水平翻转'}
            {!horizontal && vertical && '已选择：垂直翻转'}
          </div>
        )}

        {/* 添加到队列按钮 */}
        <button
          onClick={handleAddToQueue}
          disabled={!canAddToQueue}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加到队列
        </button>
      </div>
    </div>
  );
}
