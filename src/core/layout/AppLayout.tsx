import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { getToolById } from '../tool-registry/toolRegistry';
import { checkUpdate } from '@/lib/updateUtils';
import { UpdateDialog } from '@/components/UpdateDialog';
import { UpdateCompleteDialog } from '@/components/UpdateCompleteDialog';
import { isMac } from '@/lib/platform';

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

  // 初始化默认工具
  useEffect(() => {
    if (!currentToolId && settings.defaultTool) {
      const defaultTool = getToolById(settings.defaultTool);
      if (defaultTool) {
        setCurrentToolId(settings.defaultTool);
      }
    }
  }, [currentToolId, settings.defaultTool, setCurrentToolId]);

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

  // 应用主题到 document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system: 跟随系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const currentTool = currentToolId ? (getToolById(currentToolId) ?? null) : null;

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
