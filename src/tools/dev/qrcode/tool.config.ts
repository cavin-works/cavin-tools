import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { QrCodeTool } from './index';

export const qrcodeToolConfig: ToolMetadata = {
  id: 'qrcode',
  name: '二维码生成器',
  description: '输入文本快速生成二维码，支持自定义尺寸与前景背景颜色，导出 PNG 图片',
  category: 'dev',
  icon: 'Code',
  component: QrCodeTool,
  tags: [
    'qrcode',
    'qr',
    '二维码',
    '生成',
    'encode',
    'png',
    '链接',
    'link',
  ],
  status: 'stable',
  supportFileDrop: false,
};

export default qrcodeToolConfig;
