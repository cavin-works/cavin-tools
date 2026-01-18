import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5",
  {
    variants: {
      status: {
        pending: "bg-muted text-muted-foreground",
        processing: "bg-primary/10 text-primary",
        completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** 是否显示图标 */
  showIcon?: boolean
  /** 自定义图标 */
  icon?: React.ReactNode
}

/**
 * 状态标签组件
 *
 * 用于显示任务/操作的状态
 * pending(待处理) | processing(处理中) | completed(已完成) | failed(失败)
 */
const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, showIcon = true, icon, children, ...props }, ref) => {
    const getIcon = () => {
      if (icon) return icon
      if (!showIcon) return null

      switch (status) {
        case "pending":
          return <Clock className="w-3 h-3" />
        case "processing":
          return <Loader2 className="w-3 h-3 animate-spin" />
        case "completed":
          return <CheckCircle className="w-3 h-3" />
        case "failed":
          return <XCircle className="w-3 h-3" />
        default:
          return null
      }
    }

    const getLabel = () => {
      if (children) return children

      switch (status) {
        case "pending":
          return "待处理"
        case "processing":
          return "处理中"
        case "completed":
          return "已完成"
        case "failed":
          return "失败"
        default:
          return ""
      }
    }

    return (
      <Badge
        ref={ref}
        className={cn(statusBadgeVariants({ status }), className)}
        {...props}
      >
        {getIcon()}
        {getLabel()}
      </Badge>
    )
  }
)

StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants }
