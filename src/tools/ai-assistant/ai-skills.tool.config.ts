import { lazy } from 'react';
import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { withAiAssistantProviders } from './withAiAssistantProviders';

const SkillsPage = lazy(() => import('./pages/SkillsPage'));

const aiSkillsToolConfig: ToolMetadata = {
  id: 'ai-skills',
  name: 'AI 技能',
  description: '安装和管理 AI 技能扩展',
  icon: 'Wrench',
  category: 'dev',
  component: withAiAssistantProviders(SkillsPage),
  tags: ['ai', 'skills', 'extensions', 'claude'],
  status: 'stable',
  supportFileDrop: false,
};

export default aiSkillsToolConfig;
