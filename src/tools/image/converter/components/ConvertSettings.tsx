import { useImageConverterStore } from '../store/imageConverterStore';
import { ImageFormat } from '../types';
import { Minimize2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

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
    <Card>
      <CardHeader>
        <CardTitle>转换设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 目标格式 */}
        <div className="space-y-2">
          <Label htmlFor="format">目标格式</Label>
          <Select value={targetFormat} onValueChange={(value) => setTargetFormat(value as ImageFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* 质量设置 */}
        {showQuality && (
          <>
            <Separator />

            <div className="space-y-3">
              <Label htmlFor="quality">{isPNG ? '压缩优化' : '图片质量'}: {quality}%</Label>
              <Slider
                id="quality"
                min={1}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isPNG ? '高压缩 (体积小)' : '低质量 (体积小)'}</span>
                <span>{isPNG ? '低压缩 (质量最佳)' : '高质量 (体积大)'}</span>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
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
              </div>
            </div>
          </>
        )}

        {/* 尺寸调整区域 */}
        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <Switch
              id="resize"
              checked={enableResize}
              onCheckedChange={(checked) => setEnableResize(checked)}
            />
            <Label htmlFor="resize" className="cursor-pointer">调整尺寸</Label>
          </div>

          {enableResize && (
            <div className="space-y-4 pl-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">宽度(px)</Label>
                  <Input
                    id="width"
                    type="number"
                    min="1"
                    placeholder="自动"
                    value={resizeWidth || ''}
                    onChange={(e) => setResizeWidth(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">高度(px)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="1"
                    placeholder="自动"
                    value={resizeHeight || ''}
                    onChange={(e) => setResizeHeight(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="aspect"
                  checked={maintainAspectRatio}
                  onCheckedChange={(checked) => setMaintainAspectRatio(checked)}
                />
                <Label htmlFor="aspect" className="text-sm text-muted-foreground">
                  保持宽高比
                </Label>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
