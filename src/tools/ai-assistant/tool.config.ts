import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import AIAssistant from './index';

const aiAssistantToolConfig: ToolMetadata = {
  id: 'ai-assistant',
  name: 'AI 助手',
  description: 'Claude Code, Codex, Gemini CLI 全能助手 - 供应商管理、MCP 配置、提示词、技能管理',
  icon: 'Bot',
  category: 'dev',
  component: AIAssistant,
  tags: ['claude', 'codex', 'gemini', 'opencode', 'mcp', 'proxy', 'ai', 'provider'],
  status: 'stable',
  supportFileDrop: false,
};

export default aiAssistantToolConfig;
