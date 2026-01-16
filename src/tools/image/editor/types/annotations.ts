/**
 * 标注和图层类型定义
 */

import type { ToolType, Point, Bounds } from './tools';

/**
 * 图层类型
 */
export type LayerType = 'image' | 'annotation' | 'drawing' | 'text' | 'mosaic';

/**
 * 图层接口
 */
export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  data: any;
  createdAt: number;
  updatedAt: number;
}

/**
 * 标注样式
 */
export interface AnnotationStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  fillColor?: string;
  strokeDashArray?: number[];
}

/**
 * 标注数据（根据类型不同）
 */
export interface AnnotationData {
  // 箭头
  startPoint?: Point;
  endPoint?: Point;
  arrowHeadSize?: number;

  // 绘制路径（画笔、荧光笔）
  points?: Point[];

  // 形状（圆形）
  radius?: number;

  // 文字
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';

  // 马赛克
  pixelSize?: number;
  blurAmount?: number;
}

/**
 * 标注接口
 */
export interface Annotation {
  id: string;
  type: ToolType;
  layerId: string;

  // 位置和尺寸
  bounds: Bounds;

  // 类型特定数据
  data: AnnotationData;

  // 样式
  style: AnnotationStyle;

  // 元数据
  createdAt: number;
  updatedAt: number;
}

/**
 * 历史动作类型
 */
export type EditorActionType = 'add' | 'update' | 'delete' | 'transform';

/**
 * 历史动作目标
 */
export type EditorActionTarget = 'annotation' | 'layer' | 'transform';

/**
 * 历史动作接口
 */
export interface EditorAction {
  id: string;
  type: EditorActionType;
  target: EditorActionTarget;
  data: {
    before: any;
    after: any;
  };
  timestamp: number;
}
