import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
import { Plus } from 'lucide-react';

type CompressPreset = 'mobile' | 'web' | 'high_quality' | 'custom';

export function CompressPanel() {
  const { currentVideo, isProcessing, setProcessing, setProgress, setOperation } = useVideoStore();
  const { addToQueue } = useOperationQueue();
  const [preset, setPreset] = useState<CompressPreset>('mobile');

  const handleCompress = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setProgress(0);
    setOperation('正在压缩视频...');

    try {
      const outputPath = await invoke<string>('compress_video_command', {
        inputPath: currentVideo.path,
        params: {
          preset,
          // 不指定宽高，保持原分辨率
        }
      });

      setProgress(100);
      alert(`压缩完成: ${outputPath}`);
    } catch (error) {
      alert(`压缩失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentVideo) return;

    const presetNames = {
      mobile: '手机优化',
      web: '网络分享',
      high_quality: '高质量',
      custom: '自定义'
    };

    addToQueue({
      type: 'compress',
      name: `压缩 (${presetNames[preset]})`,
      params: {
        preset,
        // 不指定宽高，保持原分辨率
      }
    });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">视频压缩</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            预设
          </label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as CompressPreset)}
            className="w-full border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-neutral-400 focus:border-black dark:focus:border-neutral-400"
            disabled={isProcessing}
          >
            <option value="mobile">手机优化 - 小文件，适合移动设备</option>
            <option value="web">网络分享 - 更小文件，适合网络传输</option>
            <option value="high_quality">高质量 - 保持较好画质</option>
            <option value="custom">自定义</option>
          </select>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
            ℹ️ 压缩不会改变视频分辨率，只通过调整编码参数减小文件大小
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="flex-1 bg-black dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400"
          >
            {isProcessing ? '压缩中...' : '立即执行'}
          </button>
          <button
            onClick={handleAddToQueue}
            disabled={!currentVideo}
            className="px-4 bg-neutral-600 dark:bg-neutral-500 text-white py-2 rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-400 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400 flex items-center gap-2"
            title="添加到操作队列"
          >
            <Plus className="w-4 h-4" />
            队列
          </button>
        </div>
      </div>
    </div>
  );
}
