import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Sparkles, Clock, ChevronLeft } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TOOL_CATEGORIES, searchTools, getAllTools } from '../tool-registry/toolRegistry';
import type { ToolMetadata } from '../tool-registry/ToolMetadata';

/**
 * 获取工具图标（emoji 版本，未来可用 lucide-react）
 */
function getToolIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    Video: '🎬',
    Image: '🖼️',
    File: '📄',
    Code: '💻',
    Type: '📝',
    Search: '🔍',
  };
  return iconMap[iconName] || '🔧';
}

/**
 * 现代化侧边栏组件
 */
export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const { currentToolId, setCurrentToolId, recentTools, sidebarCollapsed, toggleSidebar } = useAppStore();

  // 获取最近使用的工具
  const recentToolsList = useMemo(() => {
    return recentTools
      .map(id => getAllTools().find(t => t.id === id))
      .filter((t): t is ToolMetadata => t !== undefined);
  }, [recentTools]);

  // 根据搜索状态过滤分类
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return TOOL_CATEGORIES;
    }
    return [
      {
        id: 'search',
        name: '搜索结果',
        icon: 'Search',
        description: '搜索匹配的工具',
        tools: searchTools(searchQuery),
      },
    ];
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

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
      {/* 顶部品牌区 */}
      <div className={`flex-shrink-0 border-b border-neutral-200 flex items-center justify-center ${
        sidebarCollapsed ? 'p-3' : 'p-4'
      }`}>
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-black flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-neutral-900">工具箱</h1>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

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

      {/* 最近使用 */}
      {!sidebarCollapsed && recentToolsList.length > 0 && !searchQuery && (
        <div className="flex-shrink-0 px-3 pb-2">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">最近使用</span>
          </div>
          <div className="space-y-0.5">
            {recentToolsList.slice(0, 3).map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                  currentToolId === tool.id
                    ? 'bg-neutral-100 text-black'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <span className="text-base flex-shrink-0">{getToolIcon(tool.icon)}</span>
                <span className="text-sm font-medium flex-1 truncate">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 工具分类列表 */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden space-y-1 custom-scrollbar ${
        sidebarCollapsed ? 'px-1 py-2' : 'px-2 py-2'
      }`}>
        {filteredCategories.map((category) => {
          const hasTools = category.tools.length > 0;
          const isCollapsed = collapsedCategories.has(category.id);

          return (
            <div key={category.id} className="mb-1">
              <button
                onClick={() => toggleCategory(category.id)}
                className={`w-full flex items-center rounded-lg text-left transition-all ${
                  sidebarCollapsed
                    ? 'justify-center p-2'
                    : 'justify-between px-2.5 py-2'
                } ${
                  hasTools
                    ? 'text-neutral-700 hover:bg-neutral-50 cursor-pointer'
                    : 'text-neutral-400 cursor-default'
                }`}
                disabled={!hasTools || sidebarCollapsed}
                title={sidebarCollapsed ? category.name : undefined}
              >
                {!sidebarCollapsed && (
                  <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {hasTools ? (
                        <span className="text-base flex-shrink-0">{getToolIcon(category.icon)}</span>
                      ) : (
                        <div className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs">📋</span>
                        </div>
                      )}
                      <span className="text-sm font-medium truncate">{category.name}</span>
                      {hasTools && (
                        <span className="ml-auto text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {category.tools.length}
                        </span>
                      )}
                    </div>
                    {hasTools && (
                      <div className="ml-2 flex-shrink-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                    )}
                  </>
                )}
                {sidebarCollapsed && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-base">{getToolIcon(category.icon)}</span>
                    {hasTools && (
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        {category.tools.length}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {hasTools && !isCollapsed && !sidebarCollapsed && (
                <div className="ml-2 mt-1 space-y-0.5">
                  {category.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool)}
                      className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                        currentToolId === tool.id
                          ? 'bg-black text-white'
                          : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{getToolIcon(tool.icon)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {tool.name}
                        </div>
                        {currentToolId !== tool.id && tool.shortcut && (
                          <div className="text-xs text-neutral-400 truncate">{tool.shortcut}</div>
                        )}
                      </div>
                      {tool.status === 'beta' && currentToolId !== tool.id && (
                        <span className="text-xs bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          Beta
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
