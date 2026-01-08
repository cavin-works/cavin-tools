import { useState, useRef, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { formatDuration } from '../../utils/fileValidation';
import { TimelineSlider } from './TimelineSlider';
import { ThumbnailStrip } from './ThumbnailStrip';

export function Timeline() {
  const { currentVideo, timelineStart, timelineEnd, setTimelineRegion } = useVideoStore();
  const [zoomLevel, setZoomLevel] = useState(1); // 1-5
  const containerRef = useRef<HTMLDivElement>(null);

  if (!currentVideo) return null;

  const duration = currentVideo.duration;
  const pixelsPerSecond = 100 * zoomLevel;
  const width = duration * pixelsPerSecond;
  // 不再限制宽度，允许横向滚动显示完整视频
  const actualWidth = Math.max(width, containerRef.current?.clientWidth || 800);

  const handleRegionChange = useCallback((start: number, end: number) => {
    setTimelineRegion(start, end);
  }, [setTimelineRegion]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">时间轴</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
          >
            -
          </button>
          <span className="text-sm text-gray-600">
            {zoomLevel}x
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 1))}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-x-auto border border-gray-300 rounded"
      >
        <div
          className="relative bg-gray-100 rounded overflow-hidden"
          style={{ width: `${actualWidth}px`, height: '120px', minWidth: '100%' }}
        >
          {/* 视频缩略图条纹 */}
          <div className="absolute inset-0 top-6 bottom-0">
            <ThumbnailStrip
              videoPath={currentVideo.path}
              duration={duration}
              width={actualWidth}
              height={90}
            />
          </div>

          {/* 时间刻度 */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-gray-300 bg-white bg-opacity-90">
            {Array.from({ length: Math.ceil(duration) }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 text-xs text-gray-600"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                {formatDuration(i)}
              </div>
            ))}
          </div>

          {/* 选择区域 */}
          {timelineEnd > 0 && (
            <div
              className="absolute top-6 bottom-0 bg-blue-200 bg-opacity-50 border-2 border-blue-500 pointer-events-none"
              style={{
                left: `${(timelineStart / duration) * 100}%`,
                width: `${((timelineEnd - timelineStart) / duration) * 100}%`
              }}
            />
          )}

          <TimelineSlider
            duration={duration}
            onRegionChange={handleRegionChange}
          />
        </div>
      </div>

      {/* 时间信息 */}
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>开始: {formatDuration(timelineStart)}</span>
        <span>时长: {formatDuration(duration)}</span>
        <span>结束: {timelineEnd > 0 ? formatDuration(timelineEnd) : formatDuration(duration)}</span>
      </div>
    </div>
  );
}
