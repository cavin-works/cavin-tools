/**
 * Todo 任务状态
 */
export type TodoStatus = 'pending' | 'completed';

/**
 * Todo 任务优先级
 */
export type TodoPriority = 'low' | 'medium' | 'high';

/**
 * Todo 任务实体
 */
export interface TodoTask {
  /** 任务唯一标识 */
  id: string;
  /** 任务标题 */
  title: string;
  /** 任务状态 */
  status: TodoStatus;
  /** 优先级 */
  priority: TodoPriority;
  /** 创建时间戳 */
  createdAt: number;
  /** 完成时间戳 */
  completedAt?: number;
}

/**
 * 小部件位置配置
 */
export interface WidgetPosition {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
}

/**
 * 预设主题
 */
export type WidgetTheme = 'dark' | 'light' | 'blue' | 'purple' | 'green' | 'orange' | 'custom';

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  /** 背景色 */
  background: string;
  /** 文字颜色 */
  text: string;
  /** 次要文字颜色 */
  textSecondary: string;
  /** 边框颜色 */
  border: string;
  /** 强调色（主色） */
  accent: string;
}

/**
 * 小部件配置
 */
export interface TodoWidgetConfig {
  /** 小部件位置 */
  position: WidgetPosition;
  /** 小部件宽度 */
  width: number;
  /** 小部件高度 */
  height: number;
  /** 透明度 */
  opacity: number;
  /** 是否嵌入桌面模式 */
  isDesktopMode: boolean;
  /** 是否置顶显示 */
  isPinned: boolean;
  /** 主题 */
  theme: WidgetTheme;
  /** 自定义主题颜色（仅当 theme 为 'custom' 时使用） */
  customColors?: ThemeColors;
}

/**
 * 全局 Todo 配置
 */
export interface TodoConfig {
  /** 小部件配置 */
  widget: TodoWidgetConfig;
  /** 快捷键配置 */
  hotkeys: {
    /** 切换显示/隐藏 */
    toggle: string;
    /** 置顶/取消置顶 */
    togglePin: string;
    /** 快速添加任务 */
    quickAdd: string;
  };
}

/**
 * Todo 存储数据结构
 */
export interface TodoStoreData {
  /** 所有任务 */
  tasks: TodoTask[];
  /** 全局配置 */
  config: TodoConfig;
  /** 数据版本号 */
  version: number;
}

/**
 * 预设主题颜色
 */
export const WIDGET_THEMES: Record<Exclude<WidgetTheme, 'custom'>, ThemeColors> = {
  dark: {
    background: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: 'rgba(255, 255, 255, 0.1)',
    accent: '#3b82f6',
  },
  light: {
    background: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: 'rgba(0, 0, 0, 0.1)',
    accent: '#3b82f6',
  },
  blue: {
    background: '#1e3a5f',
    text: '#ffffff',
    textSecondary: '#a5b4c4',
    border: 'rgba(255, 255, 255, 0.15)',
    accent: '#60a5fa',
  },
  purple: {
    background: '#2d1f3d',
    text: '#ffffff',
    textSecondary: '#b8a5c4',
    border: 'rgba(255, 255, 255, 0.15)',
    accent: '#a78bfa',
  },
  green: {
    background: '#1a2e1a',
    text: '#ffffff',
    textSecondary: '#a5c4a5',
    border: 'rgba(255, 255, 255, 0.15)',
    accent: '#4ade80',
  },
  orange: {
    background: '#3d2a1f',
    text: '#ffffff',
    textSecondary: '#c4b4a5',
    border: 'rgba(255, 255, 255, 0.15)',
    accent: '#fb923c',
  },
};

/**
 * 主题显示名称
 */
export const THEME_LABELS: Record<WidgetTheme, string> = {
  dark: '深色',
  light: '浅色',
  blue: '蓝色',
  purple: '紫色',
  green: '绿色',
  orange: '橙色',
  custom: '自定义',
};

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: TodoConfig = {
  widget: {
    position: { x: 100, y: 100 },
    width: 320,
    height: 400,
    opacity: 0.9,
    isDesktopMode: true,
    isPinned: false,
    theme: 'dark',
  },
  hotkeys: {
    toggle: 'CommandOrControl+Alt+T',
    togglePin: 'CommandOrControl+Alt+P',
    quickAdd: 'CommandOrControl+Alt+N',
  },
};

/**
 * 优先级颜色
 */
export const PRIORITY_COLORS: Record<TodoPriority, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
};

/**
 * 优先级标签
 */
export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};
