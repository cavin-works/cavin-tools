import { lazy } from 'react';
import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { withAiAssistantProviders } from './withAiAssistantProviders';

const PromptsPage = lazy(() => import('./pages/PromptsPage'));

const aiPromptsToolConfig: ToolMetadata = {
  id: 'ai-prompts',
  name: 'AI 提示词',
  description: '创建和管理自定义提示词模板',
  icon: 'Book',
  category: 'dev',
  component: withAiAssistantProviders(PromptsPage),
  tags: ['ai', 'prompts', 'templates', 'claude'],
  status: 'stable',
  supportFileDrop: false,
};

export default aiPromptsToolConfig;
