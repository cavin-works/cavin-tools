/**
 * 交互式裁剪覆盖层组件
 * 提供专业的裁剪控制框,支持拖动和调整大小
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { CropParams } from '../types';

interface CropOverlayProps {
  /** 当前裁剪参数 */
  cropParams: CropParams | null;
  /** 图片宽度 */
  imageWidth: number;
  /** 图片高度 */
  imageHeight: number;
  /** Canvas缩放比例 */
  scale: number;
  /** Canvas偏移X */
  offsetX: number;
  /** Canvas偏移Y */
  offsetY: number;
  /** 裁剪参数更新回调 */
  onCropChange?: (params: CropParams) => void;
  /** 是否激活裁剪模式 */
  isActive?: boolean;
}

/** 手柄类型 */
type HandleType =
  | 'nw' // 西北角(左上)
  | 'ne' // 东北角(右上)
  | 'se' // 东南角(右下)
  | 'sw' // 西南角(左下)
  | 'n'  // 北边(上)
  | 's'  // 南边(下)
  | 'w'  // 西边(左)
  | 'e'  // 东边(右)
  | 'move'; // 移动整个框

export function CropOverlay({
  cropParams,
  imageWidth,
  imageHeight,
  scale,
  offsetX,
  offsetY,
  onCropChange,
  isActive = false,
}: CropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cropStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  /** 将屏幕坐标转换为图片坐标 */
  const screenToImageCoords = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - offsetX) / scale,
        y: (screenY - offsetY) / scale,
      };
    },
    [scale, offsetX, offsetY]
  );

  /** 将图片坐标转换为屏幕坐标 */
  const imageToScreenCoords = useCallback(
    (imageX: number, imageY: number) => {
      return {
        x: imageX * scale + offsetX,
        y: imageY * scale + offsetY,
      };
    },
    [scale, offsetX, offsetY]
  );

  /** 限制裁剪区域在图片范围内 */
  const constrainCrop = useCallback(
    (x: number, y: number, width: number, height: number) => {
      return {
        x: Math.max(0, Math.min(x, imageWidth - 10)),
        y: Math.max(0, Math.min(y, imageHeight - 10)),
        width: Math.max(10, Math.min(width, imageWidth - x)),
        height: Math.max(10, Math.min(height, imageHeight - y)),
      };
    },
    [imageWidth, imageHeight]
  );

  /** 处理鼠标按下 */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: HandleType) => {
      if (!cropParams || !isActive) return;

      e.stopPropagation();
      setIsDragging(true);
      setActiveHandle(handle);

      const { x, y } = screenToImageCoords(e.clientX, e.clientY);
      dragStartPos.current = { x, y };
      cropStartPos.current = {
        x: cropParams.x,
        y: cropParams.y,
        width: cropParams.width,
        height: cropParams.height,
      };
    },
    [cropParams, isActive, screenToImageCoords]
  );

  /** 处理鼠标移动 */
  useEffect(() => {
    if (!isDragging || !cropParams || !activeHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { x: currentX, y: currentY } = screenToImageCoords(
        e.clientX,
        e.clientY
      );

      const dx = currentX - dragStartPos.current.x;
      const dy = currentY - dragStartPos.current.y;

      let newX = cropStartPos.current.x;
      let newY = cropStartPos.current.y;
      let newWidth = cropStartPos.current.width;
      let newHeight = cropStartPos.current.height;

      switch (activeHandle) {
        case 'move':
          newX = cropStartPos.current.x + dx;
          newY = cropStartPos.current.y + dy;
          break;

        case 'nw':
          newX = cropStartPos.current.x + dx;
          newY = cropStartPos.current.y + dy;
          newWidth = cropStartPos.current.width - dx;
          newHeight = cropStartPos.current.height - dy;
          break;

        case 'ne':
          newY = cropStartPos.current.y + dy;
          newWidth = cropStartPos.current.width + dx;
          newHeight = cropStartPos.current.height - dy;
          break;

        case 'se':
          newWidth = cropStartPos.current.width + dx;
          newHeight = cropStartPos.current.height + dy;
          break;

        case 'sw':
          newX = cropStartPos.current.x + dx;
          newWidth = cropStartPos.current.width - dx;
          newHeight = cropStartPos.current.height + dy;
          break;

        case 'n':
          newY = cropStartPos.current.y + dy;
          newHeight = cropStartPos.current.height - dy;
          break;

        case 's':
          newHeight = cropStartPos.current.height + dy;
          break;

        case 'w':
          newX = cropStartPos.current.x + dx;
          newWidth = cropStartPos.current.width - dx;
          break;

        case 'e':
          newWidth = cropStartPos.current.width + dx;
          break;
      }

      const constrained = constrainCrop(newX, newY, newWidth, newHeight);
      onCropChange(constrained);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    cropParams,
    activeHandle,
    screenToImageCoords,
    constrainCrop,
    onCropChange,
  ]);

  if (!cropParams || !isActive) {
    return null;
  }

  /** 计算裁剪框在屏幕上的位置和尺寸 */
  const topLeft = imageToScreenCoords(cropParams.x, cropParams.y);
  const boxWidth = cropParams.width * scale;
  const boxHeight = cropParams.height * scale;

  /** 手柄样式 */
  const handleStyle = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '2px solid #0099FF',
    position: 'absolute' as const,
    transform: 'translate(-50%, -50%)',
    cursor: 'pointer',
    transition: isDragging ? 'none' : 'all 150ms ease',
    zIndex: 20,
  };

  const edgeHandleStyle = {
    ...handleStyle,
    width: 10,
    height: 10,
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* 裁剪区域容器 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: topLeft.x,
          top: topLeft.y,
          width: boxWidth,
          height: boxHeight,
          border: '2px solid #0099FF',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 网格线 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0, 153, 255, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 153, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
          }}
        />

        {/* 中心十字线 */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          {/* 横线 */}
          <div
            className="absolute bg-[#0099FF]"
            style={{
              left: -10,
              top: -1,
              width: 20,
              height: 2,
            }}
          />
          {/* 竖线 */}
          <div
            className="absolute bg-[#0099FF]"
            style={{
              left: -1,
              top: -10,
              width: 2,
              height: 20,
            }}
          />
        </div>

        {/* 角点手柄 */}
        {/* 左上角 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
          style={{
            ...handleStyle,
            left: 0,
            top: 0,
            cursor: 'nw-resize',
          }}
          className="hover:scale-125 hover:border-[3px]"
        />

        {/* 右上角 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
          style={{
            ...handleStyle,
            left: '100%',
            top: 0,
            cursor: 'ne-resize',
          }}
          className="hover:scale-125 hover:border-[3px]"
        />

        {/* 右下角 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'se')}
          style={{
            ...handleStyle,
            left: '100%',
            top: '100%',
            cursor: 'se-resize',
          }}
          className="hover:scale-125 hover:border-[3px]"
        />

        {/* 左下角 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
          style={{
            ...handleStyle,
            left: 0,
            top: '100%',
            cursor: 'sw-resize',
          }}
          className="hover:scale-125 hover:border-[3px]"
        />

        {/* 边线中点手柄 */}
        {/* 上边 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'n')}
          style={{
            ...edgeHandleStyle,
            left: '50%',
            top: 0,
            cursor: 'n-resize',
          }}
          className="hover:scale-125"
        />

        {/* 下边 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 's')}
          style={{
            ...edgeHandleStyle,
            left: '50%',
            top: '100%',
            cursor: 's-resize',
          }}
          className="hover:scale-125"
        />

        {/* 左边 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'w')}
          style={{
            ...edgeHandleStyle,
            left: 0,
            top: '50%',
            cursor: 'w-resize',
          }}
          className="hover:scale-125"
        />

        {/* 右边 */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'e')}
          style={{
            ...edgeHandleStyle,
            left: '100%',
            top: '50%',
            cursor: 'e-resize',
          }}
          className="hover:scale-125"
        />

        {/* 尺寸标签 */}
        <div
          className="absolute bg-[#0099FF] text-white text-xs px-2 py-1 rounded pointer-events-none"
          style={{
            left: 0,
            top: -28,
            transform: 'translateY(-100%)',
            whiteSpace: 'nowrap',
          }}
        >
          {cropParams.width} × {cropParams.height} px
        </div>
      </div>

      {/* 拖动整个裁剪框的透明覆盖层 */}
      <div
        onMouseDown={(e) => handleMouseDown(e, 'move')}
        style={{
          position: 'absolute',
          left: topLeft.x,
          top: topLeft.y,
          width: boxWidth,
          height: boxHeight,
          cursor: 'move',
          pointerEvents: 'auto',
        }}
        className="hover:bg-white/5 transition-colors duration-150"
      />
    </div>
  );
}
