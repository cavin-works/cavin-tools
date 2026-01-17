import { ToolMetadata, ToolCategory } from './ToolMetadata';
import videoEditorToolConfig from '@/tools/video/editor/tool.config';
import imageConverterToolConfig from '@/tools/image/converter/tool.config';
import imageCompressorToolConfig from '@/tools/image/compressor/tool.config';

/**
 * 工具注册表
 *
 * 所有工具的配置对象，key 为工具 ID
 * 导入并添加新工具到这个对象中即可注册
 */
export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  'video-editor': videoEditorToolConfig,
  'image-converter': imageConverterToolConfig,
  'image-compressor': imageCompressorToolConfig,
  // 未来添加更多工具:
  // 'json-formatter': jsonFormatterToolConfig,
};

/**
 * 工具分类配置
 */
export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'video',
    name: '视频处理',
    icon: 'Video',
    description: '视频编辑、转换、压缩等工具',
    tools: Object.values(TOOL_REGISTRY).filter((t) => t.category === 'video'),
  },
  {
    id: 'image',
    name: '图像处理',
    icon: 'Image',
    description: '图片编辑、转换、优化等工具',
    tools: Object.values(TOOL_REGISTRY).filter((t) => t.category === 'image'),
  },
  {
    id: 'file',
    name: '文件工具',
    icon: 'File',
    description: '文件管理、批量处理等工具',
    tools: Object.values(TOOL_REGISTRY).filter((t) => t.category === 'file'),
  },
  {
    id: 'dev',
    name: '开发工具',
    icon: 'Code',
    description: '开发者常用工具',
    tools: Object.values(TOOL_REGISTRY).filter((t) => t.category === 'dev'),
  },
  {
    id: 'text',
    name: '文本处理',
    icon: 'Type',
    description: '文本处理、格式化等工具',
    tools: Object.values(TOOL_REGISTRY).filter((t) => t.category === 'text'),
  },
];

/**
 * 获取所有工具
 */
export function getAllTools(): ToolMetadata[] {
  return Object.values(TOOL_REGISTRY);
}

/**
 * 根据 ID 获取工具
 */
export function getToolById(id: string): ToolMetadata | undefined {
  return TOOL_REGISTRY[id];
}

/**
 * 搜索工具
 *
 * @param query 搜索关键词
 * @returns 匹配的工具列表
 */
export function searchTools(query: string): ToolMetadata[] {
  if (!query.trim()) {
    return getAllTools();
  }

  const lowerQuery = query.toLowerCase();
  return getAllTools().filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * 根据分类获取工具
 */
export function getToolsByCategory(category: ToolCategory['id']): ToolMetadata[] {
  return getAllTools().filter((t) => t.category === category);
}
