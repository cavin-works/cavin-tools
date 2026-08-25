// 拼贴模板
export type CollageTemplate = 'row' | 'column' | 'grid-2' | 'grid-3';

// 模板选项（含 UI 标签）
export const TEMPLATES: { id: CollageTemplate; label: string }[] = [
  { id: 'row', label: '横向' },
  { id: 'column', label: '纵向' },
  { id: 'grid-2', label: '2×2' },
  { id: 'grid-3', label: '九宫格' },
];

// 拼贴参数（与后端 image_collage::CollageParams 对应）
export interface CollageParams {
  template: CollageTemplate;
  /** 图片间距 0..64 */
  gap: number;
  /** 画布外边距 0..64 */
  margin: number;
  /** 背景色 "#RRGGBB" | "transparent" */
  background: string;
  /** 每张图圆角半径 0..64，0 表示直角 */
  cornerRadius: number;
}

export const DEFAULT_PARAMS: CollageParams = {
  template: 'grid-2',
  gap: 8,
  margin: 12,
  background: '#ffffff',
  cornerRadius: 0,
};

// 已添加的图片（宽度/高度由 get_image_info 获取）
export interface CollageImage {
  id: string;
  path: string;
  filename: string;
  width: number;
  height: number;
}

// 导出格式
export type ExportFormat = 'png' | 'jpg' | 'webp';
