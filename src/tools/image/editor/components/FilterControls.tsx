import { useImageEditorStore } from '../store/imageEditorStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RotateCcw } from 'lucide-react';

const SLIDERS = [
  { key: 'brightness', label: '亮度', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: '对比度', min: -100, max: 100, step: 1 },
  { key: 'hue', label: '色相', min: -180, max: 180, step: 1 },
  { key: 'blur', label: '模糊', min: 0, max: 10, step: 0.5 },
  { key: 'sharpen', label: '锐化', min: 0, max: 10, step: 0.5 },
] as const;

export function FilterControls() {
  const params = useImageEditorStore((s) => s.params);
  const updateParams = useImageEditorStore((s) => s.updateParams);
  const resetFilters = useImageEditorStore((s) => s.resetFilters);

  return (
    <Card>
      <CardHeader>
        <CardTitle>滤镜调整</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {SLIDERS.map(({ key, label, min, max, step }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {label}: {params[key]}
            </Label>
            <Slider
              id={key}
              min={min}
              max={max}
              step={step}
              value={[params[key]]}
              onValueChange={(value) => updateParams({ [key]: value[0] })}
            />
          </div>
        ))}

        <Separator />

        <div className="flex items-center gap-2">
          <Switch
            id="grayscale"
            checked={params.grayscale}
            onCheckedChange={(checked) => updateParams({ grayscale: checked })}
          />
          <Label htmlFor="grayscale" className="cursor-pointer">灰度</Label>

          <Switch
            id="invert"
            className="ml-4"
            checked={params.invert}
            onCheckedChange={(checked) => updateParams({ invert: checked })}
          />
          <Label htmlFor="invert" className="cursor-pointer">反色</Label>
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
          <RotateCcw className="w-4 h-4 mr-1" />
          全部重置
        </Button>
      </CardContent>
    </Card>
  );
}
