import * as React from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface FileUploadZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 文件选择回调 */
  onFilesSelected?: (files: string[]) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 提示文本 */
  title?: string
  /** 描述文本 */
  description?: string
  /** 支持的文件格式描述 */
  formats?: string
  /** 图标 */
  icon?: React.ReactNode
  /** 是否显示选择按钮 */
  showButton?: boolean
  /** 按钮文本 */
  buttonText?: string
}

/**
 * 统一的文件上传区域组件
 *
 * 支持拖拽上传和点击选择
 * 基于 shadcn Card 和 Button 组件
 */
const FileUploadZone = React.forwardRef<HTMLDivElement, FileUploadZoneProps>(
  ({
    className,
    onFilesSelected,
    disabled = false,
    title = "拖拽文件到此处",
    description = "或点击按钮选择文件",
    formats,
    icon,
    showButton = true,
    buttonText = "选择文件",
    ...props
  }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files).map(file => file.path || file.name)
      onFilesSelected?.(files)
    }

    return (
      <Card
        ref={ref}
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragging && "border-primary bg-accent",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:border-primary/50 hover:bg-accent/50 cursor-pointer",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...props}
      >
        <div className="p-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon || <Upload className="w-6 h-6 text-primary" />}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {title}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {formats && (
              <p className="text-xs text-muted-foreground">
                {formats}
              </p>
            )}
          </div>

          {showButton && (
            <Button
              size="sm"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                // 触发文件选择对话框的逻辑由父组件处理
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              {buttonText}
            </Button>
          )}
        </div>
      </Card>
    )
  }
)

FileUploadZone.displayName = "FileUploadZone"

export { FileUploadZone }
