import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { formatDuration } from '../../utils/fileValidation';

export function TrimPanel() {
  const { currentVideo, timelineStart, timelineEnd } = useVideoStore();
  const [precise, setPrecise] = useState(false);

  const handleTrim = async () => {
    if (!currentVideo) return;

    try {
      const outputPath = await invoke<string>('trim_video', {
        inputPath: currentVideo.path,
        params: {
          startTime: timelineStart,
          endTime: timelineEnd,
          precise
        }
      });

      alert(`截断完成: ${outputPath}`);
    } catch (error) {
      alert(`截断失败: ${error}`);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">截断视频</h3>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            开始时间: {formatDuration(timelineStart)}
          </p>
          <p className="text-sm text-gray-600">
            结束时间: {formatDuration(timelineEnd)}
          </p>
          <p className="text-sm text-gray-600">
            时长: {formatDuration(timelineEnd - timelineStart)}
          </p>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={precise}
            onChange={(e) => setPrecise(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">精确截断(重新编码,较慢)</span>
        </label>

        <button
          onClick={handleTrim}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          开始截断
        </button>
      </div>
    </div>
  );
}
