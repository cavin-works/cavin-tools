import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageEditor } from './index';
import { useImageEditorStore } from './store/imageEditorStore';

export const imageEditorToolConfig: ToolMetadata = {
  id: 'image-editor',
  name: '图片编辑器',
  description: '图片裁剪、旋转翻转、亮度对比度等滤镜调整，支持 PNG/JPG/WebP 导出',
  category: 'image',
  icon: 'Image',
  component: ImageEditor,
  useToolStore: useImageEditorStore,
  tags: [
    'image',
    'edit',
    'crop',
    'rotate',
    'flip',
    'filter',
    '编辑',
    '裁剪',
    '旋转',
    '滤镜'
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

export default imageEditorToolConfig;
