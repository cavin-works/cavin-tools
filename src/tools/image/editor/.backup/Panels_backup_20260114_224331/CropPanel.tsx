/**
 * 裁剪面板
 * 只显示裁剪信息和操作按钮（裁剪在主图上操作）
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useImageStore } from '../../store/imageStore';
import { Check, Crop as CropIcon, X, RotateCcw, Ruler } from 'lucide-react';

export function CropPanel() {
  const { currentImage, completedCrop, crop, setCropMode, setCrop, setCompletedCrop } =
    useImageStore();
  const [isProcessing, setIsProcessing] = useState(false);

  /** 应用裁剪 */
  const handleApplyCrop = async () => {
    if (!completedCrop || !currentImage || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log('✂️ 开始裁剪:', completedCrop);

      // 创建 canvas 生成裁剪后的图片
      const image = new Image();
      image.src = currentImage.path;

      await new Promise((resolve) => {
        image.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('无法获取 Canvas 上下文');
          }

          // 设置 canvas 大小为裁剪区域大小
          canvas.width = completedCrop.width;
          canvas.height = completedCrop.height;

          // 绘制裁剪后的图片
          ctx.drawImage(
            image,
            completedCrop.x,
            completedCrop.y,
            completedCrop.width,
            completedCrop.height,
            0,
            0,
            completedCrop.width,
            completedCrop.height
          );

          // 转换为 Blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              throw new Error('无法生成图片 Blob');
            }

            try {
              // 将 Blob 转换为字节数组
              const arrayBuffer = await blob.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);

              // 生成输出路径
              const inputPath = currentImage.path;
              const outputPath = inputPath.replace(/(\.[^.]+)$/, '_cropped$1');

              console.log('💾 保存图片到:', outputPath);

              // 调用后端保存图片
              await invoke('save_image_from_buffer', {
                buffer: Array.from(uint8Array),
                path: outputPath,
              });

              console.log('✅ 裁剪完成');

              // 重新加载图片
              const { loadImageInfo } = await import('../../utils/imageLoader');
              const newImageInfo = await loadImageInfo(outputPath);
              const { setCurrentImage } = await import('../../store/imageStore');
              setCurrentImage(newImageInfo);

              // 重置裁剪状态
              setCropMode(false);
              setCrop(null);
              setCompletedCrop(null);

            } catch (error) {
              console.error('❌ 保存图片失败:', error);
              alert(`保存图片失败: ${error}`);
            } finally {
              setIsProcessing(false);
            }
          }, 'image/jpeg', 0.95);

          resolve(null);
        };
      });

    } catch (error) {
      console.error('❌ 裁剪失败:', error);
      alert(`裁剪失败: ${error}`);
      setIsProcessing(false);
    }
  };

  /** 重置裁剪区域 */
  const handleReset = () => {
    setCrop(null);
    setCompletedCrop(null);
  };

  /** 取消裁剪模式 */
  const handleCancel = () => {
    setCropMode(false);
    setCrop(null);
    setCompletedCrop(null);
  };

  if (!currentImage) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CropIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">裁剪图片</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-800/50 rounded-lg px-3 py-2">
          <Ruler className="w-4 h-4 flex-shrink-0" />
          <span>请先加载图片</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* 标题和提示 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <CropIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">裁剪图片</h3>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-200 leading-relaxed flex items-start gap-2">
            <span className="flex-shrink-0">💡</span>
            <span>在主图上拖动边角调整大小，拖动内部移动位置</span>
          </p>
        </div>
      </div>

      {/* 裁剪信息 - 使用卡片式设计 */}
      {completedCrop && (
        <div className="mb-4 bg-neutral-800/50 backdrop-blur rounded-lg border border-neutral-700/50 overflow-hidden">
          {/* 信息卡片头部 */}
          <div className="bg-neutral-700/30 px-3 py-2 border-b border-neutral-700/50">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-neutral-200">裁剪信息</span>
            </div>
          </div>

          {/* 信息详情 */}
          <div className="p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">原始尺寸</span>
              <span className="text-neutral-200 font-mono">
                {currentImage.width} × {currentImage.height}
              </span>
            </div>

            <div className="h-px bg-neutral-700/50 my-2" />

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">裁剪尺寸</span>
              <span className="text-blue-300 font-mono font-semibold bg-blue-500/10 px-2 py-1 rounded">
                {Math.round(completedCrop.width)} × {Math.round(completedCrop.height)}
              </span>
            </div>

            {crop && (
              <>
                <div className="h-px bg-neutral-700/50 my-2" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">相对位置</span>
                    <span className="text-neutral-200 font-mono text-xs">
                      {Math.round(crop.x)}%, {Math.round(crop.y)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">相对大小</span>
                    <span className="text-neutral-200 font-mono text-xs">
                      {Math.round(crop.width)}% × {Math.round(crop.height)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 - 改进层次和视觉反馈 */}
      <div className="mt-auto space-y-2">
        {crop && (
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="group w-full px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:opacity-50 rounded-lg text-sm font-medium text-white disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-neutral-900/20 active:scale-[0.98]"
            title="取消裁剪操作"
          >
            <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>取消裁剪</span>
          </button>
        )}

        <button
          onClick={handleReset}
          disabled={isProcessing || !crop}
          className="group w-full px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:opacity-50 rounded-lg text-sm font-medium text-white disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-neutral-900/20 active:scale-[0.98]"
          title="重置裁剪区域"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
          <span>重置区域</span>
        </button>

        <button
          onClick={handleApplyCrop}
          disabled={!completedCrop || isProcessing}
          className="group w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:opacity-50 rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] relative overflow-hidden"
          title="应用裁剪并保存图片"
        >
          {/* 按钮背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

          {isProcessing ? (
            <>
              <Check className="w-4 h-4 animate-spin" />
              <span>处理中...</span>
            </>
          ) : (
            <>
              <CropIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>应用裁剪</span>
            </>
          )}
        </button>
      </div>

      {/* 状态提示 */}
      {crop && !completedCrop && (
        <div className="mt-2 text-center">
          <span className="text-xs text-neutral-500 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            调整裁剪区域后点击"应用裁剪"
          </span>
        </div>
      )}
    </div>
  );
}
