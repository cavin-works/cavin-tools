/**
 * 工具按钮组件
 */

import { LucideIcon } from 'lucide-react';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  shortcut?: string;
}

export function ToolButton({ icon: Icon, label, isActive = false, onClick, shortcut }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all
        ${isActive
          ? 'bg-blue-600 text-white'
          : 'text-neutral-300 hover:bg-neutral-700'
        }
      `}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs opacity-60">{shortcut}</span>
      )}
    </button>
  );
}
