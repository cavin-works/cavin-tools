import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageCollage } from './index';
import { useImageCollageStore } from './store/collageStore';

export const imageCollageToolConfig: ToolMetadata = {
  id: 'image-collage',
  name: '图片拼贴',
  description: '多张图片拼贴合成，支持横向、纵向、2×2、九宫格模板与自定义间距背景',
  category: 'image',
  icon: 'Image',
  component: ImageCollage,
  useToolStore: useImageCollageStore,
  tags: [
    'image',
    'collage',
    'grid',
    '拼贴',
    '组合',
    '九宫格'
  ],
  status: 'beta',
  supportFileDrop: false,
  supportedFileTypes: [
    'png',
    'jpg',
    'jpeg',
    'webp',
    'gif',
    'bmp',
    'tiff'
  ]
};

export default imageCollageToolConfig;
