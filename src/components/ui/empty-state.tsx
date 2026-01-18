import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 图标 */
  icon?: React.ReactNode
  /** 标题 */
  title: string
  /** 描述 */
  description?: string
  /** 操作按钮文本 */
  actionLabel?: string
  /** 操作按钮点击回调 */
  onAction?: () => void
}

/**
 * 空状态展示组件
 *
 * 用于显示"暂无数据"、"未选择文件"等空状态场景
 * 统一样式和交互
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({
    className,
    icon,
    title,
    description,
    actionLabel,
    onAction,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 px-4 text-center",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            {icon}
          </div>
        )}

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {description}
          </p>
        )}

        {actionLabel && onAction && (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    )
  }
)

EmptyState.displayName = "EmptyState"

export { EmptyState }
