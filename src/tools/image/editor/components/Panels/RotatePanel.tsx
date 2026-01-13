/**
 * 旋转面板
 * 提供图片旋转参数控制
 */

import { useState } from 'react';
import { useImageQueue } from '../../contexts/ImageOperationQueueContext';
import { useImageStore } from '../../store/imageStore';
import type { RotateParams } from '../../types';
import { Plus } from 'lucide-react';

export function RotatePanel() {
  const { currentImage } = useImageStore();
  const { addToQueue } = useImageQueue();
  const [angle, setAngle] = useState(90);
  const [customAngle, setCustomAngle] = useState(0);

  const handlePresetAngle = (presetAngle: number) => {
    setAngle(presetAngle);
  };

  const handleAddToQueue = () => {
    if (!currentImage) return;

    const params: RotateParams = {
      angle: customAngle > 0 ? customAngle : angle,
    };

    addToQueue({
      type: 'rotate',
      name: `旋转 ${params.angle}°`,
      params,
    });
  };

  if (!currentImage) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">旋转</h3>
        <p className="text-xs text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">旋转图片</h3>

      <div className="space-y-3">
        {/* 预设角度 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-2">预设角度</label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 90, 180, 270].map((presetAngle) => (
              <button
                key={presetAngle}
                onClick={() => handlePresetAngle(presetAngle)}
                className={`px-2 py-2 rounded text-sm font-medium transition-colors ${
                  angle === presetAngle && customAngle === 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
              >
                {presetAngle}°
              </button>
            ))}
          </div>
        </div>

        {/* 自定义角度 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">
            自定义角度: {customAngle}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={customAngle}
            onChange={(e) => {
              setCustomAngle(Number(e.target.value));
              setAngle(0);
            }}
            className="w-full"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                setCustomAngle(0);
                setAngle(90);
              }}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
            >
              重置为预设
            </button>
            <input
              type="number"
              value={customAngle}
              onChange={(e) => {
                const value = Number(e.target.value);
                setCustomAngle(value);
                if (value > 0) setAngle(0);
              }}
              className="w-20 px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-xs text-white text-center"
              min="0"
              max="360"
            />
          </div>
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
