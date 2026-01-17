import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ImageCompressor } from './index';
import { useImageCompressorStore } from './store/imageCompressorStore';

export const imageCompressorToolConfig: ToolMetadata = {
  id: 'image-compressor',
  name: '图片压缩优化',
  description: '批量压缩图片减小体积，保持原格式不变，支持质量调整、尺寸缩放、元数据清理',
  category: 'image',
  icon: 'FileArchive',
  component: ImageCompressor,
  useToolStore: useImageCompressorStore,
  shortcut: 'CmdOrCtrl+Shift+C',
  tags: [
    'image',
    'compress',
    'optimize',
    'reduce',
    'size',
    'batch',
    'quality',
    '压缩',
    '优化',
    '体积'
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

export default imageCompressorToolConfig;
