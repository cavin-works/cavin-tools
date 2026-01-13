/**
 * Canvas 预览组件
 * 支持实时预览图片变换效果
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useImageQueue } from '../contexts/ImageOperationQueueContext';
import { useImageStore } from '../store/imageStore';
import { convertFileSrc } from '@tauri-apps/api/core';

interface PreviewCanvasProps {
  className?: string;
}

export function PreviewCanvas({ className = '' }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>();
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);

  const { currentImage } = useImageStore();
  const { queue } = useImageQueue();
  const renderTimeoutRef = useRef<number>();

  // 加载图片
  useEffect(() => {
    if (!currentImage) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      requestRender();
    };
    img.src = convertFileSrc(currentImage.path);
  }, [currentImage]);

  // 防抖渲染函数
  const requestRender = useCallback(() => {
    if (renderTimeoutRef.current) {
      cancelAnimationFrame(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = requestAnimationFrame(() => {
      render();
    });
  }, []);

  // 渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !currentImage) return;

    // 设置canvas尺寸
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 检查是否有裁剪操作
    const hasCrop = queue.some(op => op.type === 'crop');

    // 保存当前状态
    ctx.save();

    // 应用变换链（除了裁剪和水印）
    for (const operation of queue) {
      switch (operation.type) {
        case 'rotate':
          applyRotate(ctx, canvas, operation.params);
          break;
        case 'flip':
          applyFlip(ctx, canvas, operation.params);
          break;
        // 注意：裁剪不在渲染时应用，只显示裁剪框
        // case 'crop':
        //   applyCrop(ctx, canvas, operation.params);
        //   break;
        case 'resize':
          applyResize(ctx, canvas, operation.params);
          break;
      }
    }

    // 绘制原始图片
    ctx.drawImage(img, 0, 0);

    // 恢复状态
    ctx.restore();

    // 应用水印（在图片之上）
    applyWatermarks(ctx, canvas, queue);

    // 绘制裁剪区域（如果有裁剪操作）
    if (hasCrop) {
      drawCropOverlays(ctx, canvas, queue);
    }
  }, [queue, currentImage]);

  // 绘制裁剪区域覆盖层
  const drawCropOverlays = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    operations: any[]
  ) => {
    const cropOps = operations.filter(op => op.type === 'crop');

    console.log('🔍 裁剪操作检查:', {
      总操作数: operations.length,
      裁剪操作数: cropOps.length,
      所有操作: operations.map(op => ({ type: op.type, name: op.name }))
    });

    if (cropOps.length === 0) return;

    // 只显示最新的裁剪操作
    const cropOp = cropOps[cropOps.length - 1];
    const params = cropOp.params;

    console.log('✂️ 绘制裁剪框:', params);

    // 绘制半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // 上方区域
    ctx.fillRect(0, 0, canvas.width, params.y);
    // 下方区域
    ctx.fillRect(0, params.y + params.height, canvas.width, canvas.height - params.y - params.height);
    // 左侧区域
    ctx.fillRect(0, params.y, params.x, params.height);
    // 右侧区域
    ctx.fillRect(params.x + params.width, params.y, canvas.width - params.x - params.width, params.height);

    // 绘制裁剪框边框
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(params.x, params.y, params.width, params.height);

    // 绘制裁剪区域尺寸标签
    ctx.setLineDash([]);
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(params.x, params.y - 24, 140, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px system-ui';
    ctx.fillText(
      `${params.width} × ${params.height} px`,
      params.x + 8,
      params.y - 7
    );

    // 绘制角标
    const cornerSize = 10;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;

    // 左上角
    ctx.beginPath();
    ctx.moveTo(params.x, params.y + cornerSize);
    ctx.lineTo(params.x, params.y);
    ctx.lineTo(params.x + cornerSize, params.y);
    ctx.stroke();

    // 右上角
    ctx.beginPath();
    ctx.moveTo(params.x + params.width - cornerSize, params.y);
    ctx.lineTo(params.x + params.width, params.y);
    ctx.lineTo(params.x + params.width, params.y + cornerSize);
    ctx.stroke();

    // 右下角
    ctx.beginPath();
    ctx.moveTo(params.x + params.width, params.y + params.height - cornerSize);
    ctx.lineTo(params.x + params.width, params.y + params.height);
    ctx.lineTo(params.x + params.width - cornerSize, params.y + params.height);
    ctx.stroke();

    // 左下角
    ctx.beginPath();
    ctx.moveTo(params.x + cornerSize, params.y + params.height);
    ctx.lineTo(params.x, params.y + params.height);
    ctx.lineTo(params.x, params.y + params.height - cornerSize);
    ctx.stroke();
  };

  // 应用水印
  const applyWatermarks = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    operations: any[]
  ) => {
    const watermarkOps = operations.filter(op => op.type === 'watermark');

    if (watermarkOps.length === 0) return;

    let loadedCount = 0;
    const totalCount = watermarkOps.length;

    watermarkOps.forEach((operation, index) => {
      const params = operation.params;
      if (!params.image_options?.watermark_path) {
        loadedCount++;
        return;
      }

      const watermarkImg = new Image();
      watermarkImg.onload = () => {
        const scale = params.image_options.scale || 0.2;
        const wmWidth = watermarkImg.width * scale;
        const wmHeight = watermarkImg.height * scale;

        let x, y;
        const padding = 20;

        // 计算位置
        switch (params.position) {
          case 'top-left':
            x = padding;
            y = padding;
            break;
          case 'top-center':
            x = (canvas.width - wmWidth) / 2;
            y = padding;
            break;
          case 'top-right':
            x = canvas.width - wmWidth - padding;
            y = padding;
            break;
          case 'center-left':
            x = padding;
            y = (canvas.height - wmHeight) / 2;
            break;
          case 'center':
            x = (canvas.width - wmWidth) / 2;
            y = (canvas.height - wmHeight) / 2;
            break;
          case 'center-right':
            x = canvas.width - wmWidth - padding;
            y = (canvas.height - wmHeight) / 2;
            break;
          case 'bottom-left':
            x = padding;
            y = canvas.height - wmHeight - padding;
            break;
          case 'bottom-right':
            x = canvas.width - wmWidth - padding;
            y = canvas.height - wmHeight - padding;
            break;
          case 'bottom-center':
            x = (canvas.width - wmWidth) / 2;
            y = canvas.height - wmHeight - padding;
            break;
          case 'custom':
            x = params.x || 0;
            y = params.y || 0;
            break;
          default:
            x = canvas.width - wmWidth - padding;
            y = canvas.height - wmHeight - padding;
        }

        ctx.globalAlpha = params.opacity / 255;
        ctx.drawImage(watermarkImg, x, y, wmWidth, wmHeight);
        ctx.globalAlpha = 1.0;

        loadedCount++;
        if (loadedCount === totalCount) {
          // 所有水印加载完成
        }
      };
      watermarkImg.src = params.image_options.watermark_path;
    });
  };

  // 旋转变换
  const applyRotate = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    params: any
  ) => {
    const angle = params.angle * (Math.PI / 180);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  };

  // 翻转变换
  const applyFlip = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    params: any
  ) => {
    if (params.horizontal) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    if (params.vertical) {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
  };

  // 裁剪变换
  const applyCrop = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    params: any
  ) => {
    ctx.beginPath();
    ctx.rect(params.x, params.y, params.width, params.height);
    ctx.clip();
  };

  // 调整大小变换
  const applyResize = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    params: any
  ) => {
    let newWidth = canvas.width;
    let newHeight = canvas.height;

    if (params.percentage) {
      newWidth = Math.round(canvas.width * (params.percentage / 100));
      newHeight = Math.round(canvas.height * (params.percentage / 100));
    } else {
      if (params.width) newWidth = params.width;
      if (params.height) newHeight = params.height;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
  };

  // 当操作队列变化时重新渲染（使用防抖）
  useEffect(() => {
    requestRender();
  }, [queue, requestRender]);

  // 清理
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        cancelAnimationFrame(renderTimeoutRef.current);
      }
    };
  }, []);

  // 缩放控制
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  // 拖拽控制
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    setOffsetX(prev => prev + dx);
    setOffsetY(prev => prev + dy);
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 重置视图
  const resetView = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  if (!currentImage) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-sm text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `scale(${scale}) translate(${offsetX / scale}px, ${offsetY / scale}px)`,
          transformOrigin: 'center center',
          cursor: isDragging ? 'grabbing' : 'grab',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        className="shadow-lg"
      />

      {/* 控制按钮 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-neutral-800/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
        <button
          onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}
          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-white"
          title="放大"
        >
          +
        </button>
        <span className="text-xs text-neutral-300 w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(prev => Math.max(prev / 1.2, 0.1))}
          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-white"
          title="缩小"
        >
          -
        </button>
        <div className="w-px h-4 bg-neutral-600" />
        <button
          onClick={resetView}
          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-white"
          title="重置视图"
        >
          重置
        </button>
      </div>

      {/* 提示信息 */}
      {queue.length > 0 && (
        <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur rounded px-3 py-1.5 text-xs text-white">
          预览模式：{queue.length} 个操作待执行
        </div>
      )}
    </div>
  );
}
