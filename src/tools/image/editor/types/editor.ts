/**
 * 编辑器核心类型定义
 */

import type { ToolType, ToolSettings, Point } from './tools';
import type { Layer, Annotation, EditorAction } from './annotations';

/**
 * 裁剪数据
 */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 变换类型
 */
export type TransformType = 'crop' | 'rotate' | 'flip' | 'resize';

/**
 * 变换状态
 */
export interface TransformState {
  crop: CropData | null;
  rotate: number; // 0, 90, 180, 270
  flip: { horizontal: boolean; vertical: boolean };
  resize: { width: number; height: number } | null;
}

/**
 * 临时绘制状态
 */
export interface DrawingState {
  type: ToolType;
  points: Point[];
  startPoint?: Point;
  endPoint?: Point;
}

/**
 * 编辑器状态接口
 */
export interface EditorState {
  // 工具状态
  activeTool: ToolType;
  toolSettings: ToolSettings;

  // 图层管理
  layers: Layer[];
  activeLayerId: string | null;

  // 标注元素
  annotations: Annotation[];
  selectedAnnotationId: string | null;

  // 历史记录
  history: EditorAction[];
  historyIndex: number;

  // 临时绘制状态
  isDrawing: boolean;
  currentDraw: DrawingState | null;

  // 变换状态
  transforms: TransformState;

  // UI状态
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // 导出状态
  isExporting: boolean;
  exportProgress: number;
}

/**
 * 编辑器 Store Actions
 */
export interface EditorActions {
  // 工具操作
  setActiveTool: (tool: ToolType) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;

  // 图层操作
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, data: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setActiveLayer: (id: string | null) => void;

  // 标注操作
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, data: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;

  // 历史操作
  undo: () => void;
  redo: () => void;
  addToHistory: (action: EditorAction) => void;

  // 绘制操作
  startDrawing: (type: ToolType, point: Point) => void;
  continueDrawing: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  // 变换操作
  applyTransform: (type: TransformType, data: any) => void;

  // 导出操作
  setExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;

  // 重置
  reset: () => void;
}

/**
 * 完整的编辑器 Store
 */
export type EditorStore = EditorState & EditorActions;
