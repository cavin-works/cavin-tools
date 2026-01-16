/**
 * 主编辑画布组件
 * 整合图层管理器和交互处理
 */

import { useRef, useCallback, MouseEvent, useState, useEffect } from 'react';
import { useImageStore } from '../../store/imageStore';
import { useEditorStore } from '../../store/editorStore';
import { LayerManager } from './LayerManager';
import { TextInput } from './TextInput';
import { SelectionOverlay } from './SelectionOverlay';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Point, Annotation } from '../../types';

interface EditorCanvasProps {
  className?: string;
}

export function EditorCanvas({ className }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentImage } = useImageStore();
  const {
    activeTool,
    startDrawing,
    continueDrawing,
    finishDrawing,
    isDrawing,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toolSettings,
    annotations,
    selectedAnnotationId,
    selectAnnotation,
  } = useEditorStore();

  // 文字输入状态
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null);

  // 拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  if (!currentImage) return null;

  const imageUrl = convertFileSrc(currentImage.path);

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log('🖱️ 鼠标按下:', activeTool, { x, y });

      // 根据工具类型处理
      switch (activeTool) {
        case 'select':
          // 选择工具：检查点击是否在某个标注内
          const clickedAnnotation = findAnnotationAtPoint({ x, y }, annotations);
          if (clickedAnnotation) {
            console.log('🎯 选中标注:', clickedAnnotation.id);
            selectAnnotation(clickedAnnotation.id);
            setIsDragging(true);
            setDragStart({ x, y });
          } else {
            console.log('❌ 未选中任何标注');
            selectAnnotation(null);
          }
          break;

        case 'pen':
        case 'highlighter':
          startDrawing(activeTool, { x, y });
          break;

        case 'arrow':
        case 'circle':
        case 'rectangle':
          startDrawing(activeTool, { x, y });
          break;

        case 'text':
          // 显示文字输入框
          console.log('文字工具：显示输入框', { x, y });
          setTextInputPosition({ x, y });
          break;

        case 'mosaic':
          startDrawing('mosaic', { x, y });
          break;
      }
    },
    [activeTool, startDrawing]
  );

  // 处理鼠标移动
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 选择工具的拖动
      if (activeTool === 'select' && isDragging && dragStart && selectedAnnotationId) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        const annotation = annotations.find(a => a.id === selectedAnnotationId);
        if (annotation) {
          updateAnnotation(selectedAnnotationId, {
            bounds: {
              ...annotation.bounds,
              x: annotation.bounds.x + dx,
              y: annotation.bounds.y + dy,
            },
          });
          setDragStart({ x, y });
        }
        return;
      }

      // 其他工具的绘制
      if (isDrawing) {
        continueDrawing({ x, y });
      }
    },
    [activeTool, isDrawing, isDragging, dragStart, selectedAnnotationId, annotations, continueDrawing, updateAnnotation]
  );

  // 处理鼠标松开
  const handleMouseUp = useCallback(() => {
    // 停止拖动
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    // 绘制工具
    if (!isDrawing) return;

    const { currentDraw } = useEditorStore.getState();
    if (!currentDraw) return;

    console.log('✅ 完成绘制，创建标注:', currentDraw);

    // 根据工具类型创建标注
    const annotation = createAnnotationFromDraw(currentDraw, toolSettings);
    if (annotation) {
      addAnnotation(annotation);
    }

    finishDrawing();
  }, [isDrawing, isDragging, finishDrawing, addAnnotation, toolSettings]);

  // 键盘事件处理（Delete键删除选中标注）
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedAnnotationId) {
        console.log('🗑️ 删除选中标注:', selectedAnnotationId);
        deleteAnnotation(selectedAnnotationId);
        selectAnnotation(null);
      }
    }
  }, [selectedAnnotationId, deleteAnnotation, selectAnnotation]);

  // 注册键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 文字输入完成
  const handleTextComplete = useCallback((text: string) => {
    if (!textInputPosition) return;

    console.log('✅ 文字输入完成:', text);

    // 创建文字标注
    const now = Date.now();
    const annotation = {
      id: `annotation-${now}`,
      type: 'text' as const,
      layerId: 'default',
      bounds: {
        x: textInputPosition.x,
        y: textInputPosition.y,
        width: 0, // 自动宽度
        height: 0,
      },
      data: {
        text,
        fontSize: toolSettings.fontSize,
        fontFamily: toolSettings.fontFamily,
        fontWeight: toolSettings.fontWeight,
      },
      style: {
        color: toolSettings.color,
        strokeWidth: 0,
        opacity: toolSettings.opacity,
      },
      createdAt: now,
      updatedAt: now,
    };

    addAnnotation(annotation);
    setTextInputPosition(null);
  }, [textInputPosition, toolSettings, addAnnotation]);

  // 文字输入取消
  const handleTextCancel = useCallback(() => {
    console.log('❌ 文字输入取消');
    setTextInputPosition(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: `${currentImage.width}px`,
        height: `${currentImage.height}px`,
        cursor: getCursorForTool(activeTool),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 图层管理器 */}
      <LayerManager
        imageUrl={imageUrl}
        imageWidth={currentImage.width}
        imageHeight={currentImage.height}
        scale={1}
      />

      {/* 文字输入框 */}
      {textInputPosition && (
        <TextInput
          position={textInputPosition}
          onComplete={handleTextComplete}
          onCancel={handleTextCancel}
        />
      )}

      {/* 选择覆盖层 */}
      {activeTool === 'select' && selectedAnnotationId && (() => {
        const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
        return selectedAnnotation ? (
          <SelectionOverlay
            annotation={selectedAnnotation}
            scale={1}
            onMove={(dx, dy) => {
              updateAnnotation(selectedAnnotationId, {
                bounds: {
                  ...selectedAnnotation.bounds,
                  x: selectedAnnotation.bounds.x + dx,
                  y: selectedAnnotation.bounds.y + dy,
                },
              });
            }}
            onResize={(handle, dx, dy) => {
              // TODO: 实现调整大小逻辑
              console.log('调整大小:', handle, dx, dy);
            }}
          />
        ) : null;
      })()}
    </div>
  );
}

