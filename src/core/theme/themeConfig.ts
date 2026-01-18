/**
 * 统一主题配色系统
 * 所有工具页面都应使用此配置中的颜色
 *
 * 核心设计原则:
 * - DRY: 避免在多个组件中重复定义颜色
 * - SOLID-S: 单一职责 - 颜色配置由专门的模块管理
 * - KISS: 使用简单直观的 Tailwind CSS 类名映射
 * - 主题切换: 支持多套配色方案和深浅模式
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

/* ============================================
   多主题配色系统
   ============================================ */

/**
 * 可用的配色主题 ID
 */
export type ColorThemeId = 'blue' | 'green' | 'orange' | 'purple' | 'gray';

/**
 * 主题元数据接口
 */
export interface ColorThemeMetadata {
  /** 主题唯一标识 */
  id: ColorThemeId;
  /** 主题显示名称 */
  name: string;
  /** 主题描述 */
  description: string;
  /** 预览色 (用于主题选择器显示) */
  previewColor: {
    light: string;  // 浅色模式的主色调
    dark: string;   // 深色模式的主色调
  };
  /** 主题特点标签 */
  tags: string[];
}

/**
 * 所有可用主题的元数据
 */
export const COLOR_THEMES: Record<ColorThemeId, ColorThemeMetadata> = {
  blue: {
    id: 'blue',
    name: '现代蓝',
    description: '蓝紫渐变，现代专业，科技感十足',
    previewColor: {
      light: 'oklch(0.488 0.243 264.376)',
      dark: 'oklch(0.488 0.243 264.376)',
    },
    tags: ['默认', '现代', '科技'],
  },
  green: {
    id: 'green',
    name: '自然绿',
    description: '森林绿调，清新自然，舒适护眼',
    previewColor: {
      light: 'oklch(0.55 0.18 150)',
      dark: 'oklch(0.58 0.18 150)',
    },
    tags: ['护眼', '自然', '清新'],
  },
  orange: {
    id: 'orange',
    name: '暖橙',
    description: '暖色调橙，温暖活力，激发创意',
    previewColor: {
      light: 'oklch(0.65 0.20 45)',
      dark: 'oklch(0.68 0.20 45)',
    },
    tags: ['温暖', '活力', '创意'],
  },
  purple: {
    id: 'purple',
    name: '高贵紫',
    description: '皇家紫调，优雅神秘，彰显高端',
    previewColor: {
      light: 'oklch(0.50 0.22 300)',
      dark: 'oklch(0.55 0.22 300)',
    },
    tags: ['优雅', '高端', '神秘'],
  },
  gray: {
    id: 'gray',
    name: '极简灰',
    description: '中性灰调，专业极简，内容为王',
    previewColor: {
      light: 'oklch(0.40 0.02 260)',
      dark: 'oklch(0.55 0.02 260)',
    },
    tags: ['极简', '专业', '中性'],
  },
};

/**
 * 默认配色主题
 */
export const DEFAULT_COLOR_THEME: ColorThemeId = 'blue';

/**
 * 应用配色主题到 DOM
 * @param themeId 主题 ID
 */
export function applyColorTheme(themeId: ColorThemeId): void {
  const root = document.documentElement;

  // 如果是默认主题，移除 data-theme 属性
  if (themeId === 'blue') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', themeId);
  }
}

/**
 * 获取当前应用的配色主题
 * @returns 当前主题 ID
 */
export function getCurrentColorTheme(): ColorThemeId {
  const root = document.documentElement;
  const themeAttr = root.getAttribute('data-theme');

  if (!themeAttr || !isValidColorTheme(themeAttr)) {
    return DEFAULT_COLOR_THEME;
  }

  return themeAttr as ColorThemeId;
}

/**
 * 验证主题 ID 是否有效
 * @param themeId 待验证的主题 ID
 * @returns 是否有效
 */
export function isValidColorTheme(themeId: string): themeId is ColorThemeId {
  return themeId in COLOR_THEMES;
}

/**
 * 获取所有可用主题列表
 * @returns 主题元数据数组
 */
export function getAllColorThemes(): ColorThemeMetadata[] {
  return Object.values(COLOR_THEMES);
}

/**
 * 根据 ID 获取主题元数据
 * @param themeId 主题 ID
 * @returns 主题元数据，如果不存在则返回默认主题
 */
export function getColorThemeMetadata(themeId: ColorThemeId): ColorThemeMetadata {
  return COLOR_THEMES[themeId] || COLOR_THEMES[DEFAULT_COLOR_THEME];
}
