import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { PacketCapture } from './index';
import { useCaptureStore } from './store/captureStore';

export const packetCaptureToolConfig: ToolMetadata = {
  id: 'packet-capture',
  name: '网络抓包',
  description: '捕获和分析 HTTP/HTTPS 网络请求，查看请求头、请求体和响应内容',
  category: 'dev',
  icon: 'Network',
  component: PacketCapture,
  useToolStore: useCaptureStore,
  shortcut: 'CmdOrCtrl+Shift+N',
  tags: [
    'network',
    'http',
    'https',
    'capture',
    'proxy',
    'request',
    'response',
    '网络',
    '抓包',
    '请求',
    '代理',
  ],
  status: 'beta',
  supportFileDrop: false,
};

export default packetCaptureToolConfig;
