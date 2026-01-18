import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
import { themeColors } from '@/core/theme/themeConfig';
import { FolderOpen, Plus } from 'lucide-react';

export function SpeedPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const { addToQueue } = useOperationQueue();
  const [speed, setSpeed] = useState(1.0);
  const [preservePitch, setPreservePitch] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const handleSpeedChange = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setOutputPath(null);

    try {
      const path = await invoke<string>('change_video_speed', {
        inputPath: currentVideo.path,
        params: { speed, preservePitch }
      });

      setOutputPath(path);
    } catch (error) {
      alert(`变速失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentVideo) return;

    addToQueue({
      type: 'speed',
      name: `变速 ${speed}x${preservePitch ? ' (保持音高)' : ''}`,
      params: { speed, preservePitch }
    });
  };

  const handleOpenFolder = async () => {
    if (!outputPath) return;

    // 打开输出文件所在的文件夹
    const folderPath = outputPath.substring(0, outputPath.lastIndexOf('\\'));
    await open(folderPath);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">视频变速</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            速度: {speed}x
          </label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full accent-black dark:accent-neutral-400"
            disabled={isProcessing}
          />
          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span>0.25x</span>
            <span>1x</span>
            <span>4x</span>
          </div>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={preservePitch}
            onChange={(e) => setPreservePitch(e.target.checked)}
            className="mr-2 accent-black dark:accent-neutral-400"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">保持音高(避免声音变调)</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSpeedChange}
            disabled={isProcessing}
            className={themeColors.button.primary + " flex-1"}
          >
            {isProcessing ? '处理中...' : '立即执行'}
          </button>
          <button
            onClick={handleAddToQueue}
            disabled={!currentVideo}
            className={themeColors.button.secondary + " px-4 flex items-center gap-2"}
            title="添加到操作队列"
          >
            <Plus className="w-4 h-4" />
            队列
          </button>
        </div>

        {outputPath && (
          <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg">
            <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium mb-2">✓ 变速完成!</p>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 break-all mb-2">
              输出文件: {outputPath}
            </p>
            <button
              onClick={handleOpenFolder}
              className={themeColors.button.primary + " flex items-center gap-2 text-sm px-3 py-1.5 rounded"}
            >
              <FolderOpen className="w-4 h-4" />
              打开文件夹
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
