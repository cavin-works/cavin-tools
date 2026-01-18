import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RemoveTask } from '../types';

interface PreviewPanelProps {
  task: RemoveTask;
}

export function PreviewPanel({ task }: PreviewPanelProps) {
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (task.inputPath) {
      setOriginalUrl(convertFileSrc(task.inputPath));
    }
    if (task.result?.outputPath) {
      // 添加时间戳防止缓存
      setProcessedUrl(convertFileSrc(task.result.outputPath) + '?t=' + Date.now());
    }
  }, [task.inputPath, task.result?.outputPath]);

  if (!task.result) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>处理预览</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {processedUrl && (
            <img
              src={showOriginal ? originalUrl : processedUrl}
              alt={showOriginal ? '原图' : '处理后'}
              className="w-full h-full object-contain"
            />
          )}

          {/* 切换标签 */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded">
            {showOriginal ? '原图（有水印）' : '处理后（无水印）'}
          </div>

          {/* 对比按钮 */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4"
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
          >
            按住查看原图
          </Button>
        </div>

        {/* 水印信息 */}
        {task.result.watermarkInfo && (
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <p className="font-medium text-sm text-foreground">水印信息</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>水印尺寸: <span className="font-medium text-foreground">{task.result.watermarkInfo.watermarkSize}×{task.result.watermarkInfo.watermarkSize}</span></p>
              <p>位置: <span className="font-medium text-foreground">({task.result.watermarkInfo.regionX}, {task.result.watermarkInfo.regionY})</span></p>
              <p>右边距: <span className="font-medium text-foreground">{task.result.watermarkInfo.marginRight}px</span></p>
              <p>下边距: <span className="font-medium text-foreground">{task.result.watermarkInfo.marginBottom}px</span></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
