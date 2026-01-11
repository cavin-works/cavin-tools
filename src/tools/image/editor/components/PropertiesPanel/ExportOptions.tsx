/**
 * 导出选项面板
 */

import { invoke } from '@tauri-apps/api/core';
import { useImageStore } from '../../store/imageStore';

export function ExportOptions() {
  const { currentImage, exportOptions, setExportOptions } = useImageStore();

  const handleExport = async () => {
    if (!currentImage) return;

    try {
      const outputPath = await invoke('export_image_command', {
        inputPath: currentImage.path,
        options: exportOptions,
      });
      alert(`导出成功!\n${outputPath}`);
    } catch (err) {
      alert(`导出失败: ${err}`);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">导出设置</h3>

      {!currentImage ? (
        <p className="text-sm text-neutral-400">请先加载图片</p>
      ) : (
        <div className="space-y-4">
          {/* 格式选择 */}
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">格式</label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions({ format: e.target.value as any })}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="bmp">BMP</option>
            </select>
          </div>

          {/* 质量控制（仅 JPEG/WebP） */}
          {exportOptions.format !== 'png' && (
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">
                质量: {exportOptions.quality}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={exportOptions.quality}
                onChange={(e) => setExportOptions({ quality: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium"
          >
            导出图片
          </button>
        </div>
      )}
    </div>
  );
}
