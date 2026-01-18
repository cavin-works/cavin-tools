import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Video, Image, File, Code, Type, Wrench, Settings, Moon, Sun, Monitor, SmilePlus, Download, Activity } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TOOL_CATEGORIES } from '../tool-registry/toolRegistry';
import type { ToolMetadata } from '../tool-registry/ToolMetadata';

/**
 * 获取工具图标组件
 */
function getToolIcon(iconName: string): React.ComponentType<{ className?: string }> {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Video,
    Image,
    File,
    Code,
    Type,
    Activity,
  };
  return iconMap[iconName] || Wrench;
}

/**
 * 侧边栏组件
 */
export function Sidebar() {
  const [expandedCategories] = useState<Set<string>>(new Set(['video', 'image', 'dev']));
  const { currentToolId, setCurrentToolId, sidebarCollapsed, toggleSidebar, showSettings, setShowSettings, theme, setTheme } = useAppStore();

  const handleToolClick = (tool: ToolMetadata) => {
    setShowSettings(false);
    setCurrentToolId(tool.id);
  };

  // 循环切换主题
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // 获取主题图标和文字
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeText = theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统';

  // 获取所有工具（按分类）
  const toolsByCategory = TOOL_CATEGORIES.filter(cat => cat.tools.length > 0);

  return (
    <div
      className={`relative flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out overflow-visible ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 折叠/展开按钮 - 悬浮在边缘 */}
      <button
        onClick={toggleSidebar}
        className="absolute top-6 -right-2.5 z-10 w-5 h-5 flex items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors bg-white dark:bg-neutral-900 shadow-sm"
        title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* 顶部品牌区 */}
      <div className="flex-shrink-0 p-4">
        <button
          onClick={() => { setShowSettings(false); setCurrentToolId(null); }}
          className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${sidebarCollapsed ? 'justify-center w-full' : ''}`}
          title="返回首页"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-neutral-900 dark:text-white">Cavin Tools</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">多功能工具集</p>
            </div>
          )}
        </button>
      </div>

      {/* 工具列表 */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? 'px-3' : 'px-3'}`}>
        <div className="space-y-1">
          {toolsByCategory.map((category) => (
            expandedCategories.has(category.id) && category.tools.map((tool) => {
              const ToolIcon = getToolIcon(tool.icon);
              const isActive = currentToolId === tool.id && !showSettings;

              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  title={sidebarCollapsed ? tool.name : undefined}
                  className={`w-full flex items-center rounded-xl text-left transition-all ${
                    sidebarCollapsed
                      ? 'justify-center p-3'
                      : 'gap-3 px-3 py-3'
                  } ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'w-9 h-9 rounded-lg flex items-center justify-center'} ${
                    isActive
                      ? sidebarCollapsed ? '' : 'bg-white/20'
                      : sidebarCollapsed ? '' : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}>
                    <ToolIcon className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${
                      isActive ? '' : 'text-neutral-500 dark:text-neutral-400'
                    }`} />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                        {tool.name}
                      </div>
                      <div className={`text-xs truncate max-w-[140px] ${isActive ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        {tool.description.length > 10 ? tool.description.slice(0, 10) + '...' : tool.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          ))}
        </div>
      </div>

      {/* 底部区域 */}
      <div className="flex-shrink-0 p-3 space-y-3">
        {/* 主题状态指示 - 仅展开时显示 */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
            <div className={`w-2 h-2 rounded-full ${
              theme === 'dark' ? 'bg-blue-500' : theme === 'light' ? 'bg-amber-500' : 'bg-green-500'
            }`} />
            <span>{themeText}</span>
          </div>
        )}

        {/* 底部图标按钮组 */}
        <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-1' : 'justify-center gap-1'} border-t border-neutral-200 dark:border-neutral-800 pt-3`}>
          {/* 主题切换 */}
          <button
            onClick={cycleTheme}
            className="p-2.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={`主题: ${themeText}`}
          >
            <ThemeIcon className="w-5 h-5" />
          </button>

          {/* 表情/反馈 */}
          <button
            className="p-2.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="反馈"
          >
            <SmilePlus className="w-5 h-5" />
          </button>

          {/* 下载 */}
          <button
            className="p-2.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="下载"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* 设置 */}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2.5 rounded-lg transition-colors ${
              showSettings
                ? 'bg-blue-500 text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
