import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { showError, showSuccess } from '../../utils/errorHandling';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

type AudioFormat = 'mp3' | 'm4a' | 'wav';

export function AudioPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [mp3Quality, setMp3Quality] = useState(4);   // 0-9, 越小质量越高
  const [m4aBitrate, setM4aBitrate] = useState(192); // 128-320 kbps

  const handleExtract = async () => {
    if (!currentVideo) return;

    setProcessing(true);

    try {
      const outputPath = await invoke<string>('extract_audio', {
        inputPath: currentVideo.path,
        format,
        quality: format === 'mp3'
          ? mp3Quality
          : format === 'm4a'
            ? Math.round(m4aBitrate / 32)
            : null
      });

      showSuccess(`音频提取完成: ${outputPath}`);
    } catch (error) {
      showError('音频提取失败', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>提取音频</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="audio-format">输出格式</Label>
          <Select value={format} onValueChange={(value) => setFormat(value as AudioFormat)} disabled={isProcessing}>
            <SelectTrigger id="audio-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="m4a">M4A</SelectItem>
                <SelectItem value="wav">WAV</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {format === 'mp3' && (
          <div className="space-y-3">
            <Label htmlFor="mp3-quality">质量: {mp3Quality} (越小质量越高)</Label>
            <Slider
              id="mp3-quality"
              min={0}
              max={9}
              step={1}
              value={[mp3Quality]}
              onValueChange={(value) => setMp3Quality(value[0])}
              disabled={isProcessing}
            />
          </div>
        )}

        {format === 'm4a' && (
          <div className="space-y-3">
            <Label htmlFor="m4a-bitrate">码率: {m4aBitrate} kbps</Label>
            <Slider
              id="m4a-bitrate"
              min={128}
              max={320}
              step={32}
              value={[m4aBitrate]}
              onValueChange={(value) => setM4aBitrate(value[0])}
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
