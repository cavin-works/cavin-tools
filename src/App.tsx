import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from './store/videoStore';
import { VideoInfo } from './components/VideoInfo';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';
import { ProgressBar } from './components/ProgressBar';
import { isValidVideoFile } from './utils/fileValidation';
import { showError, showSuccess } from './utils/errorHandling';

function App() {
  const { currentVideo, setCurrentVideo, setError } = useVideoStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!isValidVideoFile(filePath)) {
      showError('不支持的视频格式,请选择 MP4/MOV/AVI/WMV 等格式');
      setError('不支持的视频格式');
      return;
    }

    try {
      const videoInfo = await invoke<import('./types').VideoInfo>('load_video', {
        path: filePath
      });
      setCurrentVideo(videoInfo);
      setError(null);
      showSuccess('视频加载成功');
    } catch (error) {
      const errorMsg = `加载视频失败: ${error}`;
      showError(errorMsg);
      setError(errorMsg);
    }
  }, [setCurrentVideo, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    console.log('Drop event triggered');
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);

    if (files.length > 0) {
      // Tauri会提供文件路径
      const path = (files[0] as any).path;
      console.log('File path:', path);
      if (path) {
        handleFileSelect(path);
      } else {
        showError('无法获取文件路径');
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
      className="min-h-screen bg-gray-50"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Video Editor
        </h1>

        {!currentVideo ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4 text-lg">
              拖拽视频文件到此处导入
            </p>
            <p className="text-gray-400 text-sm">
              支持 MP4, MOV, AVI, WMV, MKV, FLV, WebM 格式
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <VideoInfo />
            <Timeline />
            <ControlPanel />
          </div>
        )}

        {isDragging && (
          <div className="fixed inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center pointer-events-none z-50">
            <p className="text-2xl font-semibold text-blue-700">
              松开以导入视频
            </p>
          </div>
        )}
      </div>

      <ProgressBar />
    </div>
  );
}

export default App;
