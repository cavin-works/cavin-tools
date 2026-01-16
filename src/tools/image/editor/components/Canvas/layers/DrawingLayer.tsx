/**
 * 绘制图层组件
 * 渲染画笔绘制的路径
 */

import { useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../../store/editorStore';

interface DrawingLayerProps {
  scale: number;
  imageWidth?: number;
  imageHeight?: number;
}

export function DrawingLayer({ scale, imageWidth = 1920, imageHeight = 1080 }: DrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { annotations, currentDraw, isDrawing } = useEditorStore();

  // 使用 useMemo 避免每次渲染都创建新数组
  const drawingAnnotations = useMemo(
    () => annotations.filter((a) => a.type === 'pen' || a.type === 'highlighter'),
    [annotations]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制已完成的绘制标注
    drawingAnnotations.forEach((annotation) => {
      const points = annotation.data.points;
      if (!points || points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = annotation.style.color;
      ctx.lineWidth = annotation.style.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = annotation.style.opacity;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
      ctx.restore();
    });

    // 绘制当前正在绘制的路径
    if (isDrawing && currentDraw && currentDraw.points.length > 0) {
      const points = currentDraw.points;
      const settings = useEditorStore.getState().toolSettings;

      ctx.save();
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = settings.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = currentDraw.type === 'highlighter' ? 0.5 : settings.opacity;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [drawingAnnotations, currentDraw, isDrawing, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={imageWidth}
      height={imageHeight}
      className="absolute inset-0 pointer-events-none"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
    />
  );
}
