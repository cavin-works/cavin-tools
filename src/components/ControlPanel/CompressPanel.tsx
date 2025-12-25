import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';

type CompressPreset = 'mobile' | 'web' | 'high_quality' | 'custom';

export function CompressPanel() {
  const { currentVideo, isProcessing, setProcessing, setProgress, setOperation } = useVideoStore();
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

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">视频压缩</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预设
          </label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as CompressPreset)}
            className="w-full border rounded-lg px-3 py-2"
            disabled={isProcessing}
          >
            <option value="mobile">手机优化 (720p)</option>
            <option value="web">网络分享 (480p)</option>
            <option value="high_quality">高质量 (1080p)</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <button
          onClick={handleCompress}
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isProcessing ? '压缩中...' : '开始压缩'}
        </button>
      </div>
    </div>
  );
}
