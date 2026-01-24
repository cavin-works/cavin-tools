import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ColorThemeId,
  DEFAULT_COLOR_THEME,
  applyColorTheme,
} from '../theme/themeConfig';
import type { UpdateInfo, DownloadProgress, UpdateStatus } from '@/lib/updateUtils';

/**
 * 应用设置
 */
interface AppSettings {
  /** 自动保存 */
  autoSave: boolean;
  /** 显示通知 */
  showNotifications: boolean;
  /** 默认工具 ID */
  defaultTool?: string;
}

/**
 * 全局应用状态接口
 */
interface AppState {
  /** 当前选中的工具 ID */
  currentToolId: string | null;
  /** 设置当前工具 */
  setCurrentToolId: (toolId: string | null) => void;

  /** 更新状态 */
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  updateStatus: UpdateStatus;
  updateProgress: DownloadProgress;

  /** 对话框状态 */
  showUpdateDialog: boolean;
  showUpdateCompleteDialog: boolean;

  /** 更新操作 */
  setUpdateAvailable: (available: boolean, info?: UpdateInfo) => void;
  setUpdateStatus: (status: UpdateStatus) => void;
  setUpdateProgress: (progress: DownloadProgress) => void;
  setShowUpdateDialog: (show: boolean) => void;
  setShowUpdateCompleteDialog: (show: boolean) => void;
  clearUpdate: () => void;
  skipCurrentVersion: () => void;

  /** 最近使用的工具 ID 列表 */
  recentTools: string[];
  /** 添加最近使用的工具 */
  addRecentTool: (toolId: string) => void;

  /** 主题模式 (亮/暗/跟随系统) */
  theme: 'light' | 'dark' | 'system';
  /** 设置主题模式 */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  /** 配色主题 (独立于明暗模式) */
  colorTheme: ColorThemeId;
  /** 设置配色主题 */
  setColorTheme: (colorTheme: ColorThemeId) => void;

  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 切换侧边栏状态 */
  toggleSidebar: () => void;

  /** 是否显示设置页面 */
  showSettings: boolean;
  /** 设置是否显示设置页面 */
  setShowSettings: (show: boolean) => void;

  /** 应用设置 */
  settings: AppSettings;
  /** 更新应用设置 */
  updateSettings: (settings: Partial<AppSettings>) => void;
}

/**
 * 全局应用状态管理
 *
 * 使用 Zustand + persist 中间件，状态会持久化到 localStorage
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 当前工具
      currentToolId: null,
      setCurrentToolId: (toolId) => {
        set({ currentToolId: toolId });
        // 自动添加到最近使用
        if (toolId) {
          get().addRecentTool(toolId);
        }
      },

      // 更新状态
      updateAvailable: false,
      updateInfo: null,
      updateStatus: 'idle',
      updateProgress: { downloaded: 0, total: 0, percentage: 0 },

      // 对话框状态
      showUpdateDialog: false,
      showUpdateCompleteDialog: false,

      // 更新操作
      setUpdateAvailable: (available, info) =>
        set({ updateAvailable: available, updateInfo: info || null }),
      setUpdateStatus: (status) => set({ updateStatus: status }),
      setUpdateProgress: (progress) => set({ updateProgress: progress }),
      setShowUpdateDialog: (show) => set({ showUpdateDialog: show }),
      setShowUpdateCompleteDialog: (show) => set({ showUpdateCompleteDialog: show }),
      clearUpdate: () => set({
        updateAvailable: false,
        updateInfo: null,
        updateStatus: 'idle',
        updateProgress: { downloaded: 0, total: 0, percentage: 0 },
      }),
      skipCurrentVersion: () => {
        const { updateInfo } = get();
        if (updateInfo) {
          try {
            localStorage.setItem('cavin-tools-skipped-version', updateInfo.version);
          } catch (error) {
            console.error('保存跳过版本失败:', error);
          }
          set({
            showUpdateDialog: false,
            updateAvailable: false,
          });
        }
      },

      // 最近使用
      recentTools: [],
      addRecentTool: (toolId) => {
        set((state) => ({
          recentTools: [
            toolId,
            ...state.recentTools.filter((id) => id !== toolId),
          ].slice(0, 10), // 保留最近 10 个
        }));
      },

      // 主题模式 (亮/暗)
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // 配色主题
      colorTheme: DEFAULT_COLOR_THEME,
      setColorTheme: (colorTheme) => {
        set({ colorTheme });
        // 立即应用到 DOM
        applyColorTheme(colorTheme);
      },

      // 侧边栏
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // 设置页面
      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),

      // 应用设置
      settings: {
        autoSave: true,
        showNotifications: true,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'app-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化这些字段
        recentTools: state.recentTools,
        theme: state.theme,
        colorTheme: state.colorTheme,
        settings: state.settings,
      }),
      onRehydrateStorage: () => {
        // 状态恢复后，应用保存的配色主题
        return (state) => {
          if (state?.colorTheme) {
            applyColorTheme(state.colorTheme);
          }
        };
      },
    }
  )
);
