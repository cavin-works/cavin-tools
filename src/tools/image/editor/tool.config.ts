import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageEditor } from './index';
import { useImageStore } from './store/imageStore';

/**
 * 图片编辑器工具配置
 */
export const imageEditorToolConfig: ToolMetadata = {
  id: 'image-editor',
  name: '图片编辑器',
  description: '专业的图片处理工具，支持裁剪、旋转、翻转、尺寸调整、水印、拼图、格式转换和批量处理等功能',
  category: 'image',
  icon: 'Image',
  component: ImageEditor,
  useToolStore: useImageStore,
  shortcut: 'CmdOrCtrl+Shift+I',
  tags: [
    'image',
    'edit',
    'crop',
    'rotate',
    'flip',
    'resize',
    'watermark',
    'collage',
    'convert',
    'compress',
    'batch',
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
    'tiff',
    'tif',
  ],
};

export default imageEditorToolConfig;
