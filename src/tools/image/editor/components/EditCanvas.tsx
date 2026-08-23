import { useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useImageEditorStore } from '../store/imageEditorStore';
import { AnnotationLayer } from './AnnotationLayer';
import { CropOverlay } from './CropOverlay';

/**
 * 预览画布：显示后端完整管线（旋转/翻转/滤镜/裁剪）输出的 base64 预览图。
 * 预览未就绪时回退显示原图；裁剪模式下叠加 CropOverlay（预览不含 crop）；
 * 标注模式下叠加 AnnotationLayer（预览不含标注，已有标注由图层绘制）。
 */
export function EditCanvas() {
  const inputPath = useImageEditorStore((s) => s.inputPath);
  const imageInfo = useImageEditorStore((s) => s.imageInfo);
  const rotation = useImageEditorStore((s) => s.params.rotation);
  const flipH = useImageEditorStore((s) => s.params.flipH);
  const flipV = useImageEditorStore((s) => s.params.flipV);
  const previewUrl = useImageEditorStore((s) => s.previewUrl);
  const previewLoading = useImageEditorStore((s) => s.previewLoading);
  const cropEnabled = useImageEditorStore((s) => s.cropEnabled);
  const annotationTool = useImageEditorStore((s) => s.annotationTool);

  const imgRef = useRef<HTMLImageElement>(null);
  // 当前已完成加载的预览 URL（保证 overlay 在图片布局稳定后才挂载）
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  if (!inputPath) return null;

  // 旋转 90/270 时预览宽高互换
  const originalWidth = rotation % 180 !== 0 ? imageInfo?.height : imageInfo?.width;

  return (
    <div className="relative flex items-center justify-center min-h-[420px] p-4 bg-muted/30 border rounded-lg">
      {previewLoading && (
        <span className="absolute top-2 right-2 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
          预览更新中...
        </span>
      )}

      {previewUrl ? (
        <div className="relative inline-block leading-none overflow-hidden">
          <img
            ref={imgRef}
            key={previewUrl}
            src={previewUrl}
            alt="编辑预览"
            draggable={false}
            className="max-h-[65vh] max-w-full object-contain select-none"
            onLoad={() => setLoadedUrl(previewUrl)}
          />
          {cropEnabled && loadedUrl === previewUrl && originalWidth != null && (
            // 旋转/翻转改变坐标系，overlay 需重挂载以重置裁剪框
            <CropOverlay
              key={`${rotation}-${flipH}-${flipV}`}
              imgRef={imgRef}
              originalWidth={originalWidth}
            />
          )}
          {annotationTool && loadedUrl === previewUrl && originalWidth != null && (
            <AnnotationLayer
              key={`ann-${rotation}-${flipH}-${flipV}`}
              imgRef={imgRef}
              originalWidth={originalWidth}
            />
          )}
        </div>
      ) : (
        <img
          src={convertFileSrc(inputPath)}
          alt="原图"
          className="max-h-[65vh] max-w-full object-contain select-none"
        />
      )}
    </div>
  );
}
