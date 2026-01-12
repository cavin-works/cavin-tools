/**
 * 图片编辑器主组件
 * 三栏布局：工具栏（左）+ 画布（中）+ 参数面板（右）
 */

import { FileUploader } from './components/common/FileUploader';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { useImageStore } from './store/imageStore';
import { convertFileSrc } from '@tauri-apps/api/core';

export function ImageEditor() {
  const { currentImage } = useImageStore();

  return (
    <div className="flex h-screen bg-neutral-900 text-white">
      {/* 左侧工具栏 */}
      <Toolbar />

      {/* 中央画布区 */}
      <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4">
          {!currentImage ? (
            <div className="max-w-md w-full">
              <FileUploader />
            </div>
          ) : (
            <div className="text-center">
              <img
                src={convertFileSrc(currentImage.path)}
                alt={currentImage.filename}
                className="max-w-full max-h-full object-contain"
              />
              <div className="mt-4 text-sm text-neutral-400">
                {currentImage.width} x {currentImage.height}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧参数面板 */}
      <PropertiesPanel />
    </div>
  );
}
