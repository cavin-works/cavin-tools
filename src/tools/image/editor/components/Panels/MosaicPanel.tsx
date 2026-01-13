/**
 * 马赛克面板
 * 提供马赛克遮罩功能
 */

import { useState } from 'react';
import { useImageQueue } from '../../contexts/ImageOperationQueueContext';
import { useImageStore } from '../../store/imageStore';
import type { MosaicParams, MosaicRegion } from '../../types';
import { Plus, Trash2, Square, Circle, Brush } from 'lucide-react';

type RegionType = 'rect' | 'ellipse' | 'brush';

export function MosaicPanel() {
  const { currentImage } = useImageStore();
  const { addToQueue } = useImageQueue();
  const [regionType, setRegionType] = useState<RegionType>('rect');
  const [blockSize, setBlockSize] = useState(10);
  const [brushSize, setBrushSize] = useState(30);
  const [regions, setRegions] = useState<MosaicRegion[]>([]);

  // 添加区域
  const addRegion = () => {
    if (!currentImage) return;

    const newRegion: MosaicRegion = {
      regionType,
      x: Math.round(currentImage.width / 4),
      y: Math.round(currentImage.height / 4),
      width: regionType === 'brush' ? undefined : Math.round(currentImage.width / 2),
      height: regionType === 'brush' ? undefined : Math.round(currentImage.height / 2),
      points: regionType === 'brush' ? [] : undefined,
    };

    setRegions([...regions, newRegion]);
  };

  // 删除区域
  const removeRegion = (index: number) => {
    setRegions(regions.filter((_, i) => i !== index));
  };

  // 清空所有区域
  const clearRegions = () => {
    setRegions([]);
  };

  // 添加到队列
  const handleAddToQueue = () => {
    if (!currentImage || regions.length === 0) return;

    const params: MosaicParams = {
      regions,
      blockSize,
    };

    addToQueue({
      type: 'mosaic',
      name: `马赛克 (${regions.length}个区域)`,
      params,
    });
  };

  if (!currentImage) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">马赛克</h3>
        <p className="text-xs text-neutral-400">请先加载图片</p>
      </div>
    );
  }

  const canAddToQueue = regions.length > 0;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">马赛克遮罩</h3>

      <div className="space-y-3">
        {/* 区域类型选择 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-2">区域类型</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setRegionType('rect')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded transition-colors ${
                regionType === 'rect'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              <Square className="w-4 h-4" />
              <span className="text-xs">矩形</span>
            </button>
            <button
              onClick={() => setRegionType('ellipse')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded transition-colors ${
                regionType === 'ellipse'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              <Circle className="w-4 h-4" />
              <span className="text-xs">椭圆</span>
            </button>
            <button
              onClick={() => setRegionType('brush')}
              disabled
              className="flex flex-col items-center gap-1 px-3 py-2 rounded bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60"
              title="画笔模式开发中"
            >
              <Brush className="w-4 h-4" />
              <span className="text-xs">画笔</span>
            </button>
          </div>
        </div>

        {/* 马赛克强度 */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">
            马赛克强度: {blockSize}px
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={blockSize}
            onChange={(e) => setBlockSize(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setBlockSize(5)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
            >
              细 (5px)
            </button>
            <button
              onClick={() => setBlockSize(10)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
            >
              中 (10px)
            </button>
            <button
              onClick={() => setBlockSize(20)}
              className="flex-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-neutral-300"
            >
              粗 (20px)
            </button>
          </div>
        </div>

        {/* 画笔大小（仅画笔模式） */}
        {regionType === 'brush' && (
          <div>
            <label className="text-xs text-neutral-400 block mb-1">
              画笔大小: {brushSize}px
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* 添加区域按钮 */}
        <button
          onClick={addRegion}
          className="w-full px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加区域
        </button>

        {/* 区域列表 */}
        {regions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-neutral-400">
                已添加区域 ({regions.length})
              </label>
              <button
                onClick={clearRegions}
                className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
              >
                清空
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {regions.map((region, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-neutral-700 rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-white">
                      {region.regionType === 'rect' && <Square className="w-3 h-3 flex-shrink-0" />}
                      {region.regionType === 'ellipse' && <Circle className="w-3 h-3 flex-shrink-0" />}
                      {region.regionType === 'brush' && <Brush className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">
                        {region.regionType === 'rect' && '矩形区域'}
                        {region.regionType === 'ellipse' && '椭圆区域'}
                        {region.regionType === 'brush' && '画笔区域'}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 truncate">
                      {region.width && region.height
                        ? `位置: (${region.x}, ${region.y}) 尺寸: ${region.width}x${region.height}`
                        : region.points
                        ? `画笔点数: ${region.points.length}`
                        : `位置: (${region.x}, ${region.y})`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeRegion(index)}
                    className="flex-shrink-0 p-1 text-neutral-400 hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 添加到队列按钮 */}
        <button
          onClick={handleAddToQueue}
          disabled={!canAddToQueue}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加到队列
        </button>

        {/* 使用提示 */}
        <div className="text-xs text-neutral-500 bg-neutral-700/30 rounded px-2 py-2">
          <p className="font-medium mb-1">💡 使用提示</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>马赛克强度越大，像素块越大</li>
            <li>可以添加多个区域</li>
            <li>画笔模式即将上线</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
