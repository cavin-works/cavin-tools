import { ComponentType } from 'react';

/**
 * 工具分类
 */
export type ToolCategoryType = 'video' | 'image' | 'file' | 'dev' | 'text';

/**
 * 工具状态
 */
export type ToolStatus = 'beta' | 'stable' | 'deprecated';

/**
 * 工具元数据接口
 *
 * 定义了工具的所有配置信息，用于工具注册和发现
 */
export interface ToolMetadata {
  /** 工具唯一标识 */
  id: string;

  /** 工具显示名称 */
  name: string;

  /** 工具描述 */
  description: string;

  /** 工具分类 */
  category: ToolCategoryType;

  /** 工具图标（lucide-react 图标名） */
  icon: string;

  /** 工具组件（支持懒加载） */
  component: ComponentType;

  /** 工具状态管理 Hook（可选） */
  useToolStore?: () => any;

  /** 键盘快捷键（可选） */
  shortcut?: string;

  /** 工具标签（用于搜索） */
  tags: string[];

  /** 工具状态 */
  status: ToolStatus;

  /** 是否支持文件拖拽 */
  supportFileDrop: boolean;

  /** 支持的文件类型（可选） */
  supportedFileTypes?: string[];
}

/**
 * 工具分类接口
 */
export interface ToolCategory {
  /** 分类唯一标识 */
  id: string;

  /** 分类显示名称 */
  name: string;

  /** 分类图标 */
  icon: string;

  /** 分类描述 */
  description: string;

  /** 该分类下的所有工具 */
  tools: ToolMetadata[];
}
