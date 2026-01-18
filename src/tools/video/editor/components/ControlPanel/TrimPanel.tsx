import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
import { formatDuration } from '../../utils/fileValidation';
import { Plus } from 'lucide-react';

export function TrimPanel() {
  const { currentVideo, timelineStart, timelineEnd, isProcessing, setProcessing, setProgress, setOperation } = useVideoStore();
  const { addToQueue } = useOperationQueue();
  const [precise, setPrecise] = useState(false);

  const handleTrim = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setProgress(0);
    setOperation('正在截断视频...');

    try {
      const outputPath = await invoke<string>('trim_video', {
        inputPath: currentVideo.path,
        params: {
          start_time: timelineStart,
          end_time: timelineEnd,
          precise
        }
      });

      setProgress(100);
      alert(`截断完成: ${outputPath}`);
    } catch (error) {
      alert(`截断失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentVideo) return;

    addToQueue({
      type: 'trim',
      name: `截断 (${formatDuration(timelineStart)} - ${formatDuration(timelineEnd)})`,
      params: {
        start_time: timelineStart,
        end_time: timelineEnd,
        precise
      }
    });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">截断视频</h3>

      <div className="space-y-4">
        <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            开始时间: {formatDuration(timelineStart)}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            结束时间: {formatDuration(timelineEnd)}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            时长: {formatDuration(timelineEnd - timelineStart)}
          </p>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={precise}
            onChange={(e) => setPrecise(e.target.checked)}
            className="mr-2 accent-black dark:accent-neutral-400"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">精确截断(重新编码,较慢)</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleTrim}
            disabled={isProcessing}
            className="flex-1 bg-black dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400"
          >
            {isProcessing ? '截断中...' : '立即执行'}
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
