import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { CharacterTools } from './index';

export const characterToolsToolConfig: ToolMetadata = {
  id: 'character-tools',
  name: '字符处理工具',
  description: '随机字符生成、Base64/URL 编解码、MD5/SHA 哈希、JSON 格式化、时间戳转换、UUID 生成和颜色转换',
  category: 'text',
  icon: 'Type',
  component: CharacterTools,
  shortcut: 'CmdOrCtrl+Shift+E',
  tags: [
    'text',
    'string',
    'random',
    'base64',
    'md5',
    'json',
    'format',
    'converter',
    'hash',
    'generate',
    '字符',
    '随机',
    '加密',
    '解密',
    '格式化',
    '美化'
  ],
  status: 'stable',
  supportFileDrop: false,
  supportedFileTypes: []
};

export default characterToolsToolConfig;
