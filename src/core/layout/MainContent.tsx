import { Suspense, useMemo } from 'react';
import type { ToolMetadata } from '../tool-registry/ToolMetadata';
import { getAllTools } from '../tool-registry/toolRegistry';
import { useAppStore } from '../store/appStore';
import { Video, Image, File, Code, Type, Search, ArrowRight, Sparkles } from 'lucide-react';

interface MainContentProps {
  tool: ToolMetadata | null;
}

/**
 * 主内容区组件
 */
export function MainContent({ tool }: MainContentProps) {
  if (!tool) {
    return <WelcomeScreen />;
  }

  const ToolComponent = tool.component;

  return (
    <div className="flex-1 overflow-auto bg-neutral-900">
      <Suspense fallback={<ToolLoadingFallback name={tool.name} />}>
        <ToolComponent />
      </Suspense>
    </div>
  );
}

/**
 * 欢迎界面 - 现代简约风格
 */
function WelcomeScreen() {
  const allTools = getAllTools();
  const { setCurrentToolId, recentTools } = useAppStore();

  // 获取最近使用的工具
  const recentToolsList = useMemo(() => {
    return recentTools
      .map(id => allTools.find(t => t.id === id))
      .filter((t): t is ToolMetadata => t !== undefined);
  }, [recentTools, allTools]);

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-neutral-900 to-neutral-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-8">
          {/* Logo and Title */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white text-black mb-6 shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>

          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Cavin Tools
          </h1>

          <p className="text-lg text-neutral-300 max-w-2xl mx-auto mb-8">
            专业的多媒体处理工具集，让视频编辑、图像处理变得简单高效
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-sm text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{allTools.length} 个工具</span>
            </div>
            <span>·</span>
            <span>随时可用</span>
          </div>
        </div>

        {/* Recent Tools Section */}
        {recentToolsList.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">最近使用</h2>
                <span className="px-2 py-0.5 bg-neutral-700 text-neutral-300 text-xs rounded-full">
                  {recentToolsList.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentToolsList.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => setCurrentToolId(tool.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Tools Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">所有工具</h2>
            <span className="text-sm text-neutral-400">点击选择使用</span>
          </div>

          {allTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => setCurrentToolId(tool.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-neutral-700 text-center text-sm text-neutral-500">
          <p>© 2024 Cavin Tools · Built with Tauri & React</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 工具卡片 - 现代卡片设计
 */
interface ToolCardProps {
  tool: ToolMetadata;
  onClick: () => void;
}

function ToolCard({ tool, onClick }: ToolCardProps) {
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      Video,
      Image,
      File,
      Code,
      Type,
      Search,
    };
    return iconMap[iconName] || Tool;
  };

  const IconComponent = getIconComponent(tool.icon);

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800 p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-neutral-600 hover:-translate-y-0.5"
    >
      {/* Icon Container */}
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-700 group-hover:bg-white transition-colors duration-200">
          <IconComponent className="w-6 h-6 text-neutral-300 group-hover:text-black transition-colors duration-200" />
        </div>
      </div>

      {/* Title and Badge */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors">
          {tool.name}
        </h3>
        {tool.status === 'beta' && (
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-neutral-400 bg-neutral-700 rounded-full">
            Beta
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-400 line-clamp-2 mb-4">
        {tool.description}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 text-sm text-neutral-400 group-hover:text-white transition-colors">
        <span className="font-medium">开始使用</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
}

/**
 * 空状态
 */
function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-800 mb-4">
        <Tool className="w-8 h-8 text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">暂无工具</h3>
      <p className="text-neutral-500">更多工具正在开发中...</p>
    </div>
  );
}

/**
 * 工具加载占位符
 */
function ToolLoadingFallback({ name }: { name: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-900">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-neutral-700 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white font-medium mb-2">正在加载 {name}</p>
        <p className="text-neutral-400 text-sm">请稍候...</p>
      </div>
    </div>
  );
}

// Default tool icon
function Tool({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17L17 21M17 21l5-5m-5 5l-5-5M3 3h18M3 7h18M3 11h18M3 15h18M3 19h18"
      />
    </svg>
  );
}
