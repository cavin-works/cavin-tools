import { create } from 'zustand';
import type {
  ImageInfo,
  CropParams,
  RotateParams,
  FlipParams,
  ResizeParams,
  WatermarkParams,
  ExportOptions,
} from '../types';
import type { Crop, PixelCrop } from 'react-image-crop';

interface ImageStore {
  // ========== 当前图片 ==========
  /** 当前正在编辑的图片 */
  currentImage: ImageInfo | null;
  /** 设置当前图片 */
  setCurrentImage: (image: ImageInfo | null) => void;

  // ========== 变换状态 ==========
  /** 裁剪参数 */
  crop: CropParams | null;
  /** 旋转参数 */
  rotate: RotateParams | null;
  /** 翻转参数 */
  flip: FlipParams | null;
  /** 尺寸调整参数 */
  resize: ResizeParams | null;
  /** 水印参数 */
  watermark: WatermarkParams | null;

  // ========== 交互式裁剪 ==========
  /** 是否处于交互式裁剪模式 */
  isCropMode: boolean;
  /** 设置交互式裁剪模式 */
  setCropMode: (enabled: boolean) => void;

  // ========== react-image-crop 裁剪状态 ==========
  /** 裁剪区域状态 */
  reactCrop: Crop | null;
  /** 已完成的裁剪区域（像素） */
  completedCrop: PixelCrop | null;
  /** 更新裁剪状态 */
  setReactCrop: (crop: Crop | null) => void;
  /** 更新完成裁剪状态 */
  setCompletedCrop: (crop: PixelCrop | null) => void;

  /** 设置变换参数 */
  setTransform: <T extends CropParams | RotateParams | FlipParams | ResizeParams | WatermarkParams>(
    type: 'crop' | 'rotate' | 'flip' | 'resize' | 'watermark',
    params: T | null
  ) => void;

  /** 重置所有变换 */
  resetTransforms: () => void;

  /** 获取所有已应用的变换 */
  getAppliedTransforms: () => Array<{
    type: string;
    params: any;
  }>;

  // ========== 批量处理 ==========
  /** 是否为批量模式 */
  batchMode: boolean;
  /** 批量处理的图片列表 */
  batchImages: ImageInfo[];
  /** 当前选中的批量图片索引 */
  selectedBatchIndex: number;
  /** 设置批量模式 */
  setBatchMode: (enabled: boolean) => void;
  /** 设置批量图片列表 */
  setBatchImages: (images: ImageInfo[]) => void;
  /** 设置选中的批量图片 */
  setSelectedBatchIndex: (index: number) => void;

  // ========== 导出设置 ==========
  /** 导出选项 */
  exportOptions: ExportOptions;
  /** 设置导出选项 */
  setExportOptions: (options: Partial<ExportOptions>) => void;

  // ========== 处理状态 ==========
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 处理进度（0-100） */
  progress: number;
  /** 当前操作描述 */
  currentOperation: string;
  /** 设置处理状态 */
  setProcessing: (isProcessing: boolean) => void;
  /** 设置进度 */
  setProgress: (progress: number) => void;
  /** 设置当前操作 */
  setCurrentOperation: (operation: string) => void;

  // ========== 历史记录 ==========
  /** 操作历史 */
  history: Array<{
    timestamp: number;
    type: string;
    description: string;
  }>;
  /** 添加到历史记录 */
  addHistory: (type: string, description: string) => void;
  /** 清空历史记录 */
  clearHistory: () => void;

  // ========== 错误处理 ==========
  /** 错误信息 */
  error: string | null;
  /** 设置错误信息 */
  setError: (error: string | null) => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  // ========== 当前图片 ==========
  currentImage: null,
  setCurrentImage: (image) => set({ currentImage: image }),

  // ========== 变换状态 ==========
  crop: null,
  rotate: null,
  flip: null,
  resize: null,
  watermark: null,

  // ========== 交互式裁剪 ==========
  isCropMode: false,
  reactCrop: null,
  completedCrop: null,

  setCropMode: (enabled) => set({ isCropMode: enabled }),
  setReactCrop: (crop) => set({ reactCrop: crop }),
  setCompletedCrop: (crop) => set({ completedCrop: crop }),

  setTransform: (type, params) => {
    set({ [type]: params });
    // 添加到历史记录
    if (params) {
      get().addHistory(type, `应用 ${type} 变换`);
    }
  },

  resetTransforms: () => {
    set({
      crop: null,
      rotate: null,
      flip: null,
      resize: null,
      watermark: null,
    });
    get().addHistory('reset', '重置所有变换');
  },

  getAppliedTransforms: () => {
    const state = get();
    const transforms: Array<{ type: string; params: any }> = [];

    if (state.crop) transforms.push({ type: 'crop', params: state.crop });
    if (state.rotate) transforms.push({ type: 'rotate', params: state.rotate });
    if (state.flip) transforms.push({ type: 'flip', params: state.flip });
    if (state.resize) transforms.push({ type: 'resize', params: state.resize });
    if (state.watermark) transforms.push({ type: 'watermark', params: state.watermark });

    return transforms;
  },

  // ========== 批量处理 ==========
  batchMode: false,
  batchImages: [],
  selectedBatchIndex: 0,

  setBatchMode: (enabled) => set({ batchMode: enabled }),
  setBatchImages: (images) => set({ batchImages: images }),
  setSelectedBatchIndex: (index) => set({ selectedBatchIndex: index }),

  // ========== 导出设置 ==========
  exportOptions: {
    format: 'jpeg',
    quality: 85,
    overwrite: false,
  },

  setExportOptions: (options) =>
    set((state) => ({
      exportOptions: { ...state.exportOptions, ...options },
    })),

  // ========== 处理状态 ==========
  isProcessing: false,
  progress: 0,
  currentOperation: '',

  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
  setCurrentOperation: (operation) => set({ currentOperation: operation }),

  // ========== 历史记录 ==========
  history: [],

  addHistory: (type, description) => {
    set((state) => ({
      history: [
        ...state.history,
        {
          timestamp: Date.now(),
          type,
          description,
        },
      ].slice(-50), // 只保留最近 50 条
    }));
  },

  clearHistory: () => set({ history: [] }),

  // ========== 错误处理 ==========
  error: null,
  setError: (error) => set({ error }),
}));
