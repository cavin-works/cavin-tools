import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageBatch } from './index';

/**
 * 批量处理工具配置
 */
export const imageBatchToolConfig: ToolMetadata = {
  id: 'image-batch',
  name: '批量处理',
  description: '对多张图片执行批量操作，支持调整尺寸、裁剪、旋转、翻转和格式转换',
  category: 'image',
  icon: 'Image',
  component: ImageBatch,
  useToolStore: null, // 不需要store
  shortcut: 'CmdOrCtrl+Shift+B',
  tags: [
    'image',
    'batch',
    'process',
    '批量',
  ],
  status: 'stable',
  supportFileDrop: true,
  supportedFileTypes: [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
  ],
};

export default imageBatchToolConfig;
