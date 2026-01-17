// 图片信息
export interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  colorType: string;
}

// 支持的格式
export type ImageFormat = 'png' | 'jpg' | 'webp' | 'gif' | 'bmp' | 'tiff' | 'ico';

// 转换状态
export type ConvertStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 转换任务
export interface ConvertTask {
  id: string;
  inputPath: string;
  filename: string;
  originalFormat: string;
  targetFormat: ImageFormat;
  status: ConvertStatus;
  progress: number;
  error?: string;
  result?: ConvertResult;
}

// 转换结果
export interface ConvertResult {
  outputPath: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
}

// 转换参数
export interface ConvertParams {
  targetFormat: ImageFormat;
  quality?: number;
  resize?: ResizeParams;
  preserveMetadata: boolean;
}

// 缩放参数
export interface ResizeParams {
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

// 批量进度事件
export interface BatchProgressEvent {
  current: number;
  total: number;
  percentage: number;
}
