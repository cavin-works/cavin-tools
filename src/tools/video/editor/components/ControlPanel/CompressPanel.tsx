import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type CompressPreset = 'mobile' | 'web' | 'high_quality' | 'custom';

export function CompressPanel() {
  const { currentVideo, isProcessing, setProcessing, setProgress, setOperation } = useVideoStore();
  const { addToQueue } = useOperationQueue();
  const [preset, setPreset] = useState<CompressPreset>('mobile');

  const handleCompress = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setProgress(0);
    setOperation('正在压缩视频...');

    try {
      const outputPath = await invoke<string>('compress_video_command', {
        inputPath: currentVideo.path,
        params: {
          preset,
          // 不指定宽高，保持原分辨率
        }
      });

      setProgress(100);
      alert(`压缩完成: ${outputPath}`);
    } catch (error) {
      alert(`压缩失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentVideo) return;

    const presetNames = {
      mobile: '手机优化',
      web: '网络分享',
      high_quality: '高质量',
      custom: '自定义'
    };

    addToQueue({
      type: 'compress',
      name: `压缩 (${presetNames[preset]})`,
      params: {
        preset,
        // 不指定宽高，保持原分辨率
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>视频压缩</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="preset">预设</Label>
          <Select value={preset} onValueChange={(value) => setPreset(value as CompressPreset)} disabled={isProcessing}>
            <SelectTrigger id="preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="mobile">手机优化 - 小文件，适合移动设备</SelectItem>
                <SelectItem value="web">网络分享 - 更小文件，适合网络传输</SelectItem>
                <SelectItem value="high_quality">高质量 - 保持较好画质</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            ℹ️ 压缩不会改变视频分辨率，只通过调整编码参数减小文件大小
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCompress}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? '压缩中...' : '立即执行'}
          </Button>
          <Button
            onClick={handleAddToQueue}
            disabled={!currentVideo}
            variant="secondary"
            size="icon"
            title="添加到操作队列"
          >
            <Plus className="w-4 h-4" />
            队列
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
