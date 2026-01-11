/**
 * 变换参数面板
 * 包含裁剪、旋转、翻转等功能的参数控制
 */

import { invoke } from '@tauri-apps/api/core';
import { useImageStore } from '../../store/imageStore';
import type { CropParams, RotateParams, FlipParams } from '../../types';

export function TransformParams() {
  const {
    currentImage,
    crop,
    rotate,
    flip,
    resetTransforms,
  } = useImageStore();

  const hasTransforms = crop || rotate || flip;

  // 裁剪功能
  const handleCrop = async () => {
    if (!currentImage) return;

    const params: CropParams = {
      x: 0,
      y: 0,
      width: currentImage.width,
      height: currentImage.height,
    };

    try {
      const outputPath = await invoke('crop_image_command', {
        inputPath: currentImage.path,
        params,
      });
      console.log('裁剪完成:', outputPath);
    } catch (err) {
      console.error('裁剪失败:', err);
    }
  };

  // 旋转功能
  const handleRotate = async (angle: number) => {
    if (!currentImage) return;

    const params: RotateParams = { angle };

    try {
      const outputPath = await invoke('rotate_image_command', {
        inputPath: currentImage.path,
        params,
      });
      console.log('旋转完成:', outputPath);
    } catch (err) {
      console.error('旋转失败:', err);
    }
  };

  // 翻转功能
  const handleFlip = async (horizontal: boolean, vertical: boolean) => {
    if (!currentImage) return;

    const params: FlipParams = { horizontal, vertical };

    try {
      const outputPath = await invoke('flip_image_command', {
        inputPath: currentImage.path,
        params,
      });
      console.log('翻转完成:', outputPath);
    } catch (err) {
      console.error('翻转失败:', err);
    }
  };

  if (!currentImage) {
    return (
      <div className="p-4 border-b border-neutral-700">
        <h3 className="text-lg font-semibold mb-3">变换参数</h3>
        <p className="text-sm text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">变换参数</h3>
        {hasTransforms && (
          <button
            onClick={resetTransforms}
            className="text-xs px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
          >
            重置
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* 裁剪 */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-neutral-300">裁剪</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-neutral-400">宽度</label>
                <input
                  type="number"
                  defaultValue={currentImage.width}
                  className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">高度</label>
                <input
                  type="number"
                  defaultValue={currentImage.height}
                  className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleCrop}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
            >
              应用裁剪
            </button>
          </div>
        </div>

        {/* 旋转 */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-neutral-300">旋转</h4>
          <div className="grid grid-cols-4 gap-2">
            {[0, 90, 180, 270].map((angle) => (
              <button
                key={angle}
                onClick={() => handleRotate(angle)}
                className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>

        {/* 翻转 */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-neutral-300">翻转</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleFlip(true, false)}
              className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
            >
              水平翻转
            </button>
            <button
              onClick={() => handleFlip(false, true)}
              className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
            >
              垂直翻转
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