/**
 * 从绘制状态创建标注对象
 */
function createAnnotationFromDraw(currentDraw: any, toolSettings: any) {
  const { type, points, startPoint, endPoint } = currentDraw;

  if (!startPoint) return null;

  const now = Date.now();

  switch (type) {
    case 'pen':
    case 'highlighter':
      if (points.length < 2) return null;

      // 计算边界
      const xs = points.map((p: any) => p.x);
      const ys = points.map((p: any) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      return {
        id: `annotation-${now}`,
        type,
        layerId: 'default',
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
        data: {
          points,
        },
        style: {
          color: toolSettings.color,
          strokeWidth: toolSettings.strokeWidth,
          opacity: type === 'highlighter' ? 0.5 : toolSettings.opacity,
        },
        createdAt: now,
        updatedAt: now,
      };

    case 'arrow':
      if (!endPoint) return null;

      return {
        id: `annotation-${now}`,
        type: 'arrow',
        layerId: 'default',
        bounds: {
          x: Math.min(startPoint.x, endPoint.x),
          y: Math.min(startPoint.y, endPoint.y),
          width: Math.abs(endPoint.x - startPoint.x),
          height: Math.abs(endPoint.y - startPoint.y),
        },
        data: {
          startPoint,
          endPoint,
          arrowHeadSize: 15,
        },
        style: {
          color: toolSettings.color,
          strokeWidth: toolSettings.strokeWidth,
          opacity: toolSettings.opacity,
        },
        createdAt: now,
        updatedAt: now,
      };

    case 'circle':
    case 'rectangle':
      if (!endPoint) return null;

      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);

      return {
        id: `annotation-${now}`,
        type,
        layerId: 'default',
        bounds: {
          x: Math.min(startPoint.x, endPoint.x),
          y: Math.min(startPoint.y, endPoint.y),
          width,
          height,
        },
        data: type === 'circle' ? { radius: Math.min(width, height) / 2 } : {},
        style: {
          color: toolSettings.color,
          strokeWidth: toolSettings.strokeWidth,
          opacity: toolSettings.opacity,
          fillColor: toolSettings.fillColor,
        },
        createdAt: now,
        updatedAt: now,
      };

    case 'mosaic':
      if (!endPoint) return null;

      return {
        id: `annotation-${now}`,
        type: 'mosaic',
        layerId: 'default',
        bounds: {
          x: Math.min(startPoint.x, endPoint.x),
          y: Math.min(startPoint.y, endPoint.y),
          width: Math.abs(endPoint.x - startPoint.x),
          height: Math.abs(endPoint.y - startPoint.y),
        },
        data: {
          pixelSize: toolSettings.mosaicSize,
        },
        style: {
          color: '#888888',
          strokeWidth: 0,
          opacity: 0.8,
        },
        createdAt: now,
        updatedAt: now,
      };

    default:
      return null;
  }
}

/**
 * 根据工具获取鼠标样式
 */
function getCursorForTool(tool: string): string {
  switch (tool) {
    case 'select':
      return 'default';
    case 'pen':
    case 'highlighter':
      return 'crosshair';
    case 'arrow':
    case 'circle':
    case 'rectangle':
    case 'mosaic':
      return 'crosshair';
    case 'text':
      return 'text';
    case 'crop':
      return 'crosshair';
    default:
      return 'default';
  }
}

/**
 * 检测点击位置是否在某个标注内
 * 返回最上层（最后绘制）的标注
 */
function findAnnotationAtPoint(point: Point, annotations: Annotation[]): Annotation | null {
  // 从后往前查找（最上层优先）
  for (let i = annotations.length - 1; i >= 0; i--) {
    const annotation = annotations[i];
    const { bounds } = annotation;

    // 检查点是否在边界框内
    if (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    ) {
      return annotation;
    }
  }

  return null;
}
