import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 类名合并工具函数
 * 用于合并 Tailwind 类名，避免冲突
 *
 * @example
 * cn('px-2 py-1', 'hover:bg-blue-500') // => 'px-2 py-1 hover:bg-blue-500'
 * cn('text-sm', condition && 'font-bold') // 条件类名
 * cn('base-class', undefined && 'removed-class') // 自动过滤 undefined
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
