import { Image as ImageIcon } from 'lucide-react';
import { useImageCollageStore } from '../store/collageStore';

/**
 * 拼贴预览画布：显示后端合成的 base64 预览图，
 * 加载中显示角标，未添加图片时显示空态提示。
 */
export function CollageCanvas() {
  const imageCount = useImageCollageStore((s) => s.images.length);
  const previewUrl = useImageCollageStore((s) => s.previewUrl);
  const previewLoading = useImageCollageStore((s) => s.previewLoading);

  return (
    <div className="relative flex items-center justify-center min-h-[420px] p-4 bg-muted/30 border rounded-lg">
      {previewLoading && (
        <span className="absolute top-2 right-2 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
          预览更新中...
        </span>
      )}

      {imageCount === 0 ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-10 h-10 opacity-40" />
          <p className="text-sm">请先添加图片</p>
        </div>
      ) : previewUrl ? (
        <img
          key={previewUrl}
          src={previewUrl}
          alt="拼贴预览"
          draggable={false}
          className="max-h-[65vh] max-w-full object-contain select-none"
        />
      ) : (
        <span className="text-sm text-muted-foreground">正在生成预览...</span>
      )}
    </div>
  );
}
