import { create } from 'zustand';
import type { ConvertTask, ConvertParams, ImageFormat } from '../types';

interface ImageConverterStore {
  // 任务列表
  tasks: ConvertTask[];
  addTask: (task: ConvertTask) => void;
  updateTask: (id: string, updates: Partial<ConvertTask>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;

  // 转换参数
  targetFormat: ImageFormat;
  quality: number;
  enableResize: boolean;
  resizeWidth?: number;
  resizeHeight?: number;
  maintainAspectRatio: boolean;
  preserveMetadata: boolean;

  setTargetFormat: (format: ImageFormat) => void;
  setQuality: (quality: number) => void;
  setEnableResize: (enable: boolean) => void;
  setResizeWidth: (width?: number) => void;
  setResizeHeight: (height?: number) => void;
  setMaintainAspectRatio: (maintain: boolean) => void;
  setPreserveMetadata: (preserve: boolean) => void;

  // 获取当前转换参数
  getConvertParams: () => ConvertParams;

  // 批量转换状态
  isBatchProcessing: boolean;
  batchProgress: number;
  setBatchProcessing: (processing: boolean) => void;
  setBatchProgress: (progress: number) => void;
}

export const useImageConverterStore = create<ImageConverterStore>((set, get) => ({
  // 任务列表
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
  clearTasks: () => set({ tasks: [] }),

  // 转换参数
  targetFormat: 'png',
  quality: 85,
  enableResize: false,
  resizeWidth: undefined,
  resizeHeight: undefined,
  maintainAspectRatio: true,
  preserveMetadata: false,

  setTargetFormat: (format) => set({ targetFormat: format }),
  setQuality: (quality) => set({ quality }),
  setEnableResize: (enable) => set({ enableResize: enable }),
  setResizeWidth: (width) => set({ resizeWidth: width }),
  setResizeHeight: (height) => set({ resizeHeight: height }),
  setMaintainAspectRatio: (maintain) => set({ maintainAspectRatio: maintain }),
  setPreserveMetadata: (preserve) => set({ preserveMetadata: preserve }),

  getConvertParams: () => {
    const state = get();
    return {
      targetFormat: state.targetFormat,
      quality: ['jpg', 'webp', 'png'].includes(state.targetFormat) ? state.quality : undefined,
      resize: state.enableResize ? {
        width: state.resizeWidth,
        height: state.resizeHeight,
        maintainAspectRatio: state.maintainAspectRatio,
      } : undefined,
      preserveMetadata: false, // 格式转换工具不关注元数据，统一不保留
    };
  },

  // 批量转换状态
  isBatchProcessing: false,
  batchProgress: 0,
  setBatchProcessing: (processing) => set({ isBatchProcessing: processing }),
  setBatchProgress: (progress) => set({ batchProgress: progress }),
}));
