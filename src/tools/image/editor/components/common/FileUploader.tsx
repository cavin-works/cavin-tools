/**
 * 文件上传组件
 * 支持点击选择和拖拽上传
 */

import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Upload, AlertCircle } from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import type { ImageInfo } from '../../types';

export function FileUploader() {
  const { setCurrentImage, setError, error } = useImageStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Opening file dialog...');

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: '图片',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff']
          }
        ]
      });

      console.log('Selected file:', selected);

      if (selected && typeof selected === 'string') {
        await loadImage(selected);
      } else {
        console.log('No file selected or invalid selection');
      }
    } catch (err) {
      console.error('Error selecting file:', err);
      setError(`选择文件失败: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentImage, setError]);

  const loadImage = async (path: string) => {
    try {
      console.log('Loading image:', path);
      const imageInfo: ImageInfo = await invoke('load_image', { path });
      console.log('Image loaded successfully:', imageInfo);
      setCurrentImage(imageInfo);
    } catch (err) {
      console.error('Error loading image:', err);
      setError(`加载图片失败: ${err}`);
      throw err;
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    // 尝试从拖拽事件中获取文件路径
    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      const file = files[0];

      // 检查是否是图片类型
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件');
        return;
      }

      // 注意：在Tauri中，Web浏览器拖拽的File对象无法直接获取文件路径
      // 这里使用一个变通方法：提示用户选择文件
      // 但如果文件有path属性（某些Tauri版本支持），则直接使用
      if ('path' in file && typeof (file as any).path === 'string') {
        await loadImage((file as any).path);
      } else {
        // 如果无法获取路径，使用文件选择器让用户手动选择
        setError('拖拽文件暂不支持，请使用"选择图片"按钮');
      }
    }
  }, [setCurrentImage, setError]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* 拖拽区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-neutral-600 hover:border-neutral-500'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !isLoading && handleFileSelect()}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${
              isDragging ? 'bg-blue-500/20' : 'bg-neutral-800'
            }`}>
              <Upload className={`w-8 h-8 ${
                isDragging ? 'text-blue-400' : 'text-neutral-400'
              }`} />
            </div>
          </div>
          <div>
            <p className="text-neutral-300 text-lg mb-2">
              {isLoading ? '正在加载...' : '拖拽图片到此处'}
            </p>
            <p className="text-xs text-neutral-500">或点击下方按钮选择文件</p>
          </div>
          <p className="text-xs text-neutral-600">
            支持 JPG, PNG, GIF, WebP, BMP, TIFF
          </p>
        </div>
      </div>

      {/* 选择图片按钮 */}
      <button
        onClick={handleFileSelect}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-5 h-5" />
        {isLoading ? '加载中...' : '选择图片'}
      </button>
    </div>
  );
}
