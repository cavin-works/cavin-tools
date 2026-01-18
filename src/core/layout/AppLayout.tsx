import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { getToolById } from '../tool-registry/toolRegistry';

/**
 * 主应用布局
 *
 * 侧边栏 + 主内容区的整体布局
 */
export function AppLayout() {
  const { currentToolId, setCurrentToolId, settings, theme } = useAppStore();

  // 初始化默认工具
  useEffect(() => {
    if (!currentToolId && settings.defaultTool) {
      const defaultTool = getToolById(settings.defaultTool);
      if (defaultTool) {
        setCurrentToolId(settings.defaultTool);
      }
    }
  }, [currentToolId, settings.defaultTool, setCurrentToolId]);

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
    <div className="flex h-screen bg-neutral-900 overflow-hidden">
      <Sidebar />
      <MainContent tool={currentTool} />
    </div>
  );
}
