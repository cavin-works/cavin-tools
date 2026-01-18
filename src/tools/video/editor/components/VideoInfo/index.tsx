import { useVideoStore } from '../../store/videoStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function VideoInfo() {
  const { currentVideo } = useVideoStore();

  if (!currentVideo) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>视频信息</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label>文件名:</Label>
            <p className="font-medium">{currentVideo.filename}</p>
          </div>
          <div>
            <Label>时长:</Label>
            <p className="font-medium">
              {Math.floor(currentVideo.duration / 60)}:{Math.floor(currentVideo.duration % 60).toString().padStart(2, '0')}
            </p>
          </div>
          <div>
            <Label>分辨率:</Label>
            <p className="font-medium">{currentVideo.width}x{currentVideo.height}</p>
          </div>
          <div>
            <Label>帧率:</Label>
            <p className="font-medium">{currentVideo.fps} fps</p>
          </div>
          <div>
            <Label>编码器:</Label>
            <p className="font-medium">{currentVideo.codec}</p>
          </div>
          <div>
            <Label>比特率:</Label>
            <p className="font-medium">{(currentVideo.bitrate / 1000000).toFixed(2)} Mbps</p>
          </div>
          <div>
            <Label>文件大小:</Label>
            <p className="font-medium">{(currentVideo.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div>
            <Label>格式:</Label>
            <p className="font-medium">{currentVideo.format}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
