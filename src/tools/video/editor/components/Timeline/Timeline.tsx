import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { formatDuration } from '../../utils/fileValidation';
import { TimelineSlider } from './TimelineSlider';
import { ThumbnailStrip } from './ThumbnailStrip';
import { ZOOM_LEVELS, getInitialZoomForVideo } from './zoomLevels';
import { ZoomLevel } from '../../types/timeline';

// 常量定义
const PIXELS_PER_SECOND_BASE = 100;

export function Timeline() {
  const { currentVideo, timelineStart, timelineEnd, setTimelineRegion } = useVideoStore();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() => {
    if (currentVideo) {
      return getInitialZoomForVideo(currentVideo.duration) as ZoomLevel;
    }
    return 1.0;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update zoom level when video changes
  useEffect(() => {
    if (currentVideo) {
      setZoomLevel(getInitialZoomForVideo(currentVideo.duration) as ZoomLevel);
    }
  }, [currentVideo?.path, currentVideo?.duration]);

  // 添加原生 DOM 事件监听器来彻底阻止滚动
  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();

        const direction = event.deltaY > 0 ? -1 : 1;  // -1 = 缩小, 1 = 放大
        const maxLevel = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]; // 10.0
        const minLevel = 0.001;  // 最小缩放级别，确保仍可见

        setZoomLevel(prevLevel => {
          const newLevel = direction > 0
            ? Math.min(maxLevel, prevLevel * 1.25)  // 放大
            : Math.max(minLevel, prevLevel * 0.6);  // 缩小，但设置最小限制

          return newLevel;
        });
      }
    };

    // 使用 capture: true 确保在捕获阶段处理事件
    timelineElement.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    return () => {
      timelineElement.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, []);

  if (!currentVideo) return null;

  const duration = currentVideo.duration;

  // Memoize timeline dimensions
  const timelineDimensions = useMemo(() => {
    const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoomLevel;
    const width = duration * pixelsPerSecond;
    const actualWidth = Math.max(width, containerRef.current?.clientWidth || 800);
    return {
      width,
      actualWidth,
      pixelsPerSecond
    };
  }, [duration, zoomLevel, containerRef.current?.clientWidth]);

  const handleRegionChange = useCallback((start: number, end: number) => {
    setTimelineRegion(start, end);
  }, [setTimelineRegion]);

  return (
    <div
      ref={timelineRef}
      className="bg-card border border-border rounded-lg shadow-sm p-6 mb-4 relative"
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-foreground">时间轴</h2>
        <span className="text-sm text-muted-foreground">Shift + 滚轮可以缩放时间轴</span>
      </div>

      <div
        ref={containerRef}
        className="overflow-x-auto border border-border rounded"
      >
        <div
          className="relative bg-muted rounded overflow-hidden transition-all duration-300"
          style={{ width: `${timelineDimensions.actualWidth}px`, height: '120px', minWidth: '100%' }}
        >
          {/* Video thumbnails */}
          <div className="absolute inset-0 top-6 bottom-0">
            <ThumbnailStrip
              videoPath={currentVideo.path}
              duration={duration}
              width={timelineDimensions.actualWidth}
              height={90}
            />
          </div>

          {/* Time scale */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-border bg-card/90">
            {Array.from({ length: Math.ceil(duration) }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 text-xs text-muted-foreground"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                {formatDuration(i)}
              </div>
            ))}
          </div>

          {/* Selection region */}
          {timelineEnd > 0 && (
            <div
              className="absolute top-6 bottom-0 bg-primary/30 border-2 border-primary pointer-events-none"
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

      {/* Time information */}
      <div className="mt-4 flex justify-between text-sm text-muted-foreground">
        <span>开始: {formatDuration(timelineStart)}</span>
        <span>时长: {formatDuration(duration)}</span>
        <span>结束: {timelineEnd > 0 ? formatDuration(timelineEnd) : formatDuration(duration)}</span>
      </div>
    </div>
  );
}
