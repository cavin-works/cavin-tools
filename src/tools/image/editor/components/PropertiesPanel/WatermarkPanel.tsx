/**
 * 水印面板组件
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useImageStore } from '../../store/imageStore';
import type { WatermarkParams } from '../../types';

const POSITIONS = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '上中' },
  { value: 'top-right', label: '右上' },
  { value: 'center-left', label: '左中' },
  { value: 'center', label: '居中' },
  { value: 'center-right', label: '右中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '下中' },
  { value: 'bottom-right', label: '右下' },
  { value: 'custom', label: '自定义' },
];

// 九宫格位置可视化
const PositionGrid = ({ selected, onSelect }: { selected: string; onSelect: (pos: string) => void }) => {
  const gridPositions = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];

  return (
    <div className="grid grid-cols-3 gap-1 w-48 h-32 bg-neutral-700 p-1 rounded">
      {gridPositions.map((pos) => (
        <button
          key={pos}
          onClick={() => onSelect(pos)}
          className={`text-xs rounded ${
            selected === pos
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-neutral-600 hover:bg-neutral-500'
          }`}
        >
          {POSITIONS.find(p => p.value === pos)?.label}
        </button>
      ))}
    </div>
  );
};

export function WatermarkPanel() {
  const { currentImage } = useImageStore();
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('image');
  const [position, setPosition] = useState<string>('bottom-right');
  const [opacity, setOpacity] = useState<number>(128); // 0-255
  const [customX, setCustomX] = useState<number>(0);
  const [customY, setCustomY] = useState<number>(0);

  // 图片水印状态
  const [watermarkPath, setWatermarkPath] = useState<string>('');
  const [scale, setScale] = useState<number>(0.2); // 0-1

  // 选择水印图片
  const handleSelectWatermarkImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: '图片',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
          }
        ]
      });

      if (selected && typeof selected === 'string') {
        setWatermarkPath(selected);
      }
    } catch (err) {
      console.error('选择图片失败:', err);
    }
  };

  // 应用水印
  const handleApplyWatermark = async () => {
    if (!currentImage) {
      alert('请先加载图片');
      return;
    }

    if (watermarkType === 'image' && !watermarkPath) {
      alert('请选择水印图片');
      return;
    }

    const params: WatermarkParams = {
      type: watermarkType,
      position: position as any,
      x: position === 'custom' ? customX : undefined,
      y: position === 'custom' ? customY : undefined,
      opacity,
      image_options: watermarkType === 'image' ? {
        watermark_path: watermarkPath,
        scale,
      } : undefined,
      text_options: watermarkType === 'text' ? {
        text: '水印文字',
        font_size: 32,
        color: '#FFFFFF',
      } : undefined,
    };

    try {
      const outputPath = await invoke('add_watermark_command', {
        inputPath: currentImage.path,
        params,
      });
      alert(`水印添加成功!\n${outputPath}`);
    } catch (err) {
      alert(`添加水印失败: ${err}`);
    }
  };

  if (!currentImage) {
    return (
      <div className="p-4 border-b border-neutral-700">
        <h3 className="text-lg font-semibold mb-3">添加水印</h3>
        <p className="text-sm text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-neutral-700">
      <h3 className="text-lg font-semibold mb-3">添加水印</h3>

      <div className="space-y-4">
        {/* 水印类型选择 */}
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">水印类型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setWatermarkType('image')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                watermarkType === 'image'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-neutral-700 hover:bg-neutral-600'
              }`}
            >
              图片水印
            </button>
            <button
              onClick={() => setWatermarkType('text')}
              disabled
              className="flex-1 px-3 py-2 rounded text-sm font-medium bg-neutral-800 text-neutral-500 cursor-not-allowed"
              title="文字水印功能开发中"
            >
              文字水印（开发中）
            </button>
          </div>
        </div>

        {/* 图片水印选项 */}
        {watermarkType === 'image' && (
          <>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">水印图片</label>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectWatermarkImage}
                  className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
                >
                  选择图片
                </button>
              </div>
              {watermarkPath && (
                <p className="text-xs text-neutral-400 mt-1 truncate">
                  {watermarkPath.split('\\').pop() || watermarkPath.split('/').pop()}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                缩放比例: {Math.round(scale * 100)}%
              </label>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setScale(0.1)}
                  className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
                >
                  10%
                </button>
                <button
                  onClick={() => setScale(0.2)}
                  className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
                >
                  20%
                </button>
                <button
                  onClick={() => setScale(0.5)}
                  className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs"
                >
                  50%
                </button>
              </div>
            </div>
          </>
        )}

        {/* 透明度 */}
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
            透明度: {Math.round((opacity / 255) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="255"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 位置选择 */}
        <div>
          <label className="text-xs text-neutral-400 mb-2 block">水印位置</label>
          <PositionGrid
            selected={position}
            onSelect={setPosition}
          />
          {position === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-neutral-400">X 坐标</label>
                <input
                  type="number"
                  value={customX}
                  onChange={(e) => setCustomX(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Y 坐标</label>
                <input
                  type="number"
                  value={customY}
                  onChange={(e) => setCustomY(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* 应用按钮 */}
        <button
          onClick={handleApplyWatermark}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
          disabled={watermarkType === 'image' && !watermarkPath}
        >
          添加水印
        </button>
      </div>
    </div>
  );
}
