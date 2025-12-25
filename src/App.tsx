import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from './store/videoStore';
import { VideoInfo } from './components/VideoInfo';
import { isValidVideoFile } from './utils/fileValidation';

function App() {
  const { currentVideo, setCurrentVideo, setError } = useVideoStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!isValidVideoFile(filePath)) {
      setError('不支持的视频格式,请选择 MP4/MOV/AVI/WMV 等格式');
      return;
    }

    try {
      const videoInfo = await invoke<import('./types').VideoInfo>('load_video', {
        path: filePath
      });
      setCurrentVideo(videoInfo);
      setError(null);
    } catch (error) {
      setError(`加载视频失败: ${error}`);
    }
  }, [setCurrentVideo, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Tauri会提供文件路径
      const path = (files[0] as any).path;
      if (path) {
        handleFileSelect(path);
      }
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      className={`container ${isDragging ? 'bg-primary-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Video Editor
      </h1>

      {currentVideo ? (
        <VideoInfo />
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600 mb-4 text-lg">
            拖拽视频文件到此处,或点击导入
          </p>
          <button
            onClick={async () => {
              const selected = await invoke<string>('open_file_dialog');
              if (selected) {
                handleFileSelect(selected);
              }
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            导入视频
          </button>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 bg-primary-500 bg-opacity-20 flex items-center justify-center pointer-events-none z-50">
          <p className="text-2xl font-semibold text-primary-700">
            松开以导入视频
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
