import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';

export function GifPanel() {
  const { currentVideo, timelineStart, timelineEnd } = useVideoStore();
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [colors, setColors] = useState(256);

  const handleConvert = async () => {
    if (!currentVideo) return;

    try {
      const outputPath = await invoke<string>('convert_to_gif', {
        inputPath: currentVideo.path,
        params: {
          startTime: timelineStart,
          endTime: timelineEnd,
          fps,
          width,
          colors,
          dither: true
        }
      });

      alert(`转换完成: ${outputPath}`);
    } catch (error) {
      alert(`转换失败: ${error}`);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">转换为GIF</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            帧率: {fps} fps
          </label>
          <input
            type="range"
            min="5"
            max="30"
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            宽度: {width}px
          </label>
          <input
            type="range"
            min="200"
            max="800"
            step="50"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            颜色数: {colors}
          </label>
          <input
            type="range"
            min="16"
            max="256"
            value={colors}
            onChange={(e) => setColors(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleConvert}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          开始转换
        </button>
      </div>
    </div>
  );
}
