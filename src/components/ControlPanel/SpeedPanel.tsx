import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
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

        <div className="flex gap-2">
          <button
            onClick={handleSpeedChange}
            disabled={isProcessing}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isProcessing ? '处理中...' : '立即执行'}
          </button>
          <button
            onClick={handleAddToQueue}
            disabled={!currentVideo}
            className="px-4 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 flex items-center gap-2"
            title="添加到操作队列"
          >
            <Plus className="w-4 h-4" />
            队列
          </button>
        </div>

        {outputPath && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium mb-2">✓ 变速完成!</p>
            <p className="text-xs text-green-700 break-all mb-2">
              输出文件: {outputPath}
            </p>
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
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
