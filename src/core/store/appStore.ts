import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  /** 最近使用的工具 ID 列表 */
  recentTools: string[];
  /** 添加最近使用的工具 */
  addRecentTool: (toolId: string) => void;

  /** 主题设置 */
  theme: 'light' | 'dark' | 'system';
  /** 设置主题 */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

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

      // 主题
      theme: 'system',
      setTheme: (theme) => set({ theme }),

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
        settings: state.settings,
      }),
    }
  )
);
