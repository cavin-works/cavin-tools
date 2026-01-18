import { create } from 'zustand';
import type { BackgroundRemoveTask, RemoveBackgroundParams, ModelInfo } from '../types';

interface BackgroundRemoverStore {
  // 模型状态
  modelInfo: ModelInfo | null;
  isDownloading: boolean;
  downloadProgress: number;
  setModelInfo: (info: ModelInfo | null) => void;
  setIsDownloading: (downloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;

  // 任务列表
  tasks: BackgroundRemoveTask[];
  addTask: (task: BackgroundRemoveTask) => void;
  updateTask: (id: string, updates: Partial<BackgroundRemoveTask>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;

  // 去背景参数
  outputFormat: 'png' | 'webp';
  feather: number;
  backgroundColor: string;
  setOutputFormat: (format: 'png' | 'webp') => void;
  setFeather: (feather: number) => void;
  setBackgroundColor: (color: string) => void;
  getRemoveParams: () => RemoveBackgroundParams;

  // 预览相关
  selectedTaskId: string | null;
  setSelectedTask: (id: string | null) => void;

  // 批量处理状态
  isBatchProcessing: boolean;
  batchProgress: number;
  setBatchProcessing: (processing: boolean) => void;
  setBatchProgress: (progress: number) => void;
}

export const useBackgroundRemoverStore = create<BackgroundRemoverStore>((set, get) => ({
  // 模型状态
  modelInfo: null,
  isDownloading: false,
  downloadProgress: 0,
  setModelInfo: (info) => set({ modelInfo: info }),
  setIsDownloading: (downloading) => set({ isDownloading: downloading }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),

  // 任务列表
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
    selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
  })),
  clearTasks: () => set({ tasks: [], selectedTaskId: null }),

  // 去背景参数
  outputFormat: 'png',
  feather: 0,
  backgroundColor: 'transparent',
  setOutputFormat: (format) => set({ outputFormat: format }),
  setFeather: (feather) => set({ feather }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  getRemoveParams: () => {
    const state = get();
    return {
      outputFormat: state.outputFormat,
      returnBase64: false,
      feather: state.feather,
      backgroundColor: state.backgroundColor === 'transparent' ? undefined : state.backgroundColor,
    };
  },

  // 预览相关
  selectedTaskId: null,
  setSelectedTask: (id) => set({ selectedTaskId: id }),

  // 批量处理状态
  isBatchProcessing: false,
  batchProgress: 0,
  setBatchProcessing: (processing) => set({ isBatchProcessing: processing }),
  setBatchProgress: (progress) => set({ batchProgress: progress }),
}));
