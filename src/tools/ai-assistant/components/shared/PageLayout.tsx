import { isMac } from '@/lib/platform';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  title?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * AI 助手页面统一布局组件
 *
 * 提供统一的页面结构：
 * - macOS 拖动区域（仅 macOS）
 * - 固定高度的 Header（避免布局跳动）
 * - 独立滚动的内容区域
 */
export function PageLayout({
  title,
  breadcrumbs,
  actions,
  children,
  className
}: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header - 根据内容动态调整 */}
      {(title || breadcrumbs || actions) && (
        <header className={cn(
          "flex-shrink-0 border-b border-border px-6 relative",
          title || breadcrumbs ? "h-16" : "h-14",
          isMac() && "pt-10"
        )}>
          {/* macOS 拖动区域 - 覆盖整个 Header */}
          {isMac() && (
            <div
              data-tauri-drag-region
              className="absolute inset-0 pointer-events-none"
            />
          )}
          <div className="h-full flex items-center justify-between relative z-10">
            {(title || breadcrumbs) && (
              <div className="flex flex-col gap-1">
                {breadcrumbs && (
                  <div className="text-xs text-muted-foreground">
                    {breadcrumbs}
                  </div>
                )}
                {title && (
                  <h1 className="text-2xl font-bold">
                    {title}
                  </h1>
                )}
              </div>
            )}

            {actions && (
              <div className={cn(
                "flex items-center gap-2",
                !(title || breadcrumbs) && "ml-auto"
              )}>
                {actions}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Content - 独立滚动 */}
      <main className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden",
        "px-6 py-4",
        className
      )}>
        {children}
      </main>
    </div>
  );
}
