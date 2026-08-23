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
}

// 默认编辑参数（数值 0 / 开关 false 均为"无操作"，后端会跳过）
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
};

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
