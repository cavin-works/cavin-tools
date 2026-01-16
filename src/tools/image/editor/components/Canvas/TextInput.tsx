/**
 * 文字输入组件
 * 用于在画布上直接输入文字
 */

import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { Point } from '../../types';

interface TextInputProps {
  position: Point;
  onComplete: (text: string) => void;
  onCancel: () => void;
}

export function TextInput({ position, onComplete, onCancel }: TextInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toolSettings } = useEditorStore();

  // 自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter 或 Cmd+Enter 完成输入
      e.preventDefault();
      if (text.trim()) {
        onComplete(text.trim());
      } else {
        onCancel();
      }
    }
  };

  // 处理失焦
  const handleBlur = () => {
    // 延迟一点再处理，避免点击按钮时立即失焦
    setTimeout(() => {
      if (text.trim()) {
        onComplete(text.trim());
      } else {
        onCancel();
      }
    }, 200);
  };

  // 完成按钮
  const handleComplete = () => {
    if (text.trim()) {
      onComplete(text.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="absolute z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 文字输入框 */}
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="输入文字..."
        className="min-w-[200px] min-h-[60px] px-3 py-2 bg-white text-gray-900 border-2 border-blue-500 rounded-lg shadow-2xl resize outline-none font-sans"
        style={{
          fontSize: `${toolSettings.fontSize}px`,
          fontFamily: toolSettings.fontFamily,
          fontWeight: toolSettings.fontWeight,
          color: toolSettings.color,
        }}
      />

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleComplete}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-all"
        >
          完成 (Ctrl+Enter)
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-neutral-600 hover:bg-neutral-500 text-white text-sm rounded-lg transition-all"
        >
          取消 (Esc)
        </button>
      </div>

      {/* 提示文字 */}
      <div className="mt-1 text-xs text-neutral-400">
        按 Ctrl+Enter 完成，Esc 取消
      </div>
    </div>
  );
}
