import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { WatermarkRemover } from './index';
import { useWatermarkRemoverStore } from './store/watermarkRemoverStore';

export const watermarkRemoverToolConfig: ToolMetadata = {
  id: 'watermark-remover',
  name: 'Gemini 水印去除',
  description: '一键去除 Gemini AI 生成图片的水印，支持批量处理，本地处理保护隐私',
  category: 'image',
  icon: 'Eraser',
  component: WatermarkRemover,
  useToolStore: useWatermarkRemoverStore,
  shortcut: 'CmdOrCtrl+Shift+W',
  tags: [
    'watermark',
    'remove',
    'gemini',
    'ai',
    'image',
    'batch',
    '水印',
    '去除',
    '去水印',
    'AI图片',
  ],
  status: 'stable',
  supportFileDrop: true,
  supportedFileTypes: ['png', 'jpg', 'jpeg', 'webp'],
};

export default watermarkRemoverToolConfig;
