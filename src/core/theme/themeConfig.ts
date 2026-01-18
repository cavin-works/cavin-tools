/**
 * 统一主题颜色配置
 * 所有工具页面都应使用此配置中的颜色
 *
 * 核心设计原则:
 * - DRY: 避免在多个组件中重复定义颜色
 * - SOLID-S: 单一职责 - 颜色配置由专门的模块管理
 * - KISS: 使用简单直观的 Tailwind CSS 类名映射
 */

/**
 * 主题颜色配置
 * 统一使用蓝色系列作为主色，与侧边栏保持一致
 */
export const themeColors = {
  /**
   * 主色 - 与侧边栏一致 (bg-blue-500)
   * 用于: 主要按钮、活动状态、主要交互元素
   */
  primary: {
    base: 'blue-500',
    hover: 'blue-600',
    active: 'blue-700',
    light: 'blue-400',

    // 完整的 Tailwind 类名
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-600',
    bgActive: 'active:bg-blue-700',
    text: 'text-blue-500',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
    accent: 'accent-blue-500',
  },

  /**
   * 按钮颜色
   */
  button: {
    /** 主按钮 - 蓝色 */
    primary: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400 transition-colors',

    /** 次要按钮 - 中性灰 */
    secondary: 'bg-neutral-600 dark:bg-neutral-500 hover:bg-neutral-700 dark:hover:bg-neutral-400 text-white disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400 transition-colors',

    /** 幽灵按钮 - 透明背景 */
    ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors',
  },

  /**
   * 图标容器颜色
   */
  iconContainer: {
    /** 活动状态的图标容器 */
    active: 'bg-blue-500',

    /** 普通状态的图标容器 */
    inactive: 'bg-neutral-100 dark:bg-neutral-800',

    /** 悬停状态 */
    hover: 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
  },

  /**
   * 状态颜色
   * 保留语义化的颜色用于不同状态
   */
  status: {
    /** 成功状态 - 绿色 */
    success: 'bg-green-500 text-green-500 border-green-500',

    /** 警告状态 - 黄色/琥珀色 */
    warning: 'bg-amber-500 text-amber-500 border-amber-500',

    /** 错误状态 - 红色 (仅用于真正的危险操作) */
    error: 'bg-red-500 text-red-500 border-red-500',

    /** 信息状态 - 蓝色 */
    info: 'bg-blue-500 text-blue-500 border-blue-500',
  },

  /**
   * 渐变色
   * 用于特殊强调元素 (如 Logo)
   */
  gradient: {
    primary: 'from-blue-500 to-purple-600',
    blue: 'from-blue-400 to-blue-600',
  },
} as const;

/**
 * Tailwind CSS 类名工具函数
 * 提供类型安全的颜色类名获取方式
 */

/**
 * 获取主色背景类名
 */
export const getPrimaryBg = () => themeColors.primary.bg;

/**
 * 获取主色文本类名
 */
export const getPrimaryText = () => themeColors.primary.text;

/**
 * 获取主色边框类名
 */
export const getPrimaryBorder = () => themeColors.primary.border;

/**
 * 获取主色悬停效果
 */
export const getPrimaryHover = () => `hover:${themeColors.primary.hover}`;

/**
 * 获取按钮样式类名
 */
export const getButtonClass = (variant: 'primary' | 'secondary' | 'ghost' = 'primary'): string => {
  return themeColors.button[variant];
};

/**
 * 获取图标容器样式
 */
export const getIconContainerClass = (active: boolean = false): string => {
  return active ? themeColors.iconContainer.active : themeColors.iconContainer.inactive;
};

/**
 * 获取状态颜色
 */
export const getStatusClass = (status: 'success' | 'warning' | 'error' | 'info'): string => {
  return themeColors.status[status];
};

/**
 * 主题颜色类型定义
 */
export type ThemeColorVariant = keyof typeof themeColors.button;
export type ThemeStatus = keyof typeof themeColors.status;
