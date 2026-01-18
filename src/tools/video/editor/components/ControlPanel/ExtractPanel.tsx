import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type ExtractMode = 'single' | 'interval' | 'uniform';

export function ExtractPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const [mode, setMode] = useState<ExtractMode>('single');
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [quality, setQuality] = useState(90);
  const [interval, setInterval] = useState(1);
  const [count, setCount] = useState(10);

  const handleExtract = async () => {
    if (!currentVideo) return;

    setProcessing(true);

    try {
      const result = await invoke<string[]>('extract_frames', {
        inputPath: currentVideo.path,
        params: {
          mode,
          format,
          quality,
          interval: mode === 'interval' ? interval : undefined,
          count: mode === 'uniform' ? count : undefined,
          outputDir: './extracted_frames'
        }
      });
      alert(`提取完成,生成了${result.length}帧`);
    } catch (error) {
      alert(`提取失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>提取帧</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mode">提取模式</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as ExtractMode)} disabled={isProcessing}>
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="single">单帧</SelectItem>
                <SelectItem value="interval">间隔提取</SelectItem>
                <SelectItem value="uniform">均匀提取</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">输出格式</Label>
          <Select value={format} onValueChange={(value) => setFormat(value as 'jpg' | 'png' | 'webp')} disabled={isProcessing}>
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="quality">质量: {quality}</Label>
          <Slider
            id="quality"
            min={1}
            max={100}
            step={1}
            value={[quality]}
            onValueChange={(value) => setQuality(value[0])}
            disabled={isProcessing}
          />
        </div>

        {mode === 'interval' && (
          <div className="space-y-2">
            <Label htmlFor="interval">间隔(秒)</Label>
            <Input
              id="interval"
              type="number"
              value={interval}
              onChange={(e) => setInterval(parseFloat(e.target.value))}
              min="0.1"
              step="0.1"
              disabled={isProcessing}
            />
          </div>
        )}

        {mode === 'uniform' && (
          <div className="space-y-2">
            <Label htmlFor="count">提取帧数</Label>
            <Input
              id="count"
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              min="1"
              disabled={isProcessing}
            />
          </div>
        )}

        <Button
          onClick={handleExtract}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? '提取中...' : '开始提取'}
        </Button>
      </CardContent>
    </Card>
  );
}
