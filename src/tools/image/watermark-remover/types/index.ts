// 水印信息
export interface WatermarkInfo {
  detected: boolean;
  watermarkSize: number;
  regionX: number;
  regionY: number;
  marginRight: number;
  marginBottom: number;
}

// 图片信息（复用现有类型）
export interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  colorType: string;
}

// 处理状态
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 处理任务
export interface RemoveTask {
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
  result?: RemoveResult;
}

// 去水印结果
export interface RemoveResult {
  outputPath: string;
  originalSize: number;
  processedSize: number;
  watermarkDetected: boolean;
  watermarkInfo?: WatermarkInfo;
}

// 去水印参数
export interface RemoveParams {
  autoDetect: boolean;
  manualSize?: number;
}

// 批量进度事件
export interface BatchProgressEvent {
  current: number;
  total: number;
  percentage: number;
}
