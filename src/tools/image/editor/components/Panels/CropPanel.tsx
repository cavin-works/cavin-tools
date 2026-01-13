/**
 * 裁剪面板
 * 提供图片裁剪参数控制
 */

import { useState } from 'react';
import { useImageQueue } from '../../contexts/ImageOperationQueueContext';
import { useImageStore } from '../../store/imageStore';
import type { CropParams } from '../../types';
import { Plus } from 'lucide-react';

export function CropPanel() {
  const { currentImage } = useImageStore();
  const { addToQueue } = useImageQueue();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(currentImage?.width || 0);
  const [height, setHeight] = useState(currentImage?.height || 0);

  const handleAddToQueue = () => {
    if (!currentImage) return;

    const params: CropParams = {
      x,
      y,
      width,
      height,
    };

    addToQueue({
      type: 'crop',
      name: '裁剪',
      params,
    });
  };

  if (!currentImage) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">裁剪</h3>
        <p className="text-xs text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">裁剪图片</h3>

      <div className="space-y-3">
        {/* X 坐标 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">X 坐标 (px)</label>
          <input
            type="number"
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
            min="0"
            max={currentImage.width - 1}
          />
        </div>

        {/* Y 坐标 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Y 坐标 (px)</label>
          <input
            type="number"
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
            min="0"
            max={currentImage.height - 1}
          />
        </div>

        {/* 宽度 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">宽度 (px)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
            min="1"
            max={currentImage.width - x}
          />
        </div>

        {/* 高度 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">高度 (px)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
            min="1"
            max={currentImage.height - y}
          />
        </div>

        {/* 图片尺寸提示 */}
        <div className="text-xs text-neutral-500 bg-neutral-700/50 rounded px-2 py-1.5">
          原始尺寸: {currentImage.width} x {currentImage.height}
        </div>

        {/* 添加到队列按钮 */}
        <button
          onClick={handleAddToQueue}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加到队列
        </button>
      </div>
    </div>
  );
}
