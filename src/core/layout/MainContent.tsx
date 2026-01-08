import { Suspense } from 'react';
import type { ToolMetadata } from '../tool-registry/ToolMetadata';
import { getAllTools } from '../tool-registry/toolRegistry';

interface MainContentProps {
  tool: ToolMetadata | null;
}

/**
 * 主内容区组件 - 现代化设计
 */
export function MainContent({ tool }: MainContentProps) {
  // 如果没有选中工具，显示欢迎界面
  if (!tool) {
    return <WelcomeScreen />;
  }

  const ToolComponent = tool.component;

  return (
    <div className="flex-1 overflow-auto bg-neutral-50">
      <Suspense fallback={<ToolLoadingFallback name={tool.name} />}>
        {/* 直接显示工具内容，不添加头部 */}
        <ToolComponent />
      </Suspense>
    </div>
  );
}

/**
 * 欢迎界面 - 工具卡片网格
 */
function WelcomeScreen() {
  const allTools = getAllTools();

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="min-h-full">
        {/* 左侧大标题区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
          {/* 左侧标题区 - 占 1 列 */}
          <div className="lg:col-span-1 border-r border-neutral-200 p-12 flex flex-col justify-center">
            <div className="mb-6">
              <div className="inline-block px-3 py-1 bg-black text-white text-sm font-medium rounded mb-6">
                v1.0
              </div>
            </div>
            <h1 className="text-6xl font-bold text-neutral-900 mb-6 leading-none">
              工具
              <br />
              <span className="text-neutral-400">集合</span>
            </h1>
            <p className="text-xl text-neutral-500 mb-8 leading-relaxed">
              高效处理视频、图像、文件等日常任务
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {allTools.length} 个工具就绪
            </div>
          </div>

          {/* 右侧工具网格 - 占 2 列 */}
          <div className="lg:col-span-2 p-8 lg:p-12">
            {allTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allTools.map((tool, index) => (
                  <ToolCard key={tool.id} tool={tool} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 工具卡片
 */
function ToolCard({ tool, index }: { tool: ToolMetadata; index: number }) {
  const { setCurrentToolId } = useAppStore();

  return (
    <button
      onClick={() => setCurrentToolId(tool.id)}
      className="group text-left"
    >
      <div className="border-2 border-neutral-200 hover:border-black rounded-lg p-5 transition-all duration-200">
        {/* 工具图标 */}
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
          {getToolIcon(tool.icon)}
        </div>

        {/* 工具名称和状态 */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-neutral-900">
            {tool.name}
          </h3>
          {tool.status === 'beta' && (
            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded">
              Beta
            </span>
          )}
        </div>

        {/* 工具描述 */}
        <p className="text-sm text-neutral-500 line-clamp-2">
          {tool.description}
        </p>
      </div>
    </button>
  );
}

/**
 * 空状态
 */
function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">📦</div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">暂无工具</h3>
      <p className="text-neutral-600">工具正在准备中</p>
    </div>
  );
}

/**
 * 工具加载占位符
 */
function ToolLoadingFallback({ name }: { name: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-neutral-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-black border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <p className="text-neutral-600 font-medium">正在加载 {name}...</p>
        <p className="text-neutral-400 text-sm mt-2">请稍候片刻</p>
      </div>
    </div>
  );
}

/**
 * 获取工具图标
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

// 导入 useAppStore
import { useAppStore } from '../store/appStore';
