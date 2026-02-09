import { lazy } from 'react';
import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { withAiAssistantProviders } from './withAiAssistantProviders';

const ProvidersPage = lazy(() => import('./pages/ProvidersPage'));

const aiProvidersToolConfig: ToolMetadata = {
  id: 'ai-providers',
  name: 'AI 供应商',
  description: '管理 Claude、Codex、Gemini 等 AI 供应商配置',
  icon: 'Bot',
  category: 'dev',
  component: withAiAssistantProviders(ProvidersPage),
  tags: ['ai', 'provider', 'claude', 'codex', 'gemini', 'opencode', 'cursor'],
  status: 'stable',
  supportFileDrop: false,
};

export default aiProvidersToolConfig;
