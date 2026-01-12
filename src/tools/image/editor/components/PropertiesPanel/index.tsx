/**
 * 参数面板主组件
 * 仅包含图片编辑器的参数，拼图和批量处理已移至独立工具
 */

import { ImageInfo } from './ImageInfo';
import { TransformParams } from './TransformParams';
import { ExportOptions } from './ExportOptions';
import { ResizePanel } from './ResizePanel';
import { WatermarkPanel } from './WatermarkPanel';

export function PropertiesPanel() {
  return (
    <div className="h-full w-72 flex flex-col bg-neutral-800 border-l border-neutral-700 flex-shrink-0">
      <div className="flex-1 overflow-y-auto">
        {/* 图片信息 */}
        <ImageInfo />

        {/* 变换参数 */}
        <TransformParams />

        {/* 尺寸调整 */}
        <ResizePanel />

        {/* 水印 */}
        <WatermarkPanel />

        {/* 导出选项 */}
        <ExportOptions />
      </div>
    </div>
  );
}
