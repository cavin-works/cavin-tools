/**
 * 图片图层组件
 * 渲染基础图片
 */

interface ImageLayerProps {
  url: string;
  width: number;
  height: number;
  scale: number;
}

export function ImageLayer({ url, width, height, scale }: ImageLayerProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src={url}
        alt="编辑图片"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="pointer-events-none"
      />
    </div>
  );
}
