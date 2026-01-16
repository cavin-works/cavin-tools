/**
 * 选择覆盖层
 * 显示选中标注的边框和调整手柄
 */

import { useCallback } from 'react';
import type { Annotation } from '../../types';

interface SelectionOverlayProps {
  annotation: Annotation;
  scale: number;
  onMove: (dx: number, dy: number) => void;
  onResize: (handle: string, dx: number, dy: number) => void;
}

export function SelectionOverlay({ annotation, scale, onMove, onResize }: SelectionOverlayProps) {
  const { bounds } = annotation;

  // 调整手柄位置
  const handles = [
    { id: 'nw', cursor: 'nwse-resize', x: bounds.x, y: bounds.y },
    { id: 'n', cursor: 'ns-resize', x: bounds.x + bounds.width / 2, y: bounds.y },
    { id: 'ne', cursor: 'nesw-resize', x: bounds.x + bounds.width, y: bounds.y },
    { id: 'e', cursor: 'ew-resize', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    { id: 'se', cursor: 'nwse-resize', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { id: 's', cursor: 'ns-resize', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    { id: 'sw', cursor: 'nesw-resize', x: bounds.x, y: bounds.y + bounds.height },
    { id: 'w', cursor: 'ew-resize', x: bounds.x, y: bounds.y + bounds.height / 2 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 选中边框 */}
      <div
        className="absolute border-2 border-blue-500 pointer-events-auto cursor-move"
        style={{
          left: `${bounds.x}px`,
          top: `${bounds.y}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />

      {/* 调整手柄 */}
      {handles.map((handle) => (
        <div
          key={handle.id}
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm pointer-events-auto hover:bg-blue-100 transition-colors"
          style={{
            left: `${handle.x}px`,
            top: `${handle.y}px`,
            transform: `translate(-50%, -50%) scale(${1 / scale})`,
            cursor: handle.cursor,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleResizeStart(handle.id, e);
          }}
        />
      ))}
    </div>
  );

  function handleResizeStart(handleId: string, e: React.MouseEvent) {
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      onResize(handleId, dx, dy);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}
