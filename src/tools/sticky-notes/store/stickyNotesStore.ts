import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  TodoTask,
  TodoConfig,
  TodoStatus,
  TodoPriority,
  TodoStoreData,
  WidgetPosition,
} from '../types';
import { DEFAULT_CONFIG } from '../types';

interface TodoState {
  // 数据状态
  tasks: TodoTask[];
  config: TodoConfig;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  // UI 状态
  filter: 'all' | 'pending' | 'completed';

  // 数据操作
  loadTasks: () => Promise<void>;
  saveTasks: () => Promise<void>;

  // 任务操作
  addTask: (title: string, priority?: TodoPriority) => Promise<TodoTask>;
  updateTask: (id: string, updates: Partial<TodoTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;

  // 小部件操作
  updateWidgetPosition: (position: WidgetPosition) => Promise<void>;
  updateWidgetSize: (width: number, height: number) => Promise<void>;
  updateWidgetOpacity: (opacity: number) => Promise<void>;
  setDesktopMode: (enabled: boolean) => Promise<void>;
  setPinned: (pinned: boolean) => Promise<void>;
  togglePin: () => Promise<void>;
  showWidget: () => Promise<void>;
  hideWidget: () => Promise<void>;

  // 配置操作
  updateConfig: (updates: Partial<TodoConfig>) => Promise<void>;

  // UI 操作
  setFilter: (filter: 'all' | 'pending' | 'completed') => void;
  setError: (error: string | null) => void;

  // 工具方法
  getFilteredTasks: () => TodoTask[];
  getPendingCount: () => number;
  getCompletedCount: () => number;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  // 初始状态
  tasks: [],
  config: DEFAULT_CONFIG,
  isLoading: false,
  error: null,
  initialized: false,
  filter: 'all',

  // 加载任务数据
  loadTasks: async () => {
    const { isLoading, initialized } = get();
    if (isLoading || initialized) return;

    set({ isLoading: true, error: null });

    try {
      const data = await invoke<TodoStoreData>('load_sticky_notes');
      if (data) {
        set({
          tasks: (data as any).tasks || [],
          config: (data as any).config || DEFAULT_CONFIG,
          initialized: true,
        });
      } else {
        set({
          tasks: [],
          config: DEFAULT_CONFIG,
          initialized: true,
        });
      }
    } catch (err) {
      set({
        tasks: [],
        config: DEFAULT_CONFIG,
        initialized: true,
      });
      console.warn('加载任务数据失败，使用默认配置:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // 保存任务数据
  saveTasks: async () => {
    const { tasks, config } = get();
    try {
      await invoke('save_sticky_notes', {
        data: {
          tasks,
          config,
          version: 1,
        } as TodoStoreData,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({ error: `保存失败: ${errorMessage}` });
      throw err;
    }
  },

  // 添加任务
  addTask: async (title, priority = 'medium') => {
    const { tasks, saveTasks } = get();
    const now = Date.now();
    const newTask: TodoTask = {
      id: `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      status: 'pending',
      priority,
      createdAt: now,
    };

    const updatedTasks = [newTask, ...tasks];
    set({ tasks: updatedTasks });
    await saveTasks();

    return newTask;
  },

  // 更新任务
  updateTask: async (id, updates) => {
    const { tasks, saveTasks } = get();
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    );
    set({ tasks: updatedTasks });
    await saveTasks();
  },

  // 删除任务
  deleteTask: async (id) => {
    const { tasks, saveTasks } = get();
    const updatedTasks = tasks.filter((task) => task.id !== id);
    set({ tasks: updatedTasks });
    await saveTasks();
  },

  // 切换任务状态
  toggleTask: async (id) => {
    const { tasks, updateTask } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TodoStatus = task.status === 'pending' ? 'completed' : 'pending';
    await updateTask(id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? Date.now() : undefined,
    });
  },

  // 清除已完成任务
  clearCompleted: async () => {
    const { tasks, saveTasks } = get();
    const updatedTasks = tasks.filter((task) => task.status !== 'completed');
    set({ tasks: updatedTasks });
    await saveTasks();
  },

  // 更新小部件位置
  updateWidgetPosition: async (position) => {
    const { config, updateConfig } = get();
    await updateConfig({
      widget: { ...config.widget, position },
    });
    await invoke('update_note_window_state', {
      noteId: 'todo-widget',
      state: { ...config.widget, position },
    });
  },

  // 更新小部件大小
  updateWidgetSize: async (width, height) => {
    const { config, updateConfig } = get();
    await updateConfig({
      widget: { ...config.widget, width, height },
    });
  },

  // 更新小部件透明度
  updateWidgetOpacity: async (opacity) => {
    const { config, updateConfig } = get();
    await updateConfig({
      widget: { ...config.widget, opacity },
    });
  },

  // 设置桌面嵌入模式
  setDesktopMode: async (enabled) => {
    const { config, updateConfig } = get();
    await updateConfig({
      widget: { ...config.widget, isDesktopMode: enabled },
    });
    await invoke('update_note_window_state', {
      noteId: 'todo-widget',
      state: { ...config.widget, isDesktopMode: enabled },
    });
  },

  // 设置置顶
  setPinned: async (pinned) => {
    const { config, updateConfig } = get();
    await updateConfig({
      widget: { ...config.widget, isPinned: pinned },
    });
    await invoke('update_note_window_state', {
      noteId: 'todo-widget',
      state: { ...config.widget, isPinned: pinned },
    });
  },

  // 切换置顶
  togglePin: async () => {
    const { config, setPinned } = get();
    await setPinned(!config.widget.isPinned);
  },

  // 显示小部件
  showWidget: async () => {
    try {
      const { config } = get();
      await invoke('detach_note_window', {
        noteId: 'todo-widget',
        windowState: {
          x: config.widget.position.x,
          y: config.widget.position.y,
          width: config.widget.width,
          height: config.widget.height,
          isDetached: true,
          isPinned: config.widget.isPinned,
          isDesktopMode: config.widget.isDesktopMode,
          opacity: config.widget.opacity,
        },
      });
    } catch (err) {
      console.error('显示小部件失败:', err);
    }
  },

  // 隐藏小部件
  hideWidget: async () => {
    try {
      await invoke('show_hide_all_notes', { visible: false });
    } catch (err) {
      console.error('隐藏小部件失败:', err);
    }
  },

  // 更新配置
  updateConfig: async (updates) => {
    const { config, saveTasks } = get();
    const updatedConfig = { ...config, ...updates };
    set({ config: updatedConfig });
    await saveTasks();
  },

  // 设置筛选
  setFilter: (filter) => {
    set({ filter });
  },

  // 设置错误
  setError: (error) => {
    set({ error });
  },

  // 获取筛选后的任务
  getFilteredTasks: () => {
    const { tasks, filter } = get();

    if (filter === 'all') {
      return tasks;
    }
    return tasks.filter((task) => task.status === filter);
  },

  // 获取待办数量
  getPendingCount: () => {
    const { tasks } = get();
    return tasks.filter((t) => t.status === 'pending').length;
  },

  // 获取已完成数量
  getCompletedCount: () => {
    const { tasks } = get();
    return tasks.filter((t) => t.status === 'completed').length;
  },
}));

// 监听全局快捷键事件
if (typeof window !== 'undefined') {
  // 快速添加任务
  listen('quick-create-note', () => {
    window.dispatchEvent(new CustomEvent('todo:quick-add'));
  });

  // 切换置顶
  listen('toggle-pin-all-notes-shortcut', () => {
    const { togglePin } = useTodoStore.getState();
    togglePin();
  });

  // 显示/隐藏
  listen('show-hide-all-notes-shortcut', () => {
    const { showWidget } = useTodoStore.getState();
    // 简单切换显示/隐藏
    showWidget();
  });
}
