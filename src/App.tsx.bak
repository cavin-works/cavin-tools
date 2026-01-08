import { useCallback, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from './store/videoStore';
import { VideoInfo } from './components/VideoInfo';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';
import { ProgressBar } from './components/ProgressBar';
import { FfmpegChecker } from './components/FfmpegChecker';
import { OperationQueueProvider } from './contexts/OperationQueueContext';
import { isValidVideoFile } from './utils/fileValidation';
import { showError, showSuccess } from './utils/errorHandling';
import { listen } from '@tauri-apps/api/event';

function App() {
  const { currentVideo, setCurrentVideo, setError } = useVideoStore();
  const [isDragging, setIsDragging] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);

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
    let dragEnterUnlisten: (() => void) | undefined;
    let dragLeaveUnlisten: (() => void) | undefined;
    let dragDropUnlisten: (() => void) | undefined;

    async function setupDragListeners() {
      console.log('Setting up Tauri drag listeners...');

      // 监听文件拖入窗口
      dragEnterUnlisten = await listen('tauri://drag-enter', (event: any) => {
        console.log('Tauri drag-enter event:', event);
        setIsDragging(true);
      });

      // 监听文件拖离窗口
      dragLeaveUnlisten = await listen('tauri://drag-leave', (event: any) => {
        console.log('Tauri drag-leave event:', event);
        setIsDragging(false);
      });

      // 监听文件拖放
      dragDropUnlisten = await listen('tauri://drag-drop', (event: any) => {
        console.log('Tauri drag-drop event:', event);

        // Tauri 2.0 的 payload 结构: { paths: string[], position: {x, y} }
        const payload = event.payload as { paths: string[]; position: { x: number; y: number } };
        const paths = payload.paths;
        setIsDragging(false);

        if (paths && paths.length > 0) {
          console.log('Dropped files:', paths);
          console.log('First file path:', paths[0]);
          handleFileSelect(paths[0]);
        } else {
          console.error('No files found in payload. Payload:', event.payload);
        }
      });

      console.log('Tauri drag listeners setup complete');
    }

    setupDragListeners();

    return () => {
      console.log('Cleaning up Tauri drag listeners');
      if (dragEnterUnlisten) dragEnterUnlisten();
      if (dragLeaveUnlisten) dragLeaveUnlisten();
      if (dragDropUnlisten) dragDropUnlisten();
    };
  }, [handleFileSelect]);

  if (!appReady) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <OperationQueueProvider>
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Video Editor
        </h1>

        <div className="mb-6">
          <FfmpegChecker onReady={setFfmpegReady} />
        </div>

        {ffmpegReady && !currentVideo ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 mb-4 text-lg">
              拖拽视频文件到此处导入
            </p>
            <p className="text-gray-400 text-sm">
              支持 MP4, MOV, AVI, WMV, MKV, FLV, WebM 格式
            </p>
          </div>
        ) : ffmpegReady && currentVideo ? (
          <div className="space-y-6">
            <VideoInfo />
            <Timeline />
            <ControlPanel />
          </div>
        ) : null}

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
    </OperationQueueProvider>
  );
}

export default App;
