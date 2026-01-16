/**
 * 工具按钮组件
 */

import { ReactNode } from 'react';

interface ToolButtonProps {
  icon: ReactNode;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}

export function ToolButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
  title,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`
        p-2.5 rounded-lg transition-all duration-200
        ${
          active
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        flex items-center justify-center gap-1.5
      `}
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      {label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
}
