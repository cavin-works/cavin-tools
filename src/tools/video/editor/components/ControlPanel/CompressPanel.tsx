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
          width: preset === 'mobile' ? 1280 : preset === 'web' ? 854 : 1920,
          height: preset === 'mobile' ? 720 : preset === 'web' ? 480 : 1080,
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
      mobile: '手机优化 (720p)',
      web: '网络分享 (480p)',
      high_quality: '高质量 (1080p)',
      custom: '自定义'
    };

    addToQueue({
      type: 'compress',
      name: `压缩 (${presetNames[preset]})`,
      params: {
        preset,
        width: preset === 'mobile' ? 1280 : preset === 'web' ? 854 : 1920,
        height: preset === 'mobile' ? 720 : preset === 'web' ? 480 : 1080,
      }
    });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">视频压缩</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            预设
          </label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as CompressPreset)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            disabled={isProcessing}
          >
            <option value="mobile">手机优化 (720p)</option>
            <option value="web">网络分享 (480p)</option>
            <option value="high_quality">高质量 (1080p)</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="flex-1 bg-black text-white py-2 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500"
          >
            {isProcessing ? '压缩中...' : '立即执行'}
          </button>
          <button
            onClick={handleAddToQueue}
            disabled={!currentVideo}
            className="px-4 bg-neutral-600 text-white py-2 rounded-lg hover:bg-neutral-700 disabled:bg-neutral-300 disabled:text-neutral-500 flex items-center gap-2"
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
