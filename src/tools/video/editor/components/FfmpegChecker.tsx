import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FfmpegInfo {
  available: boolean;
  path: string;
  version: string;
  output: string;
}

export function FfmpegChecker({
  onReady
}: {
  onReady: (available: boolean) => void;
}) {
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [ffmpegInfo, setFfmpegInfo] = useState<FfmpegInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFfmpeg();
  }, []);

  const checkFfmpeg = async () => {
    try {
      setChecking(true);
      setError(null);
      const info = await invoke<FfmpegInfo>('check_ffmpeg');
      setFfmpegInfo(info);
      onReady(info.available);
    } catch (err) {
      setError(err as string);
      onReady(false);
    } finally {
      setChecking(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      await invoke('download_ffmpeg');

      // 下载完成后重新检查
      await checkFfmpeg();
    } catch (err) {
      setError(err as string);
    } finally {
      setDownloading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>正在检查 FFmpeg...</span>
      </div>
    );
  }

  if (ffmpegInfo?.available) {
    return (
      <div className="flex items-center gap-2 text-primary text-sm">
        <CheckCircle2 className="w-4 h-4" />
        <span>FFmpeg {ffmpegInfo.version} 已就绪</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <AlertCircle className="w-12 h-12 text-amber-500" />
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          需要安装 FFmpeg
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          应用需要 FFmpeg 来处理视频文件
        </p>
        {error && (
          <p className="text-destructive text-sm mb-4">
            {error}
          </p>
        )}
        <Button
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              正在下载 FFmpeg (约{navigator.userAgent.includes('Mac') ? '80' : '100'}MB)...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              自动下载 FFmpeg
            </>
          )}
        </Button>
        <p className="text-muted-foreground text-xs mt-2">
          支持 Windows 和 macOS，或手动安装后重启应用
        </p>
      </div>
    </div>
  );
}
