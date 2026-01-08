import { create } from 'zustand';
import type { VideoInfo, Operation } from '../types';

interface VideoStore {
  // 当前视频信息
  currentVideo: VideoInfo | null;
  setCurrentVideo: (video: VideoInfo | null) => void;

  // 时间轴状态
  timelineStart: number;
  timelineEnd: number;
  currentTime: number;
  setTimelineRegion: (start: number, end: number) => void;
  setCurrentTime: (time: number) => void;

  // 处理状态
  isProcessing: boolean;
  progress: number;
  currentOperation: string;
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: number) => void;
  setOperation: (operation: string) => void;

  // 历史记录
  history: Operation[];
  addHistory: (operation: Operation) => void;

  // 错误处理
  error: string | null;
  setError: (error: string | null) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  // 当前视频
  currentVideo: null,
  setCurrentVideo: (video) => set({ currentVideo: video }),

  // 时间轴
  timelineStart: 0,
  timelineEnd: 0,
  currentTime: 0,
  setTimelineRegion: (start, end) => set({ timelineStart: start, timelineEnd: end }),
  setCurrentTime: (time) => set({ currentTime: time }),

  // 处理状态
  isProcessing: false,
  progress: 0,
  currentOperation: '',
  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
  setOperation: (operation) => set({ currentOperation: operation }),

  // 历史记录
  history: [],
  addHistory: (operation) => set((state) => ({
    history: [...state.history, operation]
  })),

  // 错误
  error: null,
  setError: (error) => set({ error }),
}));
