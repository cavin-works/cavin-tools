/**
 * 文件上传组件
 * 支持点击选择和拖拽上传
 */

import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useImageStore } from '../../store/imageStore';
import type { ImageInfo } from '../../types';

export function FileUploader() {
  const { setCurrentImage, setError } = useImageStore();

  const handleFileSelect = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: '图片',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff']
          }
        ]
      });

      if (selected && typeof selected === 'string') {
        await loadImage(selected);
      }
    } catch (err) {
      setError(err as string);
    }
  }, [setCurrentImage, setError]);

  const loadImage = async (path: string) => {
    try {
      const imageInfo: ImageInfo = await invoke('load_image', { path });
      setCurrentImage(imageInfo);
    } catch (err) {
      setError(err as string);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      // 注意：Tauri 不能直接访问 File 对象，需要使用原生文件选择器
      // 这里简化处理，提示用户使用文件选择器
      alert('请使用"选择图片"按钮来选择文件');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-neutral-600 rounded-lg p-8 text-center hover:border-neutral-500 transition-colors cursor-pointer"
      onClick={handleFileSelect}
    >
      <div className="space-y-2">
        <div className="text-4xl">📁</div>
        <p className="text-neutral-300">点击选择图片或拖拽到此处</p>
        <p className="text-xs text-neutral-500">支持 JPG, PNG, GIF, WebP, BMP, TIFF</p>
      </div>
    </div>
  );
}
