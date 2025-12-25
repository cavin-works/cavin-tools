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
              拖拽视频文件到此处,或点击导入
            </p>
            <button
              onClick={async () => {
                try {
                  const selected = await invoke<string>('open_file_dialog');
                  if (selected) {
                    handleFileSelect(selected);
                  }
                } catch (error) {
                  showError('打开文件对话框失败');
                }
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              导入视频
            </button>
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
