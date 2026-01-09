import { useState } from 'react';
import { Search, ChevronLeft, Sparkles, Video, Image, File, Code, Type, Wrench } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getAllTools, searchTools } from '../tool-registry/toolRegistry';
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
  };
  return iconMap[iconName] || Wrench;
}

/**
 * 现代化侧边栏组件 - 简化版（直接显示工具）
 */
export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentToolId, setCurrentToolId, sidebarCollapsed, toggleSidebar } = useAppStore();

  // 根据搜索过滤工具
  const filteredTools = searchQuery.trim()
    ? searchTools(searchQuery)
    : getAllTools();

  const handleToolClick = (tool: ToolMetadata) => {
    setCurrentToolId(tool.id);
  };

  // 统计可用工具数量
  const totalToolsCount = getAllTools().length;

  return (
    <div
      className={`relative flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out overflow-hidden ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* 顶部品牌区 - 可点击返回首页 */}
      <button
        onClick={() => setCurrentToolId(null)}
        className={`flex-shrink-0 border-b border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors ${
          sidebarCollapsed ? 'p-3' : 'p-4'
        }`}
        title="返回首页"
      >
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-black flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-neutral-900">Cavin Tools</h1>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
      </button>

      {/* 搜索框 */}
      {!sidebarCollapsed && (
        <div className="flex-shrink-0 px-3 py-3">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ESC
              </button>
            )}
          </div>
        </div>
      )}

      {/* 工具列表 */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-1 ${
        sidebarCollapsed ? 'px-1 py-2' : 'px-2 py-2'
      }`}>
        {filteredTools.map((tool) => {
          const ToolIcon = getToolIcon(tool.icon);
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              title={sidebarCollapsed ? tool.name : undefined}
              className={`group w-full flex items-center rounded-lg text-left transition-all ${
                sidebarCollapsed
                  ? 'justify-center p-2'
                  : 'gap-2.5 px-2.5 py-2.5'
              } ${
                currentToolId === tool.id
                  ? 'bg-black text-white'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <ToolIcon className={`flex-shrink-0 ${
                sidebarCollapsed ? 'w-6 h-6' : 'w-4 h-4'
              }`} />
              {!sidebarCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1 truncate">{tool.name}</span>
                  {tool.status === 'beta' && currentToolId !== tool.id && (
                    <span className="text-xs bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      Beta
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-sm text-neutral-400">
            未找到工具
          </div>
        )}
      </div>

      {/* 底部统计和折叠按钮 */}
      <div className={`flex-shrink-0 border-t border-neutral-200 ${
        sidebarCollapsed ? 'p-2' : 'p-3'
      }`}>
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              {totalToolsCount} 个工具
            </span>
            <button
              onClick={toggleSidebar}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
              title="折叠侧边栏"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleSidebar}
            className="w-full p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors flex items-center justify-center"
            title="展开侧边栏"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}
