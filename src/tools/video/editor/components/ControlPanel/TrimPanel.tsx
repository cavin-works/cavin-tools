import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVideoStore } from '../../store/videoStore';
import { useOperationQueue } from '../../contexts/OperationQueueContext';
import { formatDuration } from '../../utils/fileValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function TrimPanel() {
  const { currentVideo, timelineStart, timelineEnd, isProcessing, setProcessing, setProgress, setOperation } = useVideoStore();
  const { addToQueue } = useOperationQueue();
  const [precise, setPrecise] = useState(false);

  const handleTrim = async () => {
    if (!currentVideo) return;

    setProcessing(true);
    setProgress(0);
    setOperation('正在截断视频...');

    try {
      const outputPath = await invoke<string>('trim_video', {
        inputPath: currentVideo.path,
        params: {
          start_time: timelineStart,
          end_time: timelineEnd,
          precise
        }
      });

      setProgress(100);
      alert(`截断完成: ${outputPath}`);
    } catch (error) {
      alert(`截断失败: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentVideo) return;

    addToQueue({
      type: 'trim',
      name: `截断 (${formatDuration(timelineStart)} - ${formatDuration(timelineEnd)})`,
      params: {
        start_time: timelineStart,
        end_time: timelineEnd,
        precise
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>截断视频</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 时间信息展示 */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              开始时间: {formatDuration(timelineStart)}
            </p>
            <p className="text-sm text-foreground">
              结束时间: {formatDuration(timelineEnd)}
            </p>
            <p className="text-sm text-foreground">
              时长: {formatDuration(timelineEnd - timelineStart)}
            </p>
          </div>
        </div>

        {/* 精确截断开关 */}
        <div className="flex items-center space-x-2">
          <Switch
            id="precise"
            checked={precise}
            onCheckedChange={setPrecise}
          />
          <Label htmlFor="precise" className="text-sm cursor-pointer">
            精确截断(重新编码,较慢)
          </Label>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleTrim}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? '截断中...' : '立即执行'}
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
