/**
 * 文字图层组件
 * 渲染文字标注
 */

import type { Annotation } from '../../../types';

interface TextLayerProps {
  annotations: Annotation[];
  scale: number;
}

export function TextLayer({ annotations, scale }: TextLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {annotations.map((annotation) => {
        const { text, fontSize = 16, fontFamily = 'Arial', fontWeight = 'normal' } = annotation.data;
        const { bounds, style } = annotation;

        if (!text) return null;

        return (
          <div
            key={annotation.id}
            className="absolute whitespace-pre-wrap pointer-events-auto"
            style={{
              left: `${bounds.x}px`,
              top: `${bounds.y}px`,
              width: bounds.width > 0 ? `${bounds.width}px` : 'auto',
              color: style.color,
              fontSize: `${fontSize}px`,
              fontFamily,
              fontWeight,
              opacity: style.opacity,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}
