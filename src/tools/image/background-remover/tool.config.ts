import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { BackgroundRemover } from './index';
import { useBackgroundRemoverStore } from './store/backgroundRemoverStore';

export const backgroundRemoverToolConfig: ToolMetadata = {
  id: 'background-remover',
  name: '图片背景去除',
  description: '使用 AI 一键去除图片背景，生成透明 PNG，支持批量处理',
  category: 'image',
  icon: 'Image',
  component: BackgroundRemover,
  useToolStore: useBackgroundRemoverStore,
  shortcut: 'CmdOrCtrl+Shift+B',
  tags: [
    'background',
    'remove',
    'transparent',
    'png',
    'ai',
    'image',
    'batch',
    '背景',
    '去除',
    '透明',
    '抠图',
  ],
  status: 'beta',
  supportFileDrop: true,
  supportedFileTypes: ['png', 'jpg', 'jpeg', 'webp'],
};

export default backgroundRemoverToolConfig;
