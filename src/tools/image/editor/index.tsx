/**
 * 图片编辑器主组件
 * 标签页式布局：标签导航（左）+ 预览画布（中）+ 操作队列（右）
 */

import { useState } from 'react';
import { FileUploader } from './components/common/FileUploader';
import { TabPanel } from './components/TabPanel';
import { ImageInfoBar } from './components/ImageInfoBar';
import { OperationQueuePanel } from './components/OperationQueuePanel';
import { PreviewCanvas } from './components/PreviewCanvas';
import { ImageOperationQueueProvider } from './contexts/ImageOperationQueueContext';
import { useImageStore } from './store/imageStore';

export function ImageEditor() {
  const { currentImage } = useImageStore();

  // 未加载图片时显示文件上传组件
  if (!currentImage) {
    return (
      <div className="flex h-screen bg-neutral-900 text-white items-center justify-center">
        <div className="max-w-md w-full">
          <FileUploader />
        </div>
      </div>
    );
  }

  // 已加载图片，显示编辑界面
  return (
    <ImageOperationQueueProvider>
      <div className="flex h-screen bg-neutral-900 text-white">
        {/* 左侧标签页导航 */}
        <TabPanel />

        {/* 中央画布区 */}
        <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
          {/* 图片信息条 */}
          <ImageInfoBar image={currentImage} />

          {/* 预览画布 */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <PreviewCanvas className="max-w-full max-h-full" />
          </div>
        </div>

        {/* 右侧操作队列 */}
        <OperationQueuePanel />
      </div>
    </ImageOperationQueueProvider>
  );
}
