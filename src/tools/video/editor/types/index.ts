// 导出 timeline 类型
export * from './timeline';

// 视频信息
export interface VideoInfo {
  path: string;
  filename: string;
  duration: number; // 秒
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  fileSize: number;
  format: string;
}

// 操作类型
export type OperationType = 'compress' | 'speed' | 'extract_frames' | 'trim' | 'to_gif';

// 压缩预设
export type CompressPreset = 'mobile' | 'web' | 'high_quality' | 'custom';

// 压缩参数
export interface CompressParams {
  preset: CompressPreset;
  resolution?: {
    width: number;
    height: number;
  };
  bitrate?: number;
  crf?: number;
  codec?: 'h264' | 'h265' | 'vp9';
  fps?: number;
}

// 变速参数
export interface SpeedParams {
  speed: number; // 0.25 - 4.0
  preservePitch: boolean;
}

// 提取帧模式
export type ExtractMode = 'single' | 'interval' | 'uniform';

// 提取帧参数
export interface ExtractFramesParams {
  mode: ExtractMode;
  format: 'jpg' | 'png' | 'webp';
  quality: number;
  interval?: number; // 秒
  count?: number; // 帧数
}

// 截断参数
export interface TrimParams {
  startTime: number;
  endTime: number;
  precise: boolean; // 是否精确截断(重新编码)
}

// 转GIF参数
export interface ToGifParams {
  startTime: number;
  endTime: number;
  fps: number;
  width: number;
  colors: number;
  dither: boolean;
}

// 操作历史
export interface Operation {
  id: string;
  type: OperationType;
  inputPath: string;
  outputPath: string;
  params: CompressParams | SpeedParams | ExtractFramesParams | TrimParams | ToGifParams;
  timestamp: number;
  duration: number; // 处理耗时(毫秒)
}

// 进度事件
export interface ProgressEvent {
  progress: number; // 0-100
  currentPhase: string;
}
