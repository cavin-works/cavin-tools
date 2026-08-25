// 裁剪区域（基于应用旋转/翻转后的原图坐标系）
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 编辑参数（与后端 image_editor::EditParams 对应）
export interface EditParams {
  crop?: CropRect;
  /** 旋转角度 0|90|180|270（顺时针） */
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  /** 亮度 -100..100 */
  brightness: number;
  /** 对比度 -100..100 */
  contrast: number;
  /** 色相 -180..180 */
  hue: number;
  grayscale: boolean;
  invert: boolean;
  /** 模糊 sigma 0..10 */
  blur: number;
  /** 锐化强度 0..10 */
  sharpen: number;
  /** 饱和度 -100..100 */
  saturation: number;
  /** 标注列表 */
  annotations: Annotation[];
  /** 文字标注 PNG 列表（预览/导出均传入；预览时前端按缩放比渲染小号 PNG，坐标由后端换算） */
  textOverlays?: TextOverlay[];
}

// 默认编辑参数（数值 0 / 开关 false / 空列表均为"无操作"，后端会跳过）
export const DEFAULT_PARAMS: EditParams = {
  rotation: 0,
  flipH: false,
  flipV: false,
  brightness: 0,
  contrast: 0,
  hue: 0,
  grayscale: false,
  invert: false,
  blur: 0,
  sharpen: 0,
  saturation: 0,
  annotations: [],
};

// 标注类型（text 为前端 DOM 呈现 + 导出时渲染为 PNG 走 textOverlays，不进后端标注管线）
export type AnnotationKind = 'rect' | 'arrow' | 'highlight' | 'text';

// 标注（与后端 image_editor::Annotation 对应，坐标与裁剪同处旋转/翻转后的原图坐标系）
export interface Annotation {
  kind: AnnotationKind;
  x: number;
  y: number;
  /** arrow 为对角点矩形包络 */
  width: number;
  height: number;
  /** "#RRGGBB" */
  color: string;
  /** 线宽 2|4|8 */
  stroke: number;
  /** arrow 专用：true 时对角线为右上→左下（默认左上→右下） */
  flip: boolean;
  /** text 专用：文字内容 */
  text?: string;
  /** text 专用：字号 px（原图坐标系） */
  size?: number;
}

// 文字标注（与后端 image_editor::TextOverlay 对应：前端离屏 canvas 渲染的 PNG）
export interface TextOverlay {
  x: number;
  y: number;
  /** PNG base64（不带 data: 前缀） */
  pngBase64: string;
}

// 标注色板
export const ANNOTATION_COLORS = ['#FF4D4F', '#FFC53D', '#63E6BE', '#4DABF7', '#B197FC', '#FFFFFF'];

// 标注线宽档位
export const ANNOTATION_STROKES = [2, 4, 8];

// 文字标注字号：跟随线宽档位映射（共用"细/中/粗"选择器，避免为文字单开一档 UI）
export const TEXT_FONT_SIZE: Record<number, number> = { 2: 16, 4: 28, 8: 48 };

// 图片信息（get_image_info 返回）
export interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  colorType: string;
}

// 裁剪比例预设
export type CropRatio = 'free' | '1:1' | '4:3' | '16:9';

// 导出格式
export type ExportFormat = 'png' | 'jpg' | 'webp';
