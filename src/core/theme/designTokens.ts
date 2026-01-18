/**
 * 设计令牌 (Design Tokens)
 *
 * 定义应用的统一设计规范，确保视觉一致性
 * 所有组件应优先使用这些令牌而非硬编码值
 */

/**
 * 圆角尺寸
 */
export const radius = {
  /** 小圆角 - 用于小按钮、标签 */
  sm: '0.5rem',     // 8px
  /** 中等圆角 - 默认值，用于大部分组件 */
  md: '0.65rem',    // 10.4px
  /** 大圆角 - 用于卡片 */
  lg: '0.75rem',    // 12px
  /** 超大圆角 - 用于特殊强调元素 */
  xl: '1rem',       // 16px
  /** 全圆角 - 用于圆形元素 */
  full: '9999px',
} as const;

/**
 * 间距规范
 */
export const spacing = {
  /** 页面区块间距 - 用于页面主要区域之间 */
  section: '2rem',      // 32px
  /** 卡片间距 - 用于卡片之间 */
  card: '1.5rem',       // 24px
  /** 组件间距 - 用于组件之间 */
  component: '1rem',    // 16px
  /** 列表项间距 - 用于列表项之间 */
  item: '0.75rem',      // 12px
  /** 元素间距 - 用于小元素之间 */
  element: '0.5rem',    // 8px
  /** 紧凑间距 - 用于需要紧凑布局的场景 */
  tight: '0.25rem',     // 4px
} as const;

/**
 * 阴影效果
 */
export const shadow = {
  /** 无阴影 */
  none: 'none',
  /** 软阴影 - 用于悬浮卡片 */
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  /** 中等阴影 - 默认卡片阴影 */
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  /** 大阴影 - 用于模态框、下拉菜单 */
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  /** 超大阴影 - 用于抽屉、对话框 */
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  /** 内阴影 - 用于输入框 */
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

/**
 * 过渡动画
 */
export const transition = {
  /** 快速过渡 - 用于小元素交互 */
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  /** 基础过渡 - 默认过渡效果 */
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  /** 慢速过渡 - 用于大元素、页面切换 */
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  /** 弹性过渡 - 用于需要弹性效果的元素 */
  bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

/**
 * 字体尺寸
 */
export const fontSize = {
  /** 超小 - 用于辅助文本 */
  xs: '0.75rem',      // 12px
  /** 小 - 用于次要信息 */
  sm: '0.875rem',     // 14px
  /** 基础 - 默认正文大小 */
  base: '1rem',       // 16px
  /** 中等 - 用于小标题 */
  md: '1.125rem',     // 18px
  /** 大 - 用于中等标题 */
  lg: '1.25rem',      // 20px
  /** 超大 - 用于主标题 */
  xl: '1.5rem',       // 24px
  /** 2倍大 - 用于页面标题 */
  '2xl': '1.875rem',  // 30px
  /** 3倍大 - 用于特大标题 */
  '3xl': '2.25rem',   // 36px
} as const;

/**
 * 字重
 */
export const fontWeight = {
  /** 细体 */
  light: '300',
  /** 常规 */
  normal: '400',
  /** 中等 */
  medium: '500',
  /** 半粗 */
  semibold: '600',
  /** 粗体 */
  bold: '700',
} as const;

/**
 * 行高
 */
export const lineHeight = {
  /** 紧凑 - 用于标题 */
  tight: '1.25',
  /** 正常 - 默认行高 */
  normal: '1.5',
  /** 宽松 - 用于正文 */
  relaxed: '1.75',
} as const;

/**
 * Z-index 层级
 */
export const zIndex = {
  /** 基础层 */
  base: 0,
  /** 下拉菜单 */
  dropdown: 1000,
  /** 粘性元素 */
  sticky: 1020,
  /** 固定元素 */
  fixed: 1030,
  /** 模态遮罩 */
  modalBackdrop: 1040,
  /** 模态框 */
  modal: 1050,
  /** 弹出框 */
  popover: 1060,
  /** 提示框 */
  tooltip: 1070,
  /** 通知 */
  notification: 1080,
} as const;

/**
 * 断点 (响应式设计)
 */
export const breakpoints = {
  /** 手机 */
  sm: '640px',
  /** 平板 */
  md: '768px',
  /** 笔记本 */
  lg: '1024px',
  /** 桌面 */
  xl: '1280px',
  /** 大屏 */
  '2xl': '1536px',
} as const;

/**
 * 容器最大宽度
 */
export const containerMaxWidth = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
} as const;

/**
 * 组件高度规范
 */
export const componentHeight = {
  /** 按钮/输入框 - 小尺寸 */
  sm: '2rem',       // 32px - h-8
  /** 按钮/输入框 - 默认尺寸 */
  md: '2.5rem',     // 40px - h-10
  /** 按钮/输入框 - 大尺寸 */
  lg: '2.75rem',    // 44px - h-11
  /** 按钮/输入框 - 超大尺寸 */
  xl: '3rem',       // 48px - h-12
} as const;

/**
 * 图标尺寸
 */
export const iconSize = {
  /** 超小图标 */
  xs: '0.75rem',    // 12px - w-3 h-3
  /** 小图标 */
  sm: '1rem',       // 16px - w-4 h-4
  /** 默认图标 */
  md: '1.25rem',    // 20px - w-5 h-5
  /** 大图标 */
  lg: '1.5rem',     // 24px - w-6 h-6
  /** 超大图标 */
  xl: '2rem',       // 32px - w-8 h-8
  /** 2倍大图标 */
  '2xl': '2.5rem',  // 40px - w-10 h-10
} as const;

/**
 * 获取完整的设计令牌对象
 */
export const designTokens = {
  radius,
  spacing,
  shadow,
  transition,
  fontSize,
  fontWeight,
  lineHeight,
  zIndex,
  breakpoints,
  containerMaxWidth,
  componentHeight,
  iconSize,
} as const;

/**
 * 设计令牌类型导出
 */
export type DesignTokens = typeof designTokens;
export type Radius = keyof typeof radius;
export type Spacing = keyof typeof spacing;
export type Shadow = keyof typeof shadow;
export type Transition = keyof typeof transition;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
export type LineHeight = keyof typeof lineHeight;
export type ZIndex = keyof typeof zIndex;
export type Breakpoint = keyof typeof breakpoints;
export type ComponentHeight = keyof typeof componentHeight;
export type IconSize = keyof typeof iconSize;

/**
 * 辅助函数: 获取圆角类名
 */
export function getRadiusClass(size: Radius = 'md'): string {
  const map: Record<Radius, string> = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  };
  return map[size];
}

/**
 * 辅助函数: 获取阴影类名
 */
export function getShadowClass(size: Shadow = 'md'): string {
  const map: Record<Shadow, string> = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    inner: 'shadow-inner',
  };
  return map[size];
}

/**
 * 辅助函数: 获取过渡类名
 */
export function getTransitionClass(speed: Transition = 'base'): string {
  const map: Record<Transition, string> = {
    fast: 'transition duration-150',
    base: 'transition duration-200',
    slow: 'transition duration-300',
    bounce: 'transition duration-400',
  };
  return map[speed];
}
