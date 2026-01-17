import { create } from 'zustand';
import type { RemoveTask, RemoveParams } from '../types';

interface WatermarkRemoverStore {
  // 任务列表
  tasks: RemoveTask[];
  addTask: (task: RemoveTask) => void;
  updateTask: (id: string, updates: Partial<RemoveTask>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;

  // 去水印参数
  autoDetect: boolean;
  manualSize?: number;
  setAutoDetect: (auto: boolean) => void;
  setManualSize: (size?: number) => void;
  getRemoveParams: () => RemoveParams;

  // 预览相关
  selectedTaskId: string | null;
  setSelectedTask: (id: string | null) => void;

  // 批量处理状态
  isBatchProcessing: boolean;
  batchProgress: number;
  setBatchProcessing: (processing: boolean) => void;
  setBatchProgress: (progress: number) => void;
}

export const useWatermarkRemoverStore = create<WatermarkRemoverStore>((set, get) => ({
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

  // 去水印参数
  autoDetect: true,
  manualSize: undefined,
  setAutoDetect: (auto) => set({ autoDetect: auto }),
  setManualSize: (size) => set({ manualSize: size }),
  getRemoveParams: () => {
    const state = get();
    return {
      autoDetect: state.autoDetect,
      manualSize: state.manualSize,
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
