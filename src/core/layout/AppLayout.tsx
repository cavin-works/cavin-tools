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
  const { currentToolId, setCurrentToolId, settings } = useAppStore();

  // 初始化默认工具
  useEffect(() => {
    if (!currentToolId && settings.defaultTool) {
      const defaultTool = getToolById(settings.defaultTool);
      if (defaultTool) {
        setCurrentToolId(settings.defaultTool);
      }
    }
  }, [currentToolId, settings.defaultTool, setCurrentToolId]);

  const currentTool = currentToolId ? (getToolById(currentToolId) ?? null) : null;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />
      <MainContent tool={currentTool} />
    </div>
  );
}
