import { useCallback, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
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
import { Upload, Video } from 'lucide-react';
import type { VideoInfo as VideoInfoType } from './types';

/**
 * 视频编辑器工具
 *
 * 提供视频压缩、变速、截断、提取帧、GIF转换等功能
 */
export function VideoEditor() {
  const { currentVideo, setCurrentVideo, setError } = useVideoStore();
  const [isDragging, setIsDragging] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);

  // 标记应用已加载
  useEffect(() => {
    setAppReady(true);
    console.log('VideoEditor mounted successfully');
  }, []);

  const handleFileSelect = useCallback(async (filePath: string) => {
    console.log('handleFileSelect called with:', filePath);

    if (!isValidVideoFile(filePath)) {
      showError('不支持的视频格式,请选择 MP4/MOV/AVI/WMV 等格式');
      setError('不支持的视频格式');
      return;
    }

    try {
      const videoInfo = await invoke<VideoInfoType>('load_video', {
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

  // 处理文件选择按钮点击
  const handleSelectFileButtonClick = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: '视频文件',
            extensions: ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg']
          }
        ]
      });

      if (selected && typeof selected === 'string') {
        handleFileSelect(selected);
      }
    } catch (error) {
      // 用户取消了文件选择，不需要显示错误
      console.log('File selection was cancelled');
    }
  }, [handleFileSelect]);

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
    return <div className="flex items-center justify-center h-screen text-foreground">加载中...</div>;
  }

  return (
    <OperationQueueProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            视频编辑器
          </h1>

          <div className="mb-6">
            <FfmpegChecker onReady={setFfmpegReady} />
          </div>

          {ffmpegReady && !currentVideo ? (
            <div className="text-center py-20">
              {/* 拖拽区域 */}
              <div className="border-2 border-dashed border-border rounded-xl p-12 mb-8 hover:border-primary/50 hover:bg-accent transition-all duration-200">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <Video className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground text-lg font-semibold mb-2">
                      拖拽视频文件到此处导入
                    </p>
                    <p className="text-muted-foreground text-sm">
                      或点击下方按钮选择文件
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    支持 MP4, MOV, AVI, WMV, MKV, FLV, WebM 格式
                  </p>
                </div>
              </div>

              {/* 选择文件按钮 */}
              <button
                onClick={handleSelectFileButtonClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Upload className="w-5 h-5" />
                选择视频文件
              </button>
            </div>
          ) : ffmpegReady && currentVideo ? (
            <div className="space-y-6">
              <VideoInfo />
              <Timeline />
              <ControlPanel />
            </div>
          ) : null}

          {isDragging && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none z-50">
              <p className="text-2xl font-semibold text-foreground">
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
