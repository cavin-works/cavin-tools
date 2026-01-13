/**
 * 图片信息条组件
 * 显示当前图片的基本信息
 */

import type { ImageInfo } from '../types';

interface ImageInfoBarProps {
  image: ImageInfo;
}

export function ImageInfoBar({ image }: ImageInfoBarProps) {
  return (
    <div className="flex-shrink-0 px-4 py-3 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-white">{image.filename}</span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-400">{image.width} x {image.height}</span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-500">{image.format.toUpperCase()}</span>
      </div>
      <div className="text-xs text-neutral-500">
        {Math.round(image.size / 1024)} KB
      </div>
    </div>
  );
}
