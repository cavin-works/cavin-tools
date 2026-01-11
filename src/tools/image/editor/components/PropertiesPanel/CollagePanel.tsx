/**
 * 拼图面板组件
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { CollageParams, PresetCollage } from '../../types';

const PRESET_COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '黑色', value: '#000000' },
  { name: '灰色', value: '#808080' },
  { name: '浅灰', value: '#E0E0E0' },
  { name: '米色', value: '#F5F5DC' },
];

export function CollagePanel() {
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
    <div className="p-4 border-b border-neutral-700">
      <h3 className="text-lg font-semibold mb-3">创建拼图</h3>

      <div className="space-y-4">
        {/* 选择图片 */}
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">选择图片</label>
          <button
            onClick={handleSelectImages}
            className="w-full px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
          >
            选择多张图片
          </button>
          {selectedImages.length > 0 && (
            <p className="text-xs text-neutral-400 mt-1">
              已选择 {selectedImages.length} 张图片
            </p>
          )}
        </div>

        {/* 预设拼图 */}
        {presetCollages.length > 0 && (
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">预设拼图</label>
            <select
              value={selectedPreset ?? ''}
              onChange={(e) => {
                const index = Number(e.target.value);
                if (!isNaN(index)) {
                  handleApplyPreset(index);
                }
              }}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm"
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-neutral-400">行数</label>
            <input
              type="number"
              value={rows}
              onChange={(e) => {
                setRows(Number(e.target.value));
                setSelectedPreset(null); // 清除预设选择
              }}
              className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm"
              min="1"
              max="10"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400">列数</label>
            <input
              type="number"
              value={columns}
              onChange={(e) => {
                setColumns(Number(e.target.value));
                setSelectedPreset(null);
              }}
              className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm"
              min="1"
              max="10"
            />
          </div>
        </div>

        {/* 所需图片数量提示 */}
        <p className="text-xs text-neutral-400">
          需要图片: {rows * columns} 张
          {selectedImages.length > 0 && ` (当前: ${selectedImages.length} 张)`}
        </p>

        {/* 间距调整 */}
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
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
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setGap(0)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
            >
              0px
            </button>
            <button
              onClick={() => setGap(10)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
            >
              10px
            </button>
            <button
              onClick={() => setGap(20)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
            >
              20px
            </button>
            <button
              onClick={() => setGap(50)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
            >
              50px
            </button>
          </div>
        </div>

        {/* 背景色选择 */}
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">背景颜色</label>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setBackgroundColor(color.value)}
                className={`h-8 rounded border-2 ${
                  backgroundColor === color.value
                    ? 'border-blue-500'
                    : 'border-transparent'
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
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>

        {/* 创建拼图按钮 */}
        <button
          onClick={handleCreateCollage}
          disabled={selectedImages.length === 0}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          创建拼图
        </button>

        {/* 使用说明 */}
        <div className="text-xs text-neutral-400 p-2 bg-neutral-800 rounded">
          <p className="font-medium mb-1">使用说明：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>选择 {rows * columns} 张图片</li>
            <li>选择预设配置或自定义网格</li>
            <li>调整间距和背景色</li>
            <li>点击创建拼图</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
