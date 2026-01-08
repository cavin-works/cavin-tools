import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';

type ExtractMode = 'single' | 'interval' | 'uniform';

export function ExtractPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const [mode, setMode] = useState<ExtractMode>('single');
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [quality, setQuality] = useState(90);
  const [interval, setInterval] = useState(1);
  const [count, setCount] = useState(10);

  const handleExtract = async () => {
    if (!currentVideo) return;

    setProcessing(true);

    try {
      const result = await invoke<string[]>('extract_frames', {
        inputPath: currentVideo.path,
        params: {
          mode,
          format,
          quality,
          interval: mode === 'interval' ? interval : undefined,
          count: mode === 'uniform' ? count : undefined,
          outputDir: './extracted_frames'
        }
      });
      alert(`提取完成,生成了${result.length}帧`);
    } catch (error) {
      alert(`提取失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">提取帧</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            提取模式
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ExtractMode)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            disabled={isProcessing}
          >
            <option value="single">单帧</option>
            <option value="interval">间隔提取</option>
            <option value="uniform">均匀提取</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            输出格式
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'jpg' | 'png' | 'webp')}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            disabled={isProcessing}
          >
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            质量: {quality}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value))}
            className="w-full accent-black"
            disabled={isProcessing}
          />
        </div>

        {mode === 'interval' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              间隔(秒)
            </label>
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(parseFloat(e.target.value))}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              min="0.1"
              step="0.1"
              disabled={isProcessing}
            />
          </div>
        )}

        {mode === 'uniform' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              提取帧数
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              min="1"
              disabled={isProcessing}
            />
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={isProcessing}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500"
        >
          {isProcessing ? '提取中...' : '开始提取'}
        </button>
      </div>
    </div>
  );
}
