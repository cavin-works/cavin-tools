import { useState } from 'react';
import { Search, ChevronLeft, Sparkles, Video, Image, File, Code, Type, Wrench, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getAllTools, searchTools, TOOL_CATEGORIES } from '../tool-registry/toolRegistry';
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
 * 现代化侧边栏组件 - 支持分类显示
 */
export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['video', 'image']));
  const { currentToolId, setCurrentToolId, sidebarCollapsed, toggleSidebar } = useAppStore();

  // 根据搜索过滤工具
  const filteredTools = searchQuery.trim()
    ? searchTools(searchQuery)
    : getAllTools();

  // 切换分类展开状态
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleToolClick = (tool: ToolMetadata) => {
    setCurrentToolId(tool.id);
  };

  // 统计可用工具数量
  const totalToolsCount = getAllTools().length;

  return (
    <div
      className={`relative flex flex-col bg-neutral-900 border-r border-neutral-700 transition-all duration-300 ease-in-out overflow-hidden ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* 顶部品牌区 - 可点击返回首页 */}
      <button
        onClick={() => setCurrentToolId(null)}
        className={`flex-shrink-0 border-b border-neutral-700 flex items-center justify-center hover:bg-neutral-800 transition-colors ${
          sidebarCollapsed ? 'p-3' : 'p-4'
        }`}
        title="返回首页"
      >
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white">Cavin Tools</h1>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
        )}
      </button>

      {/* 搜索框 */}
      {!sidebarCollapsed && (
        <div className="flex-shrink-0 px-3 py-3">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all placeholder:text-neutral-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                ESC
              </button>
            )}
          </div>
        </div>
      )}

      {/* 工具列表 */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${
        sidebarCollapsed ? 'px-1 py-2' : 'px-2 py-2'
      }`}>
        {searchQuery.trim() ? (
          // 搜索模式：显示所有匹配的工具
          <div className="space-y-1">
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
                      ? 'bg-white text-black'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <ToolIcon className={`flex-shrink-0 ${
                    sidebarCollapsed ? 'w-6 h-6' : 'w-4 h-4'
                  }`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="text-sm font-medium flex-1 truncate">{tool.name}</span>
                      {tool.status === 'beta' && currentToolId !== tool.id && (
                        <span className="text-xs bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          Beta
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
            {filteredTools.length === 0 && (
              <div className="text-center py-8 text-sm text-neutral-500">
                未找到工具
              </div>
            )}
          </div>
        ) : (
          // 分类模式：按分类显示工具
          <div className="space-y-4">
            {TOOL_CATEGORIES.filter(cat => cat.tools.length > 0).map((category) => {
              const CategoryIcon = getToolIcon(category.icon);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id}>
                  {/* 分类标题 */}
                  {!sidebarCollapsed && (
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <CategoryIcon className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase flex-1 text-left">
                        {category.name}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  )}

                  {/* 分类工具列表 */}
                  {isExpanded && (
                    <div className="mt-1 space-y-1">
                      {category.tools.map((tool) => {
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
                                ? 'bg-white text-black'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <ToolIcon className={`flex-shrink-0 ${
                              sidebarCollapsed ? 'w-6 h-6' : 'w-4 h-4'
                            }`} />
                            {!sidebarCollapsed && (
                              <>
                                <span className="text-sm font-medium flex-1 truncate">{tool.name}</span>
                                {tool.status === 'beta' && currentToolId !== tool.id && (
                                  <span className="text-xs bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                                    Beta
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部统计和折叠按钮 */}
      <div className={`flex-shrink-0 border-t border-neutral-700 ${
        sidebarCollapsed ? 'p-2' : 'p-3'
      }`}>
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              {totalToolsCount} 个工具
            </span>
            <button
              onClick={toggleSidebar}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
              title="折叠侧边栏"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleSidebar}
            className="w-full p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors flex items-center justify-center"
            title="展开侧边栏"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}
