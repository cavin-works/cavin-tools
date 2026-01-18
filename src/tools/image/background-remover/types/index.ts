// 模型信息
export interface ModelInfo {
  downloaded: boolean;
  path?: string;
  size?: number;
  version: string;
}

// 下载状态
export type DownloadStatus = 'preparing' | 'downloading' | 'verifying' | 'completed' | 'failed';

// 下载进度
export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  status: DownloadStatus;
}

// 图片尺寸
export interface Dimensions {
  width: number;
  height: number;
}

// 处理状态
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 去背景结果
export interface RemoveBackgroundResult {
  outputPath: string;
  originalSize: number;
  processedSize: number;
  processingTimeMs: number;
  base64Data?: string;
  originalDimensions: Dimensions;
}

// 去背景参数
export interface RemoveBackgroundParams {
  outputFormat: 'png' | 'webp';
  returnBase64: boolean;
  feather: number;
  backgroundColor?: string;
}

// 处理任务
export interface BackgroundRemoveTask {
  id: string;
  inputPath: string;
  filename: string;
  format: string;
  originalSize: number;
  width: number;
  height: number;
  status: ProcessStatus;
  progress: number;
  error?: string;
  result?: RemoveBackgroundResult;
}

// 批量进度事件
export interface BatchProgressEvent {
  current: number;
  total: number;
  percentage: number;
}
