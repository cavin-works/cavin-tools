/**
 * 图层导出工具
 * 负责将所有图层合并并导出为图片
 */

import type { Annotation } from '../types';

/**
 * 将所有图层合并到一个 Canvas
 */
export async function mergeLayersToCanvas(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number,
  annotations: Annotation[]
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    // 创建合并画布
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'));
      return;
    }

    // 加载原始图片
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // 1. 绘制原始图片（最底层）
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

        // 2. 按类型分组绘制标注
        const arrowAnnotations = annotations.filter(a => a.type === 'arrow');
        const shapeAnnotations = annotations.filter(a => ['circle', 'rectangle'].includes(a.type));
        const drawingAnnotations = annotations.filter(a => ['pen', 'highlighter'].includes(a.type));
        const mosaicAnnotations = annotations.filter(a => a.type === 'mosaic');
        const textAnnotations = annotations.filter(a => a.type === 'text');

        // 绘制顺序：马赛克 -> 绘图 -> 形状 -> 箭头 -> 文字

        // 绘制马赛克
        mosaicAnnotations.forEach(annotation => {
          drawMosaicToCanvas(ctx, img, annotation);
        });

        // 绘制绘图（画笔、荧光笔）
        drawingAnnotations.forEach(annotation => {
          drawDrawingToCanvas(ctx, annotation);
        });

        // 绘制形状（圆形、矩形）
        shapeAnnotations.forEach(annotation => {
          drawShapeToCanvas(ctx, annotation);
        });

        // 绘制箭头
        arrowAnnotations.forEach(annotation => {
          drawArrowToCanvas(ctx, annotation);
        });

        // 绘制文字
        textAnnotations.forEach(annotation => {
          drawTextToCanvas(ctx, annotation);
        });

        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = imageUrl;
  });
}

/**
 * 绘制箭头到 Canvas
 */
function drawArrowToCanvas(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { startPoint, endPoint, arrowHeadSize = 15 } = annotation.data;
  const { color, strokeWidth, opacity } = annotation.style;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.globalAlpha = opacity;

  // 绘制箭头主线
  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.stroke();

  // 计算箭头角度
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

  // 绘制箭头头部
  ctx.beginPath();
  ctx.moveTo(endPoint.x, endPoint.y);
  ctx.lineTo(
    endPoint.x - arrowHeadSize * Math.cos(angle - Math.PI / 6),
    endPoint.y - arrowHeadSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(endPoint.x, endPoint.y);
  ctx.lineTo(
    endPoint.x - arrowHeadSize * Math.cos(angle + Math.PI / 6),
    endPoint.y - arrowHeadSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();

  ctx.restore();
}

/**
 * 绘制形状到 Canvas
 */
function drawShapeToCanvas(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { bounds, style } = annotation;
  const { color, strokeWidth, opacity, fillColor } = style;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.globalAlpha = opacity;

  if (annotation.type === 'circle') {
    const { radius } = annotation.data;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (annotation.type === 'rectangle') {
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 绘制绘图路径到 Canvas
 */
function drawDrawingToCanvas(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { points } = annotation.data;
  const { color, strokeWidth, opacity } = annotation.style;

  if (!points || points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * 绘制马赛克到 Canvas
 */
function drawMosaicToCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  annotation: Annotation
) {
  const { bounds } = annotation;
  const { pixelSize = 10 } = annotation.data;

  const startX = Math.max(0, Math.floor(bounds.x));
  const startY = Math.max(0, Math.floor(bounds.y));
  const endX = Math.min(img.width, Math.ceil(bounds.x + bounds.width));
  const endY = Math.min(img.height, Math.ceil(bounds.y + bounds.height));

  // 创建临时画布
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCanvas.width = endX - startX;
  tempCanvas.height = endY - startY;

  // 绘制原图区域
  tempCtx.drawImage(
    img,
    startX, startY, tempCanvas.width, tempCanvas.height,
    0, 0, tempCanvas.width, tempCanvas.height
  );

  try {
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // 应用马赛克效果
    for (let blockY = 0; blockY < tempCanvas.height; blockY += pixelSize) {
      for (let blockX = 0; blockX < tempCanvas.width; blockX += pixelSize) {
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
    console.error('马赛克绘制失败:', error);
  }
}

/**
 * 绘制文字到 Canvas
 */
function drawTextToCanvas(ctx: CanvasRenderingContext2D, annotation: Annotation) {
  const { bounds, style } = annotation;
  const { text, fontSize = 16, fontFamily = 'Arial', fontWeight = 'normal' } = annotation.data;
  const { color, opacity } = style;

  if (!text) return;

  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  // 绘制文字
  ctx.fillText(text, bounds.x, bounds.y + fontSize);

  ctx.restore();
}

/**
 * 将 Canvas 导出为 Blob
 */
export async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas 导出失败'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * 将 Blob 转换为 Base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Base64 转换失败'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
