import { useVideoStore } from '@/store/videoStore';

export function VideoInfo() {
  const { currentVideo } = useVideoStore();

  if (!currentVideo) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">视频信息</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">文件名:</span>
          <p className="font-medium">{currentVideo.filename}</p>
        </div>
        <div>
          <span className="text-gray-600">时长:</span>
          <p className="font-medium">
            {Math.floor(currentVideo.duration / 60)}:{Math.floor(currentVideo.duration % 60).toString().padStart(2, '0')}
          </p>
        </div>
        <div>
          <span className="text-gray-600">分辨率:</span>
          <p className="font-medium">{currentVideo.width}x{currentVideo.height}</p>
        </div>
        <div>
          <span className="text-gray-600">帧率:</span>
          <p className="font-medium">{currentVideo.fps} fps</p>
        </div>
        <div>
          <span className="text-gray-600">编码器:</span>
          <p className="font-medium">{currentVideo.codec}</p>
        </div>
        <div>
          <span className="text-gray-600">比特率:</span>
          <p className="font-medium">{(currentVideo.bitrate / 1000000).toFixed(2)} Mbps</p>
        </div>
        <div>
          <span className="text-gray-600">文件大小:</span>
          <p className="font-medium">{(currentVideo.fileSize / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <div>
          <span className="text-gray-600">格式:</span>
          <p className="font-medium">{currentVideo.format}</p>
        </div>
      </div>
    </div>
  );
}
