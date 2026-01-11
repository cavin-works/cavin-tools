/**
 * 工具栏主组件
 */

import { useState } from 'react';
import {
  MousePointer2,
  Crop as CropIcon,
  RotateCw,
  FlipHorizontal,
  FileImage,
} from 'lucide-react';
import { ToolButton } from './ToolButton';
import { useImageStore } from '../../store/imageStore';

interface Tool {
  id: string;
  icon: any;
  label: string;
  shortcut: string;
}

const TOOLS: Tool[] = [
  { id: 'select', icon: MousePointer2, label: '选择', shortcut: 'V' },
  { id: 'crop', icon: CropIcon, label: '裁剪', shortcut: 'C' },
  { id: 'rotate', icon: RotateCw, label: '旋转', shortcut: 'R' },
  { id: 'flip', icon: FlipHorizontal, label: '翻转', shortcut: 'F' },
];

export function Toolbar() {
  const [activeTool, setActiveTool] = useState('select');
  const { resetTransforms } = useImageStore();

  const handleToolClick = (toolId: string) => {
    setActiveTool(toolId);
    // 切换工具时重置所有变换
    if (toolId === 'select') {
      resetTransforms();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具列表 */}
      <div className="flex-1 p-3 space-y-1">
        {TOOLS.map((tool) => (
          <ToolButton
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            isActive={activeTool === tool.id}
            onClick={() => handleToolClick(tool.id)}
            shortcut={tool.shortcut}
          />
        ))}
      </div>

      {/* 导出按钮 */}
      <div className="p-3 border-t border-neutral-700">
        <ToolButton
          icon={FileImage}
          label="导出图片"
          onClick={() => {/* TODO */}}
          shortcut="Ctrl+S"
        />
      </div>
    </div>
  );
}
