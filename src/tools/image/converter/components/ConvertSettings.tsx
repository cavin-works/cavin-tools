import { useImageConverterStore } from '../store/imageConverterStore';
import { ImageFormat } from '../types';
import { Minimize2 } from 'lucide-react';

const FORMAT_OPTIONS: { value: ImageFormat; label: string; description: string }[] = [
  { value: 'png', label: 'PNG', description: '支持透明，可优化压缩' },
  { value: 'jpg', label: 'JPEG', description: '有损压缩,适合照片' },
  { value: 'webp', label: 'WebP', description: '现代格式,体积小' },
  { value: 'gif', label: 'GIF', description: '支持动画' },
  { value: 'bmp', label: 'BMP', description: '位图格式' },
  { value: 'tiff', label: 'TIFF', description: '专业格式' },
  { value: 'ico', label: 'ICO', description: '图标格式' },
];

export function ConvertSettings() {
  const {
    targetFormat,
    quality,
    enableResize,
    resizeWidth,
    resizeHeight,
    maintainAspectRatio,
    setTargetFormat,
    setQuality,
    setEnableResize,
    setResizeWidth,
    setResizeHeight,
    setMaintainAspectRatio,
  } = useImageConverterStore();

  const showQuality = ['jpg', 'webp', 'png'].includes(targetFormat);
  const isPNG = targetFormat === 'png';

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">转换设置</h3>

      <div className="space-y-5">
        {/* 目标格式 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            目标格式
          </label>
          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value as ImageFormat)}
            className="w-full border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 focus:border-neutral-900 dark:focus:border-neutral-400"
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* 质量设置 */}
        {showQuality && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {isPNG ? '压缩优化' : '图片质量'}: {quality}%
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-neutral-900 dark:accent-neutral-400"
            />
            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              <span>{isPNG ? '高压缩 (体积小)' : '低质量 (体积小)'}</span>
              <span>{isPNG ? '低压缩 (质量最佳)' : '高质量 (体积大)'}</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 bg-neutral-50 dark:bg-neutral-700 p-2 rounded">
              {isPNG ? (
                <>
                  💡 PNG 优化压缩：
                  <br />
                  • <strong>100%</strong>: 无损优化（推荐，减少20-40%）
                  <br />
                  • <strong>85-99%</strong>: 轻微有损（减少50-70%）
                  <br />
                  • <strong>50-84%</strong>: 中等压缩（减少60-80%）
                </>
              ) : (
                <>💡 {targetFormat.toUpperCase()} 是有损格式，较低质量会减小体积但可能影响画质</>
              )}
            </p>
          </div>
        )}

        {/* 尺寸调整区域 */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Minimize2 className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
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
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">宽度(px)</label>
                  <input
                    type="number"
                    min="1"
                    value={resizeWidth || ''}
                    onChange={(e) => setResizeWidth(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="自动"
                    className="w-full border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">高度(px)</label>
                  <input
                    type="number"
                    min="1"
                    value={resizeHeight || ''}
                    onChange={(e) => setResizeHeight(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="自动"
                    className="w-full border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
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
