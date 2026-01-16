/**
 * 尺寸调整面板
 * 提供图片尺寸调整参数控制
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useImageQueue } from '../../contexts/ImageOperationQueueContext';
import { useImageStore } from '../../store/imageStore';
import type { ResizeParams, PresetSize } from '../../types';
import { Plus } from 'lucide-react';

const ALGORITHMS = [
  { value: 'nearest', label: '邻近插值' },
  { value: 'triangle', label: '双线性' },
  { value: 'catmullrom', label: '双三次' },
  { value: 'gaussian', label: '高斯' },
  { value: 'lanczos3', label: 'Lanczos3 (推荐)' },
];

export function ResizePanel() {
  const { currentImage } = useImageStore();
  const { addToQueue } = useImageQueue();
  const [width, setWidth] = useState<number>(currentImage?.width || 0);
  const [height, setHeight] = useState<number>(currentImage?.height || 0);
  const [percentage, setPercentage] = useState<number>(100);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [algorithm, setAlgorithm] = useState<'nearest' | 'triangle' | 'catmullrom' | 'gaussian' | 'lanczos3'>('lanczos3');
  const [usePercentage, setUsePercentage] = useState(false);
  const [presetSizes, setPresetSizes] = useState<PresetSize[]>([]);

  // 加载预设尺寸
  useEffect(() => {
    invoke<PresetSize[]>('get_preset_sizes')
      .then(sizes => setPresetSizes(sizes))
      .catch(err => console.error('加载预设尺寸失败:', err));
  }, []);

  // 同步当前图片尺寸
  useEffect(() => {
    if (currentImage) {
      setWidth(currentImage.width);
      setHeight(currentImage.height);
    }
  }, [currentImage]);

  // 计算宽高比
  const aspectRatio = currentImage ? currentImage.width / currentImage.height : 1;

  // 处理宽度变化
  const handleWidthChange = (value: number) => {
    setWidth(value);
    if (maintainAspect) {
      setHeight(Math.round(value / aspectRatio));
    }
  };

  // 处理高度变化
  const handleHeightChange = (value: number) => {
    setHeight(value);
    if (maintainAspect) {
      setWidth(Math.round(value * aspectRatio));
    }
  };

  // 处理百分比变化
  const handlePercentageChange = (value: number) => {
    setPercentage(value);
    if (currentImage && maintainAspect) {
      const newWidth = Math.round(currentImage.width * (value / 100));
      const newHeight = Math.round(currentImage.height * (value / 100));
      setWidth(newWidth);
      setHeight(newHeight);
    }
  };

  // 应用预设尺寸
  const handlePresetSize = (preset: PresetSize) => {
    if (maintainAspect && currentImage) {
      const widthRatio = preset.width / currentImage.width;
      const heightRatio = preset.height / currentImage.height;
      const ratio = Math.min(widthRatio, heightRatio);

      setWidth(Math.round(currentImage.width * ratio));
      setHeight(Math.round(currentImage.height * ratio));
      setPercentage(Math.round(ratio * 100));
    } else {
      setWidth(preset.width);
      setHeight(preset.height);
      setPercentage(Math.round((preset.width / currentImage!.width) * 100));
    }
  };

  const handleAddToQueue = () => {
    if (!currentImage) return;

    const params: ResizeParams = usePercentage
      ? {
          percentage,
          maintainAspect,
          algorithm,
        }
      : {
          width,
          height,
          maintainAspect,
          algorithm,
        };

    const name = usePercentage
      ? `缩放至 ${percentage}%`
      : `调整为 ${width} x ${height}`;

    addToQueue({
      type: 'resize',
      name,
      params,
    });
  };

  if (!currentImage) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">调整大小</h3>
        <p className="text-xs text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">调整大小</h3>

      <div className="space-y-3">
        {/* 切换调整模式 */}
        <div className="flex gap-2">
          <button
            onClick={() => setUsePercentage(false)}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              !usePercentage
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            按像素
          </button>
          <button
            onClick={() => setUsePercentage(true)}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              usePercentage
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            按百分比
          </button>
        </div>

        {/* 像素调整 */}
        {!usePercentage && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">宽度 (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
                  min="1"
                  max="65536"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">高度 (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
                  min="1"
                  max="65536"
                />
              </div>
            </div>
          </div>
        )}

        {/* 百分比调整 */}
        {usePercentage && (
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block">
              缩放比例: {percentage}%
            </label>
            <input
              type="range"
              min="1"
              max="200"
              value={percentage}
              onChange={(e) => handlePercentageChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handlePercentageChange(50)}
                className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
              >
                50%
              </button>
              <button
                onClick={() => handlePercentageChange(100)}
                className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
              >
                100%
              </button>
              <button
                onClick={() => handlePercentageChange(150)}
                className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
              >
                150%
              </button>
            </div>
          </div>
        )}

        {/* 保持宽高比 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={maintainAspect}
            onChange={(e) => setMaintainAspect(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-neutral-300">锁定宽高比</span>
        </label>

        {/* 预设尺寸 */}
        {presetSizes.length > 0 && !usePercentage && (
          <div>
            <label className="text-xs text-neutral-400 block mb-1">预设尺寸</label>
            <select
              onChange={(e) => {
                const preset = presetSizes[Number(e.target.value)];
                if (preset) handlePresetSize(preset);
              }}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
              defaultValue=""
            >
              <option value="" disabled>
                选择预设尺寸...
              </option>
              {presetSizes.map((preset, index) => (
                <option key={preset.name} value={index}>
                  {preset.name} ({preset.width} x {preset.height})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 插值算法 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">插值算法</label>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as any)}
            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm text-white"
          >
            {ALGORITHMS.map((algo) => (
              <option key={algo.value} value={algo.value}>
                {algo.label}
              </option>
            ))}
          </select>
        </div>

        {/* 添加到队列按钮 */}
        <button
          onClick={handleAddToQueue}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加到队列
        </button>
      </div>
    </div>
  );
}
