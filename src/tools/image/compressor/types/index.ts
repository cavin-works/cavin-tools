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

// 压缩状态
export type CompressStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 压缩任务
export interface CompressTask {
  id: string;
  inputPath: string;
  filename: string;
  format: string;
  originalSize: number;
  width: number;
  height: number;
  status: CompressStatus;
  progress: number;
  error?: string;
  result?: CompressResult;
}

// 压缩结果
export interface CompressResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// 压缩参数
export interface CompressParams {
  targetFormat: string; // 保持原格式，传入原格式
  quality: number;
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
