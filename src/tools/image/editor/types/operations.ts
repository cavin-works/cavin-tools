/**
 * 图片变换类型
 */
export type TransformType =
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'resize'
  | 'watermark'
  | 'collage'
  | 'mosaic';

/**
 * 裁剪参数
 */
export interface CropParams {
  /** 裁剪区域 X 坐标（像素） */
  x: number;
  /** 裁剪区域 Y 坐标（像素） */
  y: number;
  /** 裁剪宽度（像素） */
  width: number;
  /** 裁剪高度（像素） */
  height: number;
  /** 宽高比（可选，用于锁定比例） */
  aspectRatio?: number;
}

/**
 * 旋转参数
 */
export interface RotateParams {
  /** 旋转角度（0-360 度） */
  angle: number;
}

/**
 * 翻转参数
 */
export interface FlipParams {
  /** 水平翻转 */
  horizontal: boolean;
  /** 垂直翻转 */
  vertical: boolean;
}

/**
 * 尺寸调整参数
 */
export interface ResizeParams {
  /** 目标宽度（像素，可选） */
  width?: number;
  /** 目标高度（像素，可选） */
  height?: number;
  /** 百分比缩放（1-1000，可选） */
  percentage?: number;
  /** 是否保持宽高比 */
  maintainAspect: boolean;
  /** 插值算法 */
  algorithm: 'nearest' | 'triangle' | 'catmullrom' | 'gaussian' | 'lanczos3';
}

/**
 * 预设尺寸
 */
export interface PresetSize {
  /** 名称 */
  name: string;
  /** 宽度（像素） */
  width: number;
  /** 高度（像素） */
  height: number;
}

/**
 * 水印类型
 */
export type WatermarkType = 'text' | 'image';

/**
 * 水印位置（九宫格）
 */
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

/**
 * 水印参数
 */
export interface WatermarkParams {
  /** 水印类型 */
  type: WatermarkType;
  /** 位置 */
  position: WatermarkPosition;
  /** 自定义 X 坐标（仅当 position 为 custom 时有效） */
  x?: number;
  /** 自定义 Y 坐标（仅当 position 为 custom 时有效） */
  y?: number;
  /** 透明度（0-255） */
  opacity: number;
  /** 文字水印特有参数 */
  text_options?: {
    /** 文字内容 */
    text: string;
    /** 字体大小（像素） */
    font_size: number;
    /** 字体颜色（hex） */
    color: string;
  };
  /** 图片水印特有参数 */
  image_options?: {
    /** 水印图片路径 */
    watermark_path: string;
    /** 缩放比例（0-1） */
    scale: number;
  };
}

/**
 * 导出格式

export type ExportFormat = 'jpeg' | 'png' | 'webp' | 'bmp';

/**
 * 导出格式
 */
export type ExportFormat = 'jpeg' | 'png' | 'webp' | 'bmp';

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 质量（1-100，仅 JPEG/WebP 有效） */
  quality: number;
  /** 输出路径（可选，不指定则自动生成） */
  outputPath?: string;
  /** 是否覆盖原文件 */
  overwrite?: boolean;
}

/**
 * 变换操作（用于批量处理）
 */
export interface Transform {
  /** 变换类型 */
  type: TransformType;
  /** 变换参数 */
  params: CropParams | RotateParams | FlipParams | ResizeParams | WatermarkParams | CollageParams;
}

/**
 * 拼图参数
 */
export interface CollageParams {
  /** 图片路径列表 */
  image_paths: string[];
  /** 网格行数 */
  rows: number;
  /** 网格列数 */
  columns: number;
  /** 图片间距（像素） */
  gap: number;
  /** 背景颜色（RGB元组） */
  background_color: [number, number, number];
  /** 输出宽度（可选） */
  output_width?: number | undefined;
}

/**
 * 马赛克参数
 */
export interface MosaicParams {
  /** 马赛克区域列表 */
  regions: MosaicRegion[];
  /** 马赛克块大小（像素） */
  blockSize: number;
}

/**
 * 马赛克区域
 */
export interface MosaicRegion {
  /** 区域类型 */
  regionType: 'rect' | 'ellipse' | 'brush';
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 宽度（rect/ellipse） */
  width?: number;
  /** 高度（rect/ellipse） */
  height?: number;
  /** 画笔点（brush） */
  points?: { x: number; y: number }[];
}

/**
 * 预设拼图配置
 */
export interface PresetCollage {
  /** 名称 */
  name: string;
  /** 行数 */
  rows: number;
  /** 列数 */
  columns: number;
  /** 描述 */
  description: string;
}

/**
 * 批量处理操作类型
 */
export type BatchOperationType =
  | 'resize'
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'watermark'
  | 'convert';

/**
 * 批量处理操作
 */
export interface BatchOperation {
  /** 操作类型 */
  operation_type: BatchOperationType;
  /** 操作参数（JSON字符串） */
  params: string;
}

/**
 * 批量处理参数
 */
export interface BatchParams {
  /** 图片路径列表 */
  image_paths: string[];
  /** 操作队列 */
  operations: BatchOperation[];
  /** 输出目录（可选） */
  output_dir?: string | null;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
}

/**
 * 批量处理结果
 */
export interface BatchResult {
  /** 成功处理的图片数量 */
  success_count: number;
  /** 失败的图片数量 */
  failed_count: number;
  /** 成功的图片路径 */
  success_paths: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 图片操作（用于操作队列）
 */
export interface ImageOperation {
  /** 操作ID */
  id?: string;
  /** 操作类型 */
  type: TransformType;
  /** 操作名称 */
  name: string;
  /** 操作参数 */
  params: CropParams | RotateParams | FlipParams | ResizeParams | WatermarkParams | MosaicParams | CollageParams;
}

/**
 * 处理结果
 */
export interface ProcessResult {
  /** 是否成功 */
  success: boolean;
  /** 输出路径 */
  path?: string;
  /** 错误信息 */
  error?: string;
}
