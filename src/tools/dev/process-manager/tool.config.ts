import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { ProcessManager } from './index';
import { useProcessManagerStore } from './store/processManagerStore';

export const processManagerToolConfig: ToolMetadata = {
  id: 'process-manager',
  name: '进程管理器',
  description: '查看和管理系统进程,按名称搜索进程,查询和释放端口占用',
  category: 'dev',
  icon: 'Activity',
  component: ProcessManager,
  useToolStore: useProcessManagerStore,
  shortcut: 'CmdOrCtrl+Shift+P',
  tags: [
    'process',
    'port',
    'manager',
    'system',
    'kill',
    'terminate',
    'node',
    '进程',
    '端口',
    '管理',
    'kill',
    '终止',
  ],
  status: 'beta',
  supportFileDrop: false,
};

export default processManagerToolConfig;
