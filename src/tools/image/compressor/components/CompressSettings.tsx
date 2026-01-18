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
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">压缩设置</h3>

      <div className="space-y-5">
        {/* 压缩优化区域 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">压缩优化</h4>
          </div>

          <div className="space-y-4 pl-6">
            {/* 质量设置 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                压缩质量: {quality}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-500 mt-1">
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
                className="rounded mt-0.5 accent-neutral-900 dark:accent-white"
              />
              <div>
                <div className="font-medium text-neutral-700 dark:text-neutral-300">去除元数据</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500">删除 EXIF、位置等信息以减小体积</div>
              </div>
            </label>
          </div>
        </div>

        {/* 尺寸调整区域 */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Minimize2 className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={enableResize}
                onChange={(e) => setEnableResize(e.target.checked)}
                className="rounded accent-neutral-900 dark:accent-white"
              />
              调整尺寸
            </label>
          </div>

          {enableResize && (
            <div className="space-y-3 pl-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">宽度(px)</label>
                  <input
                    type="number"
                    min="1"
                    value={resizeWidth || ''}
                    onChange={(e) => setResizeWidth(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="auto"
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">高度(px)</label>
                  <input
                    type="number"
                    min="1"
                    value={resizeHeight || ''}
                    onChange={(e) => setResizeHeight(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="auto"
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="rounded accent-neutral-900 dark:accent-white"
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
