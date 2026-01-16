/**
 * 标注图层组件
 * 渲染箭头、圆形、矩形等标注
 */

import { useRef, useEffect } from 'react';
import type { Annotation } from '../../../types';

interface AnnotationLayerProps {
  annotations: Annotation[];
  scale: number;
  imageWidth?: number;
  imageHeight?: number;
}

export function AnnotationLayer({ annotations, scale, imageWidth = 1920, imageHeight = 1080 }: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制所有标注
    annotations.forEach((annotation) => {
      ctx.save();

      // 设置样式
      ctx.strokeStyle = annotation.style.color;
      ctx.lineWidth = annotation.style.strokeWidth;
      ctx.globalAlpha = annotation.style.opacity;

      if (annotation.style.fillColor) {
        ctx.fillStyle = annotation.style.fillColor;
      }

      // 根据类型绘制
      switch (annotation.type) {
        case 'arrow':
          drawArrow(ctx, annotation);
          break;
        case 'circle':
          drawCircle(ctx, annotation);
          break;
        case 'rectangle':
          drawRectangle(ctx, annotation);
          break;
      }

      ctx.restore();
    });
  }, [annotations, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={imageWidth}
      height={imageHeight}
      className="absolute inset-0 pointer-events-auto"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
    />
  );
}

/**
 * 绘制箭头
 */
function drawArrow(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { startPoint, endPoint, arrowHeadSize = 15 } = annotation.data;
  if (!startPoint || !endPoint) return;

  // 绘制箭头线
  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.stroke();

  // 计算箭头头部
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const headAngle = Math.PI / 6; // 30度

  // 绘制箭头头部
  ctx.beginPath();
  ctx.moveTo(endPoint.x, endPoint.y);
  ctx.lineTo(
    endPoint.x - arrowHeadSize * Math.cos(angle - headAngle),
    endPoint.y - arrowHeadSize * Math.sin(angle - headAngle)
  );
  ctx.moveTo(endPoint.x, endPoint.y);
  ctx.lineTo(
    endPoint.x - arrowHeadSize * Math.cos(angle + headAngle),
    endPoint.y - arrowHeadSize * Math.sin(angle + headAngle)
  );
  ctx.stroke();
}

/**
 * 绘制圆形
 */
function drawCircle(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { bounds } = annotation;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radius = Math.min(bounds.width, bounds.height) / 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

  if (annotation.style.fillColor) {
    ctx.fill();
  }
  ctx.stroke();
}

/**
 * 绘制矩形
 */
function drawRectangle(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { bounds } = annotation;

  if (annotation.style.fillColor) {
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
}
