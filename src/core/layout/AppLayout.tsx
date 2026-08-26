import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { getToolById, TOOL_REGISTRY } from '../tool-registry/toolRegistry';
import { isTextEditableTarget } from '@/tools/ai-assistant/utils/domUtils';
import { checkUpdate } from '@/lib/updateUtils';
import { UpdateDialog } from '@/components/UpdateDialog';
import { UpdateCompleteDialog } from '@/components/UpdateCompleteDialog';
import { isMac } from '@/lib/platform';
import { TodoWidget } from '@/tools/sticky-notes/TodoWidget';

/**
 * 检查是否是 Todo 小部件窗口
 */
function isTodoWidgetPath(): boolean {
  const path = window.location.pathname;
  return path === '/todo-widget';
}

/**
 * 判断键盘事件是否匹配工具快捷键（如 "CmdOrCtrl+Shift+P"）
 * CmdOrCtrl 在任意平台均接受 ctrl 或 meta
 */
function matchesToolShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());
  const key = parts.pop();
  if (!key || event.key.toLowerCase() !== key) return false;
  const wantCtrlOrCmd = parts.includes('cmdorctrl') || parts.includes('ctrl') || parts.includes('cmd');
  return (
    (event.ctrlKey || event.metaKey) === wantCtrlOrCmd &&
    event.shiftKey === parts.includes('shift') &&
    event.altKey === parts.includes('alt')
  );
}

/**
 * 主应用布局
 *
 * 侧边栏 + 主内容区的整体布局
 */
export function AppLayout() {
  const {
    currentToolId,
    setCurrentToolId,
    settings,
    theme,
    showUpdateDialog,
    showUpdateCompleteDialog,
    setShowUpdateDialog,
    setShowUpdateCompleteDialog,
    setUpdateAvailable
  } = useAppStore();
  const [pendingTodoInputFocus, setPendingTodoInputFocus] = useState(false);

  // 检查是否是独立窗口
  const isTodoWidget = isTodoWidgetPath();

  // 初始化默认工具
  useEffect(() => {
    if (isTodoWidget) return; // 独立窗口不需要初始化工具

    if (!currentToolId && settings.defaultTool) {
      const defaultTool = getToolById(settings.defaultTool);
      if (defaultTool) {
        setCurrentToolId(settings.defaultTool);
      }
    }
  }, [currentToolId, settings.defaultTool, setCurrentToolId, isTodoWidget]);

  // 启动时静默检查更新
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await checkUpdate();
        
        if (update) {
          setUpdateAvailable(true, update);
          setShowUpdateDialog(true);
        }
      } catch (err) {
        console.error('检查更新失败:', err);
      }
    };

    const timer = setTimeout(checkForUpdates, 2000);
    
    return () => clearTimeout(timer);
  }, [setUpdateAvailable, setShowUpdateDialog]);

  // 工具页切换快捷键（tool.config 声明的 shortcut，与便签弹窗的后端 global-shortcut 无关）
  useEffect(() => {
    if (isTodoWidget) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditableTarget(event.target)) return;

      for (const tool of Object.values(TOOL_REGISTRY)) {
        if (tool.shortcut && matchesToolShortcut(event, tool.shortcut)) {
          event.preventDefault();
          setCurrentToolId(tool.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTodoWidget, setCurrentToolId]);

  // 应用主题到 document
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    };

    applyTheme();

    if (theme !== 'system') return;

    // system: 跟随系统偏好，系统切换深浅色时实时更新（M6）
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    if (isTodoWidget) return;

    let unlisten: (() => void) | undefined;

    const registerTodoMainListener = async () => {
      unlisten = await listen('sticky-notes-open-main-for-input', () => {
        setCurrentToolId('sticky-notes');
        setPendingTodoInputFocus(true);
      });
    };

    void registerTodoMainListener();

    return () => {
      unlisten?.();
    };
  }, [isTodoWidget, setCurrentToolId]);

  useEffect(() => {
    if (isTodoWidget || !pendingTodoInputFocus || currentToolId !== 'sticky-notes') {
      return;
    }

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('todo:focus-main-input'));
      setPendingTodoInputFocus(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentToolId, isTodoWidget, pendingTodoInputFocus]);

  const currentTool = currentToolId ? (getToolById(currentToolId) ?? null) : null;

  // 如果是 Todo 小部件窗口，渲染 TodoWidget 组件
  if (isTodoWidget) {
    return <TodoWidget />;
  }

  return (
    <div className="relative flex h-screen bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
      {isMac() && (
        <div
          data-tauri-drag-region
          className="absolute top-0 left-0 right-0 h-10 z-[100]"
          aria-hidden="true"
        />
      )}
      <Sidebar />
      <MainContent tool={currentTool} />
      <UpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
      />
      <UpdateCompleteDialog
        open={showUpdateCompleteDialog}
        onOpenChange={setShowUpdateCompleteDialog}
      />
    </div>
  );
}
