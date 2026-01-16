/**
 * 编辑器工具类型定义
 */

/**
 * 工具类型
 */
export type ToolType =
  // 选择工具
  | 'select'

  // 绘制工具
  | 'pen'
  | 'highlighter'

  // 标注工具
  | 'arrow'
  | 'circle'
  | 'rectangle'
  | 'text'

  // 效果工具
  | 'mosaic'

  // 变换工具
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'resize';

/**
 * 工具配置
 */
export interface ToolSettings {
  // 通用设置
  color: string;
  strokeWidth: number;
  opacity: number;

  // 文字专用
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';

  // 形状专用
  fillColor: string | null;
  strokeDashArray: number[];

  // 马赛克专用
  mosaicSize: number;
  blurAmount: number;
}

/**
 * 工具元数据
 */
export interface ToolMetadata {
  type: ToolType;
  name: string;
  icon: string;
  description: string;
  shortcut?: string;
  group: 'select' | 'draw' | 'annotate' | 'effect' | 'transform' | 'history' | 'action';
}

/**
 * 点坐标
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 矩形边界
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
