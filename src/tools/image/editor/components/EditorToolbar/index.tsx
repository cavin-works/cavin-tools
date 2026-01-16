/**
 * 编辑器工具栏组件
 * 显示在画布底部，提供所有编辑工具
 */

import { useState } from 'react';
import {
  MousePointer2,
  Pen,
  ArrowRight,
  Circle,
  Square,
  Type,
  Grid3x3,
  Crop,
  RotateCw,
  FlipHorizontal,
  Expand,
  Undo2,
  Redo2,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { ToolButton } from './ToolButton';
import { ColorPicker } from './ColorPicker';
import { useEditorStore, useCanUndo, useCanRedo } from '../../store/editorStore';
import { useImageStore } from '../../store/imageStore';
import { mergeLayersToCanvas, canvasToBlob, blobToBase64 } from '../../utils/export';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';

export function EditorToolbar() {
  const { activeTool, setActiveTool, undo, redo, annotations } = useEditorStore();
  const { currentImage } = useImageStore();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const [isSaving, setIsSaving] = useState(false);

  // 保存功能
  const handleSave = async () => {
    if (!currentImage) {
      console.error('没有可保存的图片');
      return;
    }

    try {
      setIsSaving(true);
      console.log('💾 开始保存图片...');

      const imageUrl = convertFileSrc(currentImage.path);

      // 1. 合并所有图层
      console.log('🎨 合并图层中...');
      const mergedCanvas = await mergeLayersToCanvas(
        imageUrl,
        currentImage.width,
        currentImage.height,
        annotations
      );

      // 2. 转换为 Blob
      console.log('📦 转换格式中...');
      const blob = await canvasToBlob(mergedCanvas, 'image/png', 0.95);

      // 3. 转换为 Base64
      const base64 = await blobToBase64(blob);

      // 4. 调用后端保存图片
      console.log('💾 保存到文件中...');
      const savedPath = await invoke<string>('save_edited_image', {
        originalPath: currentImage.path,
        imageData: base64.split(',')[1], // 去掉 data:image/png;base64, 前缀
      });

      console.log('✅ 保存成功:', savedPath);
      alert(`图片已保存到: ${savedPath}`);
    } catch (error) {
      console.error('❌ 保存失败:', error);
      alert(`保存失败: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 清除所有标注
  const handleClear = () => {
    if (annotations.length === 0) {
      console.log('没有需要清除的标注');
      return;
    }

    if (confirm('确定要清除所有标注吗？此操作无法撤销。')) {
      console.log('🗑️ 清除所有标注');
      // 删除所有标注
      annotations.forEach(annotation => {
        useEditorStore.getState().deleteAnnotation(annotation.id);
      });
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-neutral-700/50">
        {/* 选择工具组 */}
        <ToolButton
          icon={<MousePointer2 />}
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          title="选择工具 (V)"
        />

        {/* 分隔线 */}
        <div className="w-px h-8 bg-neutral-600 mx-1" />

        {/* 绘制工具组 */}
        <ToolButton
          icon={<Pen />}
          active={activeTool === 'pen'}
          onClick={() => setActiveTool('pen')}
          title="画笔工具 (P)"
        />

        {/* 标注工具组 */}
        <ToolButton
          icon={<ArrowRight />}
          active={activeTool === 'arrow'}
          onClick={() => setActiveTool('arrow')}
          title="箭头标注 (A)"
        />
        <ToolButton
          icon={<Circle />}
          active={activeTool === 'circle'}
          onClick={() => setActiveTool('circle')}
          title="圆形标注 (O)"
        />
        <ToolButton
          icon={<Square />}
          active={activeTool === 'rectangle'}
          onClick={() => setActiveTool('rectangle')}
          title="矩形标注 (R)"
        />
        <ToolButton
          icon={<Type />}
          active={activeTool === 'text'}
          onClick={() => setActiveTool('text')}
          title="文字工具 (T)"
        />

        {/* 分隔线 */}
        <div className="w-px h-8 bg-neutral-600 mx-1" />

        {/* 效果工具组 */}
        <ToolButton
          icon={<Grid3x3 />}
          active={activeTool === 'mosaic'}
          onClick={() => setActiveTool('mosaic')}
          title="马赛克工具 (M)"
        />

        {/* 颜色选择器 */}
        <ColorPicker />

        {/* 分隔线 */}
        <div className="w-px h-8 bg-neutral-600 mx-1" />

        {/* 变换工具组 */}
        <ToolButton
          icon={<Crop />}
          active={activeTool === 'crop'}
          onClick={() => setActiveTool('crop')}
          title="裁剪工具 (C)"
        />
        <ToolButton
          icon={<RotateCw />}
          active={activeTool === 'rotate'}
          onClick={() => setActiveTool('rotate')}
          title="旋转 90° (Ctrl+R)"
        />
        <ToolButton
          icon={<FlipHorizontal />}
          active={activeTool === 'flip'}
          onClick={() => setActiveTool('flip')}
          title="翻转 (F)"
        />
        <ToolButton
          icon={<Expand />}
          active={activeTool === 'resize'}
          onClick={() => setActiveTool('resize')}
          title="调整大小 (S)"
        />

        {/* 分隔线 */}
        <div className="w-px h-8 bg-neutral-600 mx-1" />

        {/* 历史工具组 */}
        <ToolButton
          icon={<Undo2 />}
          disabled={!canUndo}
          onClick={undo}
          title="撤销 (Ctrl+Z)"
        />
        <ToolButton
          icon={<Redo2 />}
          disabled={!canRedo}
          onClick={redo}
          title="重做 (Ctrl+Y)"
        />

        {/* 分隔线 */}
        <div className="w-px h-8 bg-neutral-600 mx-1" />

        {/* 操作工具组 */}
        <ToolButton
          icon={isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          onClick={handleSave}
          disabled={isSaving}
          title={isSaving ? "保存中..." : "保存 (Ctrl+S)"}
        />
        <ToolButton
          icon={<X />}
          onClick={handleClear}
          title="清除所有标注"
        />
      </div>
    </div>
  );
}
