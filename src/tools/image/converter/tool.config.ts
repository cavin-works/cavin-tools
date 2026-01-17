import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageConverter } from './index';
import { useImageConverterStore } from './store/imageConverterStore';

export const imageConverterToolConfig: ToolMetadata = {
  id: 'image-converter',
  name: '图片格式转换',
  description: '批量转换图片格式，支持PNG、JPG、WebP、GIF、BMP、TIFF、ICO互转，可调整尺寸',
  category: 'image',
  icon: 'Image',
  component: ImageConverter,
  useToolStore: useImageConverterStore,
  shortcut: 'CmdOrCtrl+Shift+I',
  tags: [
    'image',
    'convert',
    'format',
    'png',
    'jpg',
    'webp',
    'gif',
    'bmp',
    'tiff',
    'ico',
    'batch',
    'resize',
    '转换',
    '格式'
  ],
  status: 'stable',
  supportFileDrop: true,
  supportedFileTypes: [
    'png',
    'jpg',
    'jpeg',
    'webp',
    'gif',
    'bmp',
    'tiff',
    'tif',
    'ico'
  ]
};

export default imageConverterToolConfig;
