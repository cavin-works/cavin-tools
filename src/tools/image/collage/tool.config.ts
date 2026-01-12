import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageCollage } from './index';

/**
 * 拼图工具配置
 */
export const imageCollageToolConfig: ToolMetadata = {
  id: 'image-collage',
  name: '拼图工具',
  description: '选择多张图片创建网格拼图，支持自定义行列、间距和背景色',
  category: 'image',
  icon: 'Image',
  component: ImageCollage,
  useToolStore: null, // 不需要store
  shortcut: 'CmdOrCtrl+Shift+C',
  tags: [
    'image',
    'collage',
    'grid',
    '拼图',
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

export default imageCollageToolConfig;
