import { lazy } from 'react';
import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { withAiAssistantProviders } from './withAiAssistantProviders';

const McpPage = lazy(() => import('./pages/McpPage'));

const aiMcpToolConfig: ToolMetadata = {
  id: 'ai-mcp',
  name: 'MCP 服务器',
  description: '配置 Model Context Protocol 服务器',
  icon: 'Activity',
  category: 'dev',
  component: withAiAssistantProviders(McpPage),
  tags: ['ai', 'mcp', 'protocol', 'claude'],
  status: 'stable',
  supportFileDrop: false,
};

export default aiMcpToolConfig;
