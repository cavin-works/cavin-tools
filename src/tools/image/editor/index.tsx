/**
 * 图片编辑器主组件
 * 全屏画布 + 底部工具栏设计
 */

import { FileUploader } from './components/common/FileUploader';
import { ImageInfoBar } from './components/ImageInfoBar';
import { PreviewCanvas } from './components/PreviewCanvas';
import { EditorToolbar } from './components/EditorToolbar';
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

  // 已加载图片，显示全屏编辑界面
  return (
    <div className="flex h-screen flex-col bg-neutral-900 text-white overflow-hidden">
      {/* 顶部信息条 */}
      <ImageInfoBar image={currentImage} />

      {/* 全屏画布区域 - 工具栏浮动显示在底部 */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <PreviewCanvas className="max-w-full max-h-full" />

        {/* 底部工具栏 */}
        <EditorToolbar />
      </div>
    </div>
  );
}
