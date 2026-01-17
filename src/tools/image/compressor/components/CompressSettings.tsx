import { useImageCompressorStore } from '../store/imageCompressorStore';
import { Minimize2, Zap } from 'lucide-react';

export function CompressSettings() {
  const {
    quality,
    enableResize,
    resizeWidth,
    resizeHeight,
    maintainAspectRatio,
    preserveMetadata,
    setQuality,
    setEnableResize,
    setResizeWidth,
    setResizeHeight,
    setMaintainAspectRatio,
    setPreserveMetadata,
  } = useImageCompressorStore();

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">压缩设置</h3>

      <div className="space-y-5">
        {/* 压缩优化区域 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-neutral-700" />
            <h4 className="text-sm font-semibold text-neutral-700">压缩优化</h4>
          </div>

          <div className="space-y-4 pl-6">
            {/* 质量设置 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                压缩质量: {quality}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-neutral-900"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>高压缩 (体积小，质量低)</span>
                <span>低压缩 (体积大，质量高)</span>
              </div>
            </div>

            {/* 去除元数据 */}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={!preserveMetadata}
                onChange={(e) => setPreserveMetadata(!e.target.checked)}
                className="rounded mt-0.5"
              />
              <div>
                <div className="font-medium text-neutral-700">去除元数据</div>
                <div className="text-xs text-neutral-500">删除 EXIF、位置等信息以减小体积</div>
              </div>
            </label>
          </div>
        </div>

        {/* 尺寸调整区域 */}
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Minimize2 className="w-4 h-4 text-neutral-700" />
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={enableResize}
                onChange={(e) => setEnableResize(e.target.checked)}
                className="rounded"
              />
              调整尺寸
            </label>
          </div>

          {enableResize && (
            <div className="space-y-3 pl-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">宽度(px)</label>
                  <input
                    type="number"
                    min="1"
                    value={resizeWidth || ''}
                    onChange={(e) => setResizeWidth(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="auto"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">高度(px)</label>
                  <input
                    type="number"
                    min="1"
                    value={resizeHeight || ''}
                    onChange={(e) => setResizeHeight(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="auto"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="rounded"
                />
                保持宽高比
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
