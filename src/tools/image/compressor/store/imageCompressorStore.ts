import { create } from 'zustand';
import type { CompressTask, CompressParams } from '../types';

interface ImageCompressorStore {
  // 任务列表
  tasks: CompressTask[];
  addTask: (task: CompressTask) => void;
  updateTask: (id: string, updates: Partial<CompressTask>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;

  // 压缩参数
  quality: number;
  enableResize: boolean;
  resizeWidth?: number;
  resizeHeight?: number;
  maintainAspectRatio: boolean;
  preserveMetadata: boolean;

  setQuality: (quality: number) => void;
  setEnableResize: (enable: boolean) => void;
  setResizeWidth: (width?: number) => void;
  setResizeHeight: (height?: number) => void;
  setMaintainAspectRatio: (maintain: boolean) => void;
  setPreserveMetadata: (preserve: boolean) => void;

  // 获取压缩参数（需要原格式作为参数）
  getCompressParams: (originalFormat: string) => CompressParams;

  // 批量压缩状态
  isBatchProcessing: boolean;
  batchProgress: number;
  setBatchProcessing: (processing: boolean) => void;
  setBatchProgress: (progress: number) => void;
}

export const useImageCompressorStore = create<ImageCompressorStore>((set, get) => ({
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

  // 压缩参数
  quality: 85,
  enableResize: false,
  resizeWidth: undefined,
  resizeHeight: undefined,
  maintainAspectRatio: true,
  preserveMetadata: false,

  setQuality: (quality) => set({ quality }),
  setEnableResize: (enable) => set({ enableResize: enable }),
  setResizeWidth: (width) => set({ resizeWidth: width }),
  setResizeHeight: (height) => set({ resizeHeight: height }),
  setMaintainAspectRatio: (maintain) => set({ maintainAspectRatio: maintain }),
  setPreserveMetadata: (preserve) => set({ preserveMetadata: preserve }),

  getCompressParams: (originalFormat: string) => {
    const state = get();
    return {
      targetFormat: originalFormat, // 保持原格式
      quality: state.quality,
      resize: state.enableResize ? {
        width: state.resizeWidth,
        height: state.resizeHeight,
        maintainAspectRatio: state.maintainAspectRatio,
      } : undefined,
      preserveMetadata: state.preserveMetadata,
    };
  },

  // 批量压缩状态
  isBatchProcessing: false,
  batchProgress: 0,
  setBatchProcessing: (processing) => set({ isBatchProcessing: processing }),
  setBatchProgress: (progress) => set({ batchProgress: progress }),
}));
