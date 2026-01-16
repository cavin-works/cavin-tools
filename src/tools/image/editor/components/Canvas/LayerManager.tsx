/**
 * 图层管理器
 * 负责管理和渲染所有图层
 */

import { useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { ImageLayer } from './layers/ImageLayer';
import { AnnotationLayer } from './layers/AnnotationLayer';
import { DrawingLayer } from './layers/DrawingLayer';
import { TextLayer } from './layers/TextLayer';
import { MosaicLayer } from './layers/MosaicLayer';

interface LayerManagerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  scale: number;
}

export function LayerManager({ imageUrl, imageWidth, imageHeight, scale }: LayerManagerProps) {
  const { annotations } = useEditorStore();

  // 使用 useMemo 避免每次渲染都创建新数组
  const shapeAnnotations = useMemo(
    () => annotations.filter((a) => ['arrow', 'circle', 'rectangle'].includes(a.type)),
    [annotations]
  );

  const textAnnotations = useMemo(
    () => annotations.filter((a) => a.type === 'text'),
    [annotations]
  );

  const mosaicAnnotations = useMemo(
    () => annotations.filter((a) => a.type === 'mosaic'),
    [annotations]
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 图片图层（最底层） */}
      <ImageLayer url={imageUrl} width={imageWidth} height={imageHeight} scale={scale} />

      {/* 标注图层 */}
      <AnnotationLayer
        annotations={shapeAnnotations}
        scale={scale}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
      />

      {/* 绘制图层 */}
      <DrawingLayer
        scale={scale}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
      />

      {/* 文字图层 */}
      <TextLayer annotations={textAnnotations} scale={scale} />

      {/* 马赛克图层 */}
      <MosaicLayer
        annotations={mosaicAnnotations}
        scale={scale}
        imageUrl={imageUrl}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
      />
    </div>
  );
}
