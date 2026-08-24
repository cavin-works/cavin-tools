import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useImageEditorStore } from '../store/imageEditorStore';
import type { ExportFormat } from '../types';
import { showError, showSuccess } from '@/tools/video/editor/utils/errorHandling';
import { buildOutputPath } from '@/tools/image/utils/outputPath';
import { renderTextOverlays } from '../utils/textOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'png', label: 'PNG - 无损，支持透明' },
  { value: 'jpg', label: 'JPEG - 有损，适合照片' },
  { value: 'webp', label: 'WebP - 现代格式，体积小' },
];

export function ExportSettings() {
  const inputPath = useImageEditorStore((s) => s.inputPath);
  const exportFormat = useImageEditorStore((s) => s.exportFormat);
  const exportQuality = useImageEditorStore((s) => s.exportQuality);
  const setExportFormat = useImageEditorStore((s) => s.setExportFormat);
  const setExportQuality = useImageEditorStore((s) => s.setExportQuality);
  const exporting = useImageEditorStore((s) => s.exporting);
  const setExporting = useImageEditorStore((s) => s.setExporting);

  const [outputPath, setOutputPath] = useState<string | null>(null);

  const showQuality = exportFormat === 'jpg' || exportFormat === 'webp';

  const handleExport = async () => {
    const store = useImageEditorStore.getState();
    if (!store.inputPath) return;

    setExporting(true);
    try {
      const output = buildOutputPath(store.inputPath, store.exportFormat, '_edited');
      // 导出参数单独构造：文字标注在此渲染为 PNG（textOverlays），
      // 不影响预览链（预览不传 textOverlays，由 AnnotationLayer DOM 呈现）
      const params = {
        ...store.getEditParams(true),
        textOverlays: renderTextOverlays(store.params.annotations),
      };
      // 同名文件已存在时后端自动改为 {stem}_1、_2…，返回实际写入路径
      const actualPath = await invoke<string>('edit_image_export', {
        inputPath: store.inputPath,
        params,
        outputPath: output,
        format: store.exportFormat,
        quality: store.exportQuality,
      });
      setOutputPath(actualPath);
      showSuccess(`导出成功: ${actualPath}`);
    } catch (error) {
      showError('导出失败', error);
    } finally {
      useImageEditorStore.getState().setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>导出设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="export-format">导出格式</Label>
          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {showQuality && (
          <div className="space-y-3">
            <Label htmlFor="export-quality">图片质量: {exportQuality}%</Label>
            <Slider
              id="export-quality"
              min={1}
              max={100}
              step={1}
              value={[exportQuality]}
              onValueChange={(value) => setExportQuality(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>低质量 (体积小)</span>
              <span>高质量 (体积大)</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={exporting || !inputPath}
          className="w-full"
          size="lg"
        >
          {exporting ? '导出中...' : '导出图片'}
        </Button>

        {outputPath && (
          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md break-all">
            已保存至: {outputPath}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
