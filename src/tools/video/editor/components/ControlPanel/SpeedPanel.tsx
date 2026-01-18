import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';

export function SpeedPanel() {
  const { currentVideo, isProcessing, setProcessing } = useVideoStore();
  const { addToQueue } = useOperationQueue();
  const [speed, setSpeed] = useState(1.0);
  const [preservePitch, setPreservePitch] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const handleSpeedChange = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setOutputPath(null);

    try {
      const path = await invoke<string>('change_video_speed', {
        inputPath: currentVideo.path,
        params: { speed, preservePitch }
      });

      setOutputPath(path);
    } catch (error) {
      alert(`变速失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentVideo) return;

    addToQueue({
      type: 'speed',
      name: `变速 ${speed}x${preservePitch ? ' (保持音高)' : ''}`,
      params: { speed, preservePitch }
    });
  };

  const handleOpenFolder = async () => {
    if (!outputPath) return;

    // 打开输出文件所在的文件夹
    const folderPath = outputPath.substring(0, outputPath.lastIndexOf('\\'));
    await open(folderPath);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>视频变速</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="speed">速度: {speed}x</Label>
          <Slider
            id="speed"
            min={0.25}
            max={4}
            step={0.25}
            value={[speed]}
            onValueChange={(value) => setSpeed(value[0])}
            disabled={isProcessing}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.25x</span>
            <span>1x</span>
            <span>4x</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="pitch"
            checked={preservePitch}
            onCheckedChange={setPreservePitch}
          />
          <Label htmlFor="pitch" className="cursor-pointer">
            保持音高(避免声音变调)
          </Label>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSpeedChange}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? '处理中...' : '立即执行'}
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

        {outputPath && (
          <div className="mt-4 p-3 bg-muted/50 dark:bg-muted/20 border rounded-lg">
            <p className="text-sm font-medium mb-2">✓ 变速完成!</p>
            <p className="text-xs break-all mb-2">
              输出文件: {outputPath}
            </p>
            <Button
              onClick={handleOpenFolder}
              size="sm"
              className="flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              打开文件夹
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
