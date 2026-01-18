import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

export function GifPanel() {
  const { currentVideo, timelineStart, timelineEnd } = useVideoStore();
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [colors, setColors] = useState(256);

  const handleConvert = async () => {
    if (!currentVideo) return;

    try {
      const outputPath = await invoke<string>('convert_to_gif', {
        inputPath: currentVideo.path,
        params: {
          startTime: timelineStart,
          endTime: timelineEnd,
          fps,
          width,
          colors,
          dither: true
        }
      });

      alert(`转换完成: ${outputPath}`);
    } catch (error) {
      alert(`转换失败: ${error}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>转换为GIF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="fps">帧率: {fps} fps</Label>
          <Slider
            id="fps"
            min={5}
            max={30}
            step={1}
            value={[fps]}
            onValueChange={(value) => setFps(value[0])}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="width">宽度: {width}px</Label>
          <Slider
            id="width"
            min={200}
            max={800}
            step={50}
            value={[width]}
            onValueChange={(value) => setWidth(value[0])}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="colors">颜色数: {colors}</Label>
          <Slider
            id="colors"
            min={16}
            max={256}
            step={1}
            value={[colors]}
            onValueChange={(value) => setColors(value[0])}
          />
        </div>

        <Button
          onClick={handleConvert}
          className="w-full"
        >
          开始转换
        </Button>
      </CardContent>
    </Card>
  );
}
