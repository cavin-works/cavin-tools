/**
 * 图片信息显示组件
 */

import { useImageStore } from '../../store/imageStore';

export function ImageInfo() {
  const { currentImage } = useImageStore();

  return (
    <div className="p-4 border-b border-neutral-700">
      <h3 className="text-lg font-semibold mb-3">图片信息</h3>
      {currentImage ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">文件名:</span>
            <span className="truncate max-w-[150px]" title={currentImage.filename}>
              {currentImage.filename}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">尺寸:</span>
            <span>
              {currentImage.width} x {currentImage.height}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">格式:</span>
            <span>{currentImage.format}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">大小:</span>
            <span>{(currentImage.fileSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">色彩:</span>
            <span>{currentImage.colorSpace}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">未加载图片</p>
      )}
    </div>
  );
}
