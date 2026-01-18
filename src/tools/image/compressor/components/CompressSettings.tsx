import { useImageCompressorStore } from '../store/imageCompressorStore';
import { Minimize2, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

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
    <Card>
      <CardHeader>
        <CardTitle>压缩设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 压缩优化区域 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">压缩优化</h4>
          </div>

          <div className="space-y-6 pl-6">
            {/* 质量设置 */}
            <div className="space-y-3">
              <Label htmlFor="quality">压缩质量: {quality}%</Label>
              <Slider
                id="quality"
                min={1}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>高压缩 (体积小，质量低)</span>
                <span>低压缩 (体积大，质量高)</span>
              </div>
            </div>

            {/* 去除元数据 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="metadata"
                checked={!preserveMetadata}
                onCheckedChange={() => setPreserveMetadata(false)}
              />
              <Label htmlFor="metadata" className="cursor-pointer">
                <div className="font-medium text-neutral-700 dark:text-neutral-300">去除元数据</div>
                <div className="text-xs text-muted-foreground">删除 EXIF、位置等信息以减小体积</div>
              </Label>
            </div>
          </div>
        </div>

        {/* 尺寸调整区域 */}
        <Separator />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Minimize2 className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            <div className="flex items-center gap-2">
              <Switch
                id="resize"
                checked={enableResize}
                onCheckedChange={(checked) => setEnableResize(checked)}
              />
              <Label htmlFor="resize" className="cursor-pointer">调整尺寸</Label>
            </div>
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
                    placeholder="auto"
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
                    placeholder="auto"
                    value={resizeHeight || ''}
                    onChange={(e) => setResizeHeight(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
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
