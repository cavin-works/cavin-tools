import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';

export function SpeedPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const [speed, setSpeed] = useState(1.0);
  const [preservePitch, setPreservePitch] = useState(false);

  const handleSpeedChange = async () => {
    if (!currentVideo) return;

    setProcessing(true);

    try {
      const outputPath = await invoke<string>('change_video_speed', {
        inputPath: currentVideo.path,
        params: { speed, preservePitch }
      });

      alert(`变速完成: ${outputPath}`);
    } catch (error) {
      alert(`变速失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">视频变速</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            速度: {speed}x
          </label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
            disabled={isProcessing}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
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
            className="mr-2"
          />
          <span className="text-sm">保持音高(避免声音变调)</span>
        </label>

        <button
          onClick={handleSpeedChange}
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isProcessing ? '处理中...' : '应用变速'}
        </button>
      </div>
    </div>
  );
}
