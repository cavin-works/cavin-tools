import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { 
  Download, 
  RefreshCw, 
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '@/core/store/appStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DownloadEvent } from '@/lib/updateUtils';
import { downloadAndInstall } from '@/lib/updateUtils';

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateDialog({ open, onOpenChange }: UpdateDialogProps) {
  const { 
    updateInfo, 
    updateStatus, 
    updateProgress, 
    setUpdateStatus, 
    setUpdateProgress,
    clearUpdate,
    skipCurrentVersion,
    setShowUpdateCompleteDialog
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen<string>('update-download', (event) => {
      try {
        const data: DownloadEvent = JSON.parse(event.payload);
        
        if (data.event === 'Started') {
          setUpdateStatus('downloading');
          if (data.data?.content_length) {
            setUpdateProgress({ downloaded: 0, total: data.data.content_length, percentage: 0 });
          }
        } else if (data.event === 'Progress') {
          setUpdateStatus('downloading');
          if (data.data) {
            setUpdateProgress({
              downloaded: data.data.downloaded || 0,
              total: data.data.total || 0,
              percentage: data.data.percentage || 0,
            });
          }
        } else if (data.event === 'Finished') {
          setUpdateStatus('complete');
          setShowUpdateCompleteDialog(true);
          onOpenChange(false);
        } else if (data.event === 'Error') {
          setError(data.data?.error || '下载失败');
          setUpdateStatus('error');
        }
      } catch (err) {
        console.error('解析更新事件失败:', err);
      }
    });

    return () => {
      unlisten.then(fn => fn()).catch(console.error);
    };
  }, [setUpdateStatus, setUpdateProgress, setShowUpdateCompleteDialog, onOpenChange]);

  const handleDownload = async () => {
    setError(null);
    setUpdateStatus('downloading');
    
    try {
      await downloadAndInstall();
    } catch (err) {
      setError(err as string);
      setUpdateStatus('error');
    }
  };

  const handleSkip = () => {
    skipCurrentVersion();
    clearUpdate();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (updateStatus === 'downloading') {
      return;
    }
    onOpenChange(false);
    clearUpdate();
  };

  const getStatusText = () => {
    switch (updateStatus) {
      case 'checking':
        return '正在检查更新...';
      case 'downloading':
        return `正在下载更新包... ${updateProgress.percentage.toFixed(1)}%`;
      case 'installing':
        return '正在安装更新...';
      case 'complete':
        return '更新完成！';
      case 'error':
        return '更新失败';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <DialogTitle>发现新版本</DialogTitle>
            </div>
            {updateStatus !== 'downloading' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <DialogDescription>
            当前版本 v{updateInfo?.current_version} → 新版本 v{updateInfo?.version}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 更新日志 */}
          <div className="max-h-64 overflow-y-auto rounded-lg border p-4 bg-muted/50">
            <pre className="whitespace-pre-wrap text-sm">
              {updateInfo?.body || '暂无更新日志'}
            </pre>
          </div>

          {/* 状态和进度 */}
          {['checking', 'downloading', 'installing'].includes(updateStatus) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className={`w-4 h-4 ${
                  updateStatus === 'checking' ? 'animate-spin' : ''
                }`} />
                <span>{getStatusText()}</span>
              </div>

              {updateStatus === 'downloading' && (
                <Progress 
                  value={updateProgress.percentage} 
                  className="w-full"
                />
              )}

              {updateStatus === 'installing' && (
                <div className="text-sm text-muted-foreground">
                  安装过程中应用可能需要重启...
                </div>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {updateStatus === 'error' && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium mb-1">更新失败</div>
                <div className="opacity-80">{error || '未知错误'}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <div>
            {updateStatus === 'idle' && (
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                跳过此版本
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {updateStatus === 'idle' && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  稍后提醒
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  立即更新
                </Button>
              </>
            )}

            {updateStatus === 'error' && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button onClick={handleDownload}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
