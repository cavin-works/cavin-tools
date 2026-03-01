import { ToolMetadata } from '@/core/tool-registry/ToolMetadata';
import { StickyNotes } from './index';
import { useTodoStore } from './store/stickyNotesStore';

export const stickyNotesToolConfig: ToolMetadata = {
  id: 'sticky-notes',
  name: 'Todo List',
  description: '桌面任务管理，支持桌面嵌入和快捷键置顶',
  category: 'productivity',
  icon: 'CheckCircle2',
  component: StickyNotes,
  useToolStore: useTodoStore,
  shortcut: 'CmdOrCtrl+Shift+T',
  tags: [
    'todo',
    'task',
    'checklist',
    'desktop',
    'widget',
    '任务',
    '待办',
    '清单',
    '桌面',
  ],
  status: 'beta',
  supportFileDrop: false,
};

export default stickyNotesToolConfig;
