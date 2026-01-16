/**
 * 马赛克图层组件
 * 渲染真实的像素化马赛克效果
 */

import { useRef, useEffect, useCallback } from 'react';
import type { Annotation } from '../../../types';

interface MosaicLayerProps {
  annotations: Annotation[];
  scale: number;
  imageUrl: string; // 需要原图来提取像素数据
  imageWidth: number;
  imageHeight: number;
}

export function MosaicLayer({ annotations, scale, imageUrl, imageWidth, imageHeight }: MosaicLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageLoadedRef = useRef(false);

  // 渲染马赛克效果
  const renderMosaics = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoadedRef.current) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制每个马赛克区域
    annotations.forEach((annotation) => {
      const { bounds } = annotation;
      const { pixelSize = 10 } = annotation.data;

      // 应用马赛克效果
      applyMosaicEffect(ctx, img, bounds, pixelSize);
    });
  }, [annotations]);

  // 加载原图
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      imageLoadedRef.current = true;
      renderMosaics();
    };
    img.src = imageUrl;

    return () => {
      imageLoadedRef.current = false;
    };
  }, [imageUrl, renderMosaics]);

  // 每当标注变化时重新渲染
  useEffect(() => {
    if (imageLoadedRef.current) {
      renderMosaics();
    }
  }, [annotations, scale, renderMosaics]);

  // 如果没有马赛克标注，不渲染任何内容
  if (annotations.length === 0) {
    return null;
  }

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

/**
 * 应用真实的像素化马赛克效果
 */
function applyMosaicEffect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bounds: { x: number; y: number; width: number; height: number },
  pixelSize: number
) {
  const { x, y, width, height } = bounds;

  // 确保区域在图片范围内
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(img.width, Math.ceil(x + width));
  const endY = Math.min(img.height, Math.ceil(y + height));

  // 创建临时画布用于采样
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // 设置临时画布尺寸为马赛克区域
  tempCanvas.width = endX - startX;
  tempCanvas.height = endY - startY;

  // 将原图的对应区域绘制到临时画布
  tempCtx.drawImage(
    img,
    startX, startY, tempCanvas.width, tempCanvas.height,
    0, 0, tempCanvas.width, tempCanvas.height
  );

  // 获取像素数据
  try {
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // 按马赛克块处理
    for (let blockY = 0; blockY < tempCanvas.height; blockY += pixelSize) {
      for (let blockX = 0; blockX < tempCanvas.width; blockX += pixelSize) {
        // 计算当前块的平均颜色
        let r = 0, g = 0, b = 0, count = 0;

        for (let py = blockY; py < Math.min(blockY + pixelSize, tempCanvas.height); py++) {
          for (let px = blockX; px < Math.min(blockX + pixelSize, tempCanvas.width); px++) {
            const index = (py * tempCanvas.width + px) * 4;
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            count++;
          }
        }

        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
        }

        // 用平均颜色填充整个块
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(
          startX + blockX,
          startY + blockY,
          Math.min(pixelSize, tempCanvas.width - blockX),
          Math.min(pixelSize, tempCanvas.height - blockY)
        );
      }
    }
  } catch (error) {
    console.error('马赛克效果应用失败:', error);
    // 降级：使用简单的灰色填充
    ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
    ctx.fillRect(startX, startY, endX - startX, endY - startY);
  }
}
