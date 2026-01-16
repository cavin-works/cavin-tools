/**
 * Canvas 预览组件
 * 支持实时预览图片变换效果和交互式裁剪
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PixelCrop,
  type Crop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './PreviewCanvas.custom.css'; // 自定义裁剪样式
import { useImageStore } from '../store/imageStore';
import { useEditorStore } from '../store/editorStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { EditorCanvas } from './Canvas/EditorCanvas';
import { ZoomIn, ZoomOut, Minimize, Maximize, RotateCcw, Check, X } from 'lucide-react';

interface PreviewCanvasProps {
  className?: string;
}

export function PreviewCanvas({
  className = '',
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>();
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);

  const { currentImage, isCropMode, reactCrop, setReactCrop, setCompletedCrop, completedCrop, setCurrentImage } = useImageStore();
  const { activeTool, setActiveTool } = useEditorStore();
  const renderTimeoutRef = useRef<number>();
  const cropImageRef = useRef<HTMLImageElement>(null);

  // 当工具切换到裁剪时，设置裁剪模式
  const effectiveCropMode = isCropMode || activeTool === 'crop';

  // 应用裁剪
  const handleApplyCrop = useCallback(async () => {
    if (!completedCrop || !cropImageRef.current || !currentImage) {
      console.log('❌ 无法应用裁剪：缺少必要数据', {
        completedCrop,
        hasImageRef: !!cropImageRef.current,
        hasCurrentImage: !!currentImage,
      });
      return;
    }

    console.log('✂️ 开始应用裁剪...');
    console.log('📊 裁剪区域:', completedCrop);

    try {
      const image = cropImageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('无法创建 Canvas context');
      }

      console.log('🖼️ 图片信息:', {
        displayWidth: image.width,
        displayHeight: image.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });

      // 计算实际裁剪区域（考虑图片显示尺寸与实际尺寸的比例）
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      console.log('📐 缩放比例:', { scaleX, scaleY });

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      console.log('✂️ 实际裁剪区域:', {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });

      // 设置画布尺寸为裁剪后的尺寸
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      console.log('🎨 Canvas 尺寸:', {
        width: canvas.width,
        height: canvas.height,
      });

      // 绘制裁剪后的图片
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      console.log('✅ 图片已绘制到 Canvas');

      // 将裁剪后的图片转换为 Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('无法创建 Blob'));
        }, 'image/png', 0.95);
      });

      // 转换为 Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 调用后端保存裁剪后的图片
      const { invoke } = await import('@tauri-apps/api/core');
      const savedPath = await invoke<string>('save_edited_image', {
        originalPath: currentImage.path,
        imageData: base64.split(',')[1],
      });

      console.log('✅ 裁剪完成，已保存到:', savedPath);

      // 更新当前图片信息
      setCurrentImage({
        ...currentImage,
        path: savedPath,
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      });

      // 重置裁剪状态
      setReactCrop(null);
      setCompletedCrop(null);
      setActiveTool('select');

      alert('裁剪成功！');
    } catch (error) {
      console.error('❌ 裁剪失败:', error);
      alert(`裁剪失败: ${error}`);
    }
  }, [completedCrop, currentImage, setCurrentImage, setReactCrop, setCompletedCrop, setActiveTool]);

  // 取消裁剪
  const handleCancelCrop = useCallback(() => {
    console.log('❌ 取消裁剪');
    setReactCrop(null);
    setCompletedCrop(null);
    setActiveTool('select');
  }, [setReactCrop, setCompletedCrop, setActiveTool]);

  // 当进入裁剪模式且没有裁剪区域时，初始化裁剪区域
  useEffect(() => {
    if (effectiveCropMode && !reactCrop && currentImage) {
      // 创建一个居中的裁剪区域（80%大小）
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 80,
          },
          currentImage.width / currentImage.height,
          currentImage.width,
          currentImage.height
        ),
        currentImage.width,
        currentImage.height
      );
      setReactCrop(initialCrop);
    }
  }, [effectiveCropMode, reactCrop, currentImage, setReactCrop]);

  // 加载图片
  useEffect(() => {
    if (!currentImage) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      requestRender();
    };
    img.src = convertFileSrc(currentImage.path);
  }, [currentImage]);

  // 图片加载完成后初始化裁剪区域
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!effectiveCropMode) return;

    const { width, height } = e.currentTarget;

    // 创建一个居中的裁剪区域（80%大小）
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
          height: 80,
        },
        width / height,
        width,
        height
      ),
      width,
      height
    );

    setReactCrop(initialCrop);
  }, [effectiveCropMode, setReactCrop]);

  /** 裁剪完成回调 */
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
  }, [setCompletedCrop]);

  // 防抖渲染函数
  const requestRender = useCallback(() => {
    if (renderTimeoutRef.current) {
      cancelAnimationFrame(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = requestAnimationFrame(() => {
      render();
    });
  }, []);

  // 渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !currentImage) return;

    // 设置canvas尺寸
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制原始图片
    ctx.drawImage(img, 0, 0);
  }, [currentImage]);

  // 当图片变化时重新渲染
  useEffect(() => {
    requestRender();
  }, [requestRender]);

  // 清理
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        cancelAnimationFrame(renderTimeoutRef.current);
      }
    };
  }, []);

  // 缩放控制
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  // 拖拽控制
  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果在裁剪模式下，不启动拖拽
    if (isCropMode) return;

    setIsDragging(true);
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    setOffsetX(prev => prev + dx);
    setOffsetY(prev => prev + dy);
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 重置视图
  const resetView = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // 适应窗口
  const fitToWindow = () => {
    if (!currentImage || !canvasRef.current) return;

    const container = canvasRef.current.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth - 40; // 留出padding
    const containerHeight = container.clientHeight - 40;

    const scaleX = containerWidth / currentImage.width;
    const scaleY = containerHeight / currentImage.height;

    // 选择较小的缩放比例以确保图片完全可见
    const newScale = Math.min(scaleX, scaleY, 1); // 最大不超过100%
    setScale(newScale);
    setOffsetX(0);
    setOffsetY(0);
  };

  // 实际大小 (100%)
  const actualSize = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 裁剪模式下的快捷键
      if (effectiveCropMode) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleApplyCrop();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelCrop();
        }
        return;
      }

      // 非裁剪模式下的缩放快捷键
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setScale(prev => Math.min(prev * 1.2, 5));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setScale(prev => Math.max(prev / 1.2, 0.1));
      } else if (e.key === '0') {
        e.preventDefault();
        actualSize();
      } else if (e.key === '9') {
        e.preventDefault();
        fitToWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveCropMode, handleApplyCrop, handleCancelCrop]);

  if (!currentImage) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-sm text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  const imageSrc = convertFileSrc(currentImage.path);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {effectiveCropMode ? (
        // 裁剪模式：显示带裁剪框的图片
        <div
          className="relative flex items-center justify-center p-4"
          onWheel={handleWheel}
        >
          {imageSrc && (
            <div
              className="relative max-w-full max-h-full"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out',
              }}
            >
              <ReactCrop
                crop={reactCrop || undefined}
                onChange={(c) => setReactCrop(c)}
                onComplete={onCropComplete}
                aspect={undefined}
                minWidth={50}
                minHeight={50}
                keepSelection
                ruleOfThirds
              >
                <img
                  ref={cropImageRef}
                  alt="Crop me"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-full object-contain"
                />
              </ReactCrop>
            </div>
          )}

          {/* 裁剪模式下的缩放控制按钮 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-neutral-800/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl border border-neutral-700/50">
            {/* 放大按钮 */}
            <button
              onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}
              className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="放大 (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* 缩小按钮 */}
            <button
              onClick={() => setScale(prev => Math.max(prev / 1.2, 0.1))}
              className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="缩小 (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-neutral-600" />

            {/* 缩放比例显示 */}
            <div className="flex items-center gap-2 min-w-[80px] justify-center">
              <span className="text-sm font-semibold text-white">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-neutral-600" />

            {/* 适应窗口 */}
            <button
              onClick={fitToWindow}
              className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="适应窗口"
            >
              <Minimize className="w-4 h-4" />
            </button>

            {/* 实际大小 */}
            <button
              onClick={actualSize}
              className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="实际大小"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* 重置 */}
            <button
              onClick={resetView}
              className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="重置视图"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-neutral-600" />

            {/* 取消裁剪 */}
            <button
              onClick={handleCancelCrop}
              className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
              title="取消裁剪 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 确认裁剪 */}
            <button
              onClick={handleApplyCrop}
              disabled={!completedCrop}
              className={`p-2 rounded-lg text-white transition-all hover:scale-105 active:scale-95 ${
                completedCrop
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-neutral-600 cursor-not-allowed opacity-50'
              }`}
              title="确认裁剪 (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>

          {/* 裁剪模式下的快捷键提示 */}
          <div className="absolute top-4 right-4 bg-neutral-800/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-neutral-400 border border-neutral-700/50">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-neutral-300 font-mono">滚轮</kbd>
                <span>缩放图片</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-neutral-300 font-mono">拖动</kbd>
                <span>调整裁剪框</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-green-700 rounded text-green-300 font-mono">Enter</kbd>
                <span>确认裁剪</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-red-700 rounded text-red-300 font-mono">Esc</kbd>
                <span>取消裁剪</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 编辑模式：显示 EditorCanvas
        <EditorCanvas className="max-w-full max-h-full" />
      )}
    </div>
  );
}
