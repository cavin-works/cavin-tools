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
    e.stopPropagation();
    setIsDragging(false);

    console.log('=== DROP EVENT TRIGGERED ===');
    console.log('DataTransfer:', e.dataTransfer);
    console.log('Files length:', e.dataTransfer.files.length);

    try {
      // 获取拖拽的文件路径
      const files = e.dataTransfer.files;

      if (files.length === 0) {
        console.error('No files detected in drop event');
        setError('没有检测到文件');
        return;
      }

      const file = files[0];
      console.log('Dropped file:', file);
      console.log('File name:', file.name);
      console.log('File type:', file.type);
      console.log('File size:', file.size);

      // 检查file对象的所有属性
      console.log('File properties:', Object.keys(file));
      console.log('Has path property:', 'path' in file);
      if ('path' in file) {
        console.log('Path value:', (file as any).path);
      }

      // 检查是否是图片类型
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件（JPG, PNG, GIF等）');
        return;
      }

      // 尝试获取文件路径
      let filePath: string | null = null;

      // 方法1：检查file对象的path属性
      if ('path' in file && typeof (file as any).path === 'string' && (file as any).path) {
        filePath = (file as any).path;
        console.log('Using path property:', filePath);
      }
      // 方法2：尝试从webkitRelativePath获取
      else if (file.webkitRelativePath) {
        filePath = file.webkitRelativePath;
        console.log('Using webkitRelativePath:', filePath);
      }
      // 方法3：尝试从name属性构造路径（不太可靠）
      else if (file.name) {
        console.warn('No file path available, only file name:', file.name);
        setError('无法获取文件路径，请使用"选择图片"按钮');
        return;
      }

      if (filePath) {
        console.log('Loading image from path:', filePath);
        await loadImage(filePath);
      } else {
        setError('无法获取文件路径，请使用"选择图片"按钮');
      }
    } catch (err) {
      console.error('Error handling drop:', err);
      setError(`处理拖拽文件失败: ${err}`);
    }
  }, [setCurrentImage, setError]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag over event triggered');
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag leave event triggered');
    setIsDragging(false);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drag enter event triggered');
    setIsDragging(true);
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
        onDragEnter={handleDragEnter}
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
