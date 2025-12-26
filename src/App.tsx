import { useCallback, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from './store/videoStore';
import { VideoInfo } from './components/VideoInfo';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';
import { ProgressBar } from './components/ProgressBar';
import { isValidVideoFile } from './utils/fileValidation';
import { showError, showSuccess } from './utils/errorHandling';
import { listen } from '@tauri-apps/api/event';

function App() {
  const { currentVideo, setCurrentVideo, setError } = useVideoStore();
  const [isDragging, setIsDragging] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // 标记应用已加载
  useEffect(() => {
    setAppReady(true);
    console.log('App mounted successfully');
  }, []);

  const handleFileSelect = useCallback(async (filePath: string) => {
    console.log('handleFileSelect called with:', filePath);

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

  // 监听Tauri的文件拖拽事件
  useEffect(() => {
    const unlisten = listen('tauri://file-drop', (event: any) => {
      console.log('Tauri file-drop event:', event);
      const paths = event.payload as string[];
      if (paths && paths.length > 0) {
        handleFileSelect(paths[0]);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [handleFileSelect]);

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

  if (!appReady) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

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
