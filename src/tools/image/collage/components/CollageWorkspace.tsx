/**
 * 拼图工作区组件
 * 移植自原CollagePanel，适配独立工具结构
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { CollageParams, PresetCollage } from '../../editor/types';

const PRESET_COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '黑色', value: '#000000' },
  { name: '灰色', value: '#808080' },
  { name: '浅灰', value: '#E0E0E0' },
  { name: '米色', value: '#F5F5DC' },
];

export function CollageWorkspace() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [presetCollages, setPresetCollages] = useState<PresetCollage[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [rows, setRows] = useState<number>(2);
  const [columns, setColumns] = useState<number>(2);
  const [gap, setGap] = useState<number>(10);
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');

  // 加载预设拼图配置
  useEffect(() => {
    invoke<PresetCollage[]>('get_preset_collages')
      .then(collages => setPresetCollages(collages))
      .catch(err => console.error('加载预设拼图失败:', err));
  }, []);

  // 选择多张图片
  const handleSelectImages = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: '图片',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
          }
        ]
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        setSelectedImages(paths);
      }
    } catch (err) {
      console.error('选择图片失败:', err);
    }
  };

  // 应用预设配置
  const handleApplyPreset = (index: number) => {
    const preset = presetCollages[index];
    setRows(preset.rows);
    setColumns(preset.columns);
    setSelectedPreset(index);
  };

  // 创建拼图
  const handleCreateCollage = async () => {
    if (selectedImages.length === 0) {
      alert('请先选择图片');
      return;
    }

    const requiredCount = rows * columns;
    if (selectedImages.length !== requiredCount) {
      alert(`当前配置需要 ${requiredCount} 张图片，但您选择了 ${selectedImages.length} 张`);
      return;
    }

    // 将 hex 颜色转换为 RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const params: CollageParams = {
      image_paths: selectedImages,
      rows,
      columns,
      gap,
      background_color: [r, g, b],
      output_width: undefined, // 自动计算
    };

    try {
      const outputPath = await invoke('create_collage_command', { params });
      alert(`拼图创建成功!\n${outputPath}`);
    } catch (err) {
      alert(`创建拼图失败: ${err}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-bold">拼图工具</h1>
        <p className="text-sm text-neutral-400 mt-1">选择多张图片创建网格拼图</p>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* 选择图片区域 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-300 mb-2 block">选择图片</label>
            <button
              onClick={handleSelectImages}
              className="w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm transition-colors"
            >
              选择多张图片
            </button>
            {selectedImages.length > 0 && (
              <p className="text-xs text-neutral-400 mt-2">
                已选择 {selectedImages.length} 张图片
              </p>
            )}
          </div>

          {/* 预设拼图 */}
          {presetCollages.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-neutral-300 mb-2 block">预设拼图</label>
              <select
                value={selectedPreset ?? ''}
                onChange={(e) => {
                  const index = Number(e.target.value);
                  if (!isNaN(index)) {
                    handleApplyPreset(index);
                  }
                }}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm"
              >
                <option value="" disabled>选择预设配置...</option>
                {presetCollages.map((preset, index) => (
                  <option key={preset.name} value={index}>
                    {preset.name} - {preset.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 自定义网格 */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-300 mb-2 block">行数</label>
              <input
                type="number"
                value={rows}
                onChange={(e) => {
                  setRows(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-300 mb-2 block">列数</label>
              <input
                type="number"
                value={columns}
                onChange={(e) => {
                  setColumns(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm"
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* 所需图片数量提示 */}
          <div className="mb-6 p-3 bg-neutral-800 rounded-lg">
            <p className="text-sm text-neutral-300">
              需要图片: <span className="font-bold text-white">{rows * columns}</span> 张
              {selectedImages.length > 0 && ` (当前: ${selectedImages.length} 张)`}
            </p>
          </div>

          {/* 间距调整 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-300 mb-2 block">
              图片间距: {gap}px
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              {[0, 10, 20, 50].map((value) => (
                <button
                  key={value}
                  onClick={() => setGap(value)}
                  className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs transition-colors"
                >
                  {value}px
                </button>
              ))}
            </div>
          </div>

          {/* 背景色选择 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-neutral-300 mb-2 block">背景颜色</label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBackgroundColor(color.value)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    backgroundColor === color.value
                      ? 'border-blue-500 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full h-10 rounded-lg cursor-pointer border-0"
            />
          </div>

          {/* 创建拼图按钮 */}
          <button
            onClick={handleCreateCollage}
            disabled={selectedImages.length === 0}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            创建拼图
          </button>

          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-300 mb-2">使用说明</h3>
            <ul className="text-xs text-neutral-400 space-y-1">
              <li>• 选择 {rows * columns} 张图片</li>
              <li>• 选择预设配置或自定义网格</li>
              <li>• 调整间距和背景色</li>
              <li>• 点击创建拼图</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
