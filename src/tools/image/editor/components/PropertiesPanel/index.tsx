/**
 * 参数面板主组件
 */

import { ImageInfo } from './ImageInfo';
import { TransformParams } from './TransformParams';
import { ExportOptions } from './ExportOptions';
import { ResizePanel } from './ResizePanel';
import { WatermarkPanel } from './WatermarkPanel';
import { CollagePanel } from './CollagePanel';
import { BatchProcessorPanel } from './BatchProcessorPanel';

export function PropertiesPanel() {
  return (
    <div className="h-full flex flex-col bg-neutral-800 border-l border-neutral-700">
      <div className="flex-1 overflow-y-auto">
        {/* 图片信息 */}
        <ImageInfo />

        {/* 变换参数 */}
        <TransformParams />

        {/* 尺寸调整 */}
        <ResizePanel />

        {/* 水印 */}
        <WatermarkPanel />

        {/* 拼图 */}
        <CollagePanel />

        {/* 批量处理 */}
        <BatchProcessorPanel />

        {/* 导出选项 */}
        <ExportOptions />
      </div>
    </div>
  );
}
