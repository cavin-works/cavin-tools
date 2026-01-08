import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { formatDuration } from '../../utils/fileValidation';
import { TimelineSlider } from './TimelineSlider';
import { ThumbnailStrip } from './ThumbnailStrip';
import { ZOOM_LEVELS, getInitialZoomForVideo, findClosestZoomLevel } from './zoomLevels';
import { RefreshCw } from 'lucide-react';

// 常量定义
const ZOOM_HINT_TIMEOUT_MS = 1500;
const PIXELS_PER_SECOND_BASE = 100;

// 边界检查函数：确保缩放级别在有效范围内
const clampZoomLevel = (level: number): number => {
  const minLevel = ZOOM_LEVELS[0];
  const maxLevel = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  return Math.max(minLevel, Math.min(maxLevel, level));
};

export function Timeline() {
  const { currentVideo, timelineStart, timelineEnd, setTimelineRegion } = useVideoStore();
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    if (currentVideo) {
      const initialZoom = getInitialZoomForVideo(currentVideo.duration);
      return clampZoomLevel(initialZoom);
    }
    return 1.0;
  });
  const [showZoomHint, setShowZoomHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update zoom level when video changes
  useEffect(() => {
    if (currentVideo) {
      const initialZoom = getInitialZoomForVideo(currentVideo.duration);
      setZoomLevel(clampZoomLevel(initialZoom));
    }
  }, [currentVideo?.path, currentVideo?.duration]);

  // 清理定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (zoomHintTimeoutRef.current) {
        clearTimeout(zoomHintTimeoutRef.current);
      }
    };
  }, []);

  if (!currentVideo) return null;

  const duration = currentVideo.duration;

  // Memoize formatted zoom level display
  const formattedZoomLevel = useMemo(() => {
    return zoomLevel % 1 === 0 ? `${zoomLevel}x` : `${zoomLevel.toFixed(1)}x`;
  }, [zoomLevel]);

  // Memoize button states
  const buttonStates = useMemo(() => ({
    canZoomOut: zoomLevel > ZOOM_LEVELS[0],
    canZoomIn: zoomLevel < ZOOM_LEVELS[ZOOM_LEVELS.length - 1],
    showZoomOutIcon: zoomLevel < 0.5,
    showZoomInIcon: zoomLevel > 2
  }), [zoomLevel]);

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

  const handleZoomChange = useCallback((direction: number) => {
    setZoomLevel(prevLevel => {
      const currentIndex = ZOOM_LEVELS.findIndex(level => level === prevLevel);

      let newIndex: number;
      if (currentIndex === -1) {
        // Current zoom not in array, find closest and navigate
        const closest = findClosestZoomLevel(prevLevel);
        const closestIndex = ZOOM_LEVELS.findIndex(level => level === closest);
        newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, closestIndex + direction));
      } else {
        newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + direction));
      }

      const newLevel = ZOOM_LEVELS[newIndex];
      return clampZoomLevel(newLevel);
    });

    // Show zoom hint with proper cleanup
    setShowZoomHint(true);
    if (zoomHintTimeoutRef.current) {
      clearTimeout(zoomHintTimeoutRef.current);
    }
    zoomHintTimeoutRef.current = setTimeout(() => setShowZoomHint(false), ZOOM_HINT_TIMEOUT_MS);
  }, []);

  const handleResetZoom = useCallback(() => {
    const resetZoom = getInitialZoomForVideo(duration);
    setZoomLevel(clampZoomLevel(resetZoom));
    setShowZoomHint(true);
    if (zoomHintTimeoutRef.current) {
      clearTimeout(zoomHintTimeoutRef.current);
    }
    zoomHintTimeoutRef.current = setTimeout(() => setShowZoomHint(false), ZOOM_HINT_TIMEOUT_MS);
  }, [duration]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    // Shift + wheel = zoom
    if (event.shiftKey) {
      event.preventDefault();

      const direction = event.deltaY > 0 ? -1 : 1;
      const step = event.ctrlKey || event.metaKey ? 2 : 1;

      setZoomLevel(prevLevel => {
        const currentIndex = ZOOM_LEVELS.findIndex(level => level === prevLevel);

        if (currentIndex !== -1) {
          const newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + direction * step));
          const newLevel = ZOOM_LEVELS[newIndex];
          return clampZoomLevel(newLevel);
        }

        return prevLevel;
      });

      // Show zoom hint with proper cleanup
      setShowZoomHint(true);
      if (zoomHintTimeoutRef.current) {
        clearTimeout(zoomHintTimeoutRef.current);
      }
      zoomHintTimeoutRef.current = setTimeout(() => setShowZoomHint(false), ZOOM_HINT_TIMEOUT_MS);
    }
    // Otherwise, allow default horizontal scrolling
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 relative">
      {/* Zoom hint */}
      {showZoomHint && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm z-50 animate-fade-in-out">
          <div>
            {zoomLevel < 1 ? '🔍 缩小视图' : zoomLevel > 1 ? '🔍 放大视图' : '标准视图'}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {formattedZoomLevel}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">时间轴</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoomChange(-1)}
            disabled={!buttonStates.canZoomOut}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="缩小"
          >
            -
          </button>
          <span className="text-sm text-gray-600 min-w-[3.5rem] text-center font-mono">
            {formattedZoomLevel}
          </span>
          <button
            onClick={() => handleZoomChange(1)}
            disabled={!buttonStates.canZoomIn}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="放大"
          >
            +
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100 text-gray-500"
            title="重置缩放"
            aria-label="重置缩放"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Status icon */}
          {buttonStates.showZoomOutIcon && (
            <span className="ml-1" title="缩小视图">🔍➖</span>
          )}
          {buttonStates.showZoomInIcon && (
            <span className="ml-1" title="放大视图">🔍➕</span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-x-auto border border-gray-300 rounded"
        onWheel={handleWheel}
      >
        <div
          className="relative bg-gray-100 rounded overflow-hidden transition-all duration-300"
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

          {/* Selection region */}
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

      {/* Time information */}
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>开始: {formatDuration(timelineStart)}</span>
        <span>时长: {formatDuration(duration)}</span>
        <span>结束: {timelineEnd > 0 ? formatDuration(timelineEnd) : formatDuration(duration)}</span>
      </div>

      {/* Usage hint for first-time users */}
      {!localStorage.getItem('hasUsedTimelineZoom') && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>Shift + 滚轮可以缩放时间轴</span>
            <button
              onClick={() => localStorage.setItem('hasUsedTimelineZoom', 'true')}
              className="ml-2 text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
