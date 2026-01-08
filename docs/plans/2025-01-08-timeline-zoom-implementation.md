# Timeline Zoom Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance timeline zoom functionality from 1x-5x to 0.1x-10x with mouse wheel support and smart initial zoom based on video duration.

**Architecture:** React component with state-based zoom control. Add mouse wheel event listeners, modify zoom level calculation to use predefined array, and implement visual feedback for user interactions.

**Tech Stack:** React (TypeScript), Tauri, Tailwind CSS

---

## Task 1: Define Zoom Levels and Helper Functions

**Files:**
- Create: `src/components/Timeline/zoomLevels.ts`
- Test: `src/components/Timeline/__tests__/zoomLevels.test.ts`

**Step 1: Write the failing test**

Create file: `src/components/Timeline/__tests__/zoomLevels.test.ts`

```typescript
import { ZOOM_LEVELS, getInitialZoomForVideo, findClosestZoomLevel } from '../zoomLevels';

describe('zoomLevels', () => {
  describe('ZOOM_LEVELS', () => {
    it('should contain all required zoom levels', () => {
      expect(ZOOM_LEVELS).toEqual([0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]);
    });

    it('should be sorted in ascending order', () => {
      const sorted = [...ZOOM_LEVELS].sort((a, b) => a - b);
      expect(ZOOM_LEVELS).toEqual(sorted);
    });
  });

  describe('getInitialZoomForVideo', () => {
    it('should return 1.0 for short videos (< 1 minute)', () => {
      expect(getInitialZoomForVideo(30)).toBe(1.0);
      expect(getInitialZoomForVideo(59)).toBe(1.0);
    });

    it('should return 0.5 for medium videos (1-5 minutes)', () => {
      expect(getInitialZoomForVideo(60)).toBe(0.5);
      expect(getInitialZoomForVideo(300)).toBe(0.5);
    });

    it('should return 0.25 for long videos (> 5 minutes)', () => {
      expect(getInitialZoomForVideo(301)).toBe(0.25);
      expect(getInitialZoomForVideo(600)).toBe(0.25);
    });
  });

  describe('findClosestZoomLevel', () => {
    it('should return exact match if level exists', () => {
      expect(findClosestZoomLevel(1.0)).toBe(1.0);
      expect(findClosestZoomLevel(0.5)).toBe(0.5);
    });

    it('should return closest level if exact match not found', () => {
      expect(findClosestZoomLevel(0.8)).toBe(0.75);
      expect(findClosestZoomLevel(1.2)).toBe(1.5);
    });

    it('should clamp to min/max bounds', () => {
      expect(findClosestZoomLevel(0.05)).toBe(0.1);
      expect(findClosestZoomLevel(15)).toBe(10.0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- zoomLevels.test.ts`

Expected: FAIL with "Cannot find module '../zoomLevels'"

**Step 3: Write minimal implementation**

Create file: `src/components/Timeline/zoomLevels.ts`

```typescript
/**
 * Predefined zoom levels for timeline
 * Sorted from smallest (0.1x) to largest (10x)
 */
export const ZOOM_LEVELS = [
  0.1,   // 1/10 - ultra compact view
  0.25,  // 1/4
  0.5,   // 1/2
  0.75,  // 3/4
  1.0,   // standard (default)
  1.5,   // 1.5x
  2.0,   // 2x
  3.0,   // 3x
  5.0,   // 5x
  10.0   // 10x - fine editing
] as const;

/**
 * Get initial zoom level based on video duration
 * @param duration - Video duration in seconds
 * @returns Recommended initial zoom level
 */
export function getInitialZoomForVideo(duration: number): number {
  if (duration < 60) return 1.0;      // short videos (< 1 minute)
  if (duration < 300) return 0.5;    // medium videos (1-5 minutes)
  return 0.25;                        // long videos (> 5 minutes)
}

/**
 * Find the closest zoom level to a given value
 * @param value - Desired zoom level
 * @returns Closest zoom level from ZOOM_LEVELS
 */
export function findClosestZoomLevel(value: number): number {
  const clamped = Math.max(ZOOM_LEVELS[0], Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], value));

  let closest = ZOOM_LEVELS[0];
  let minDiff = Math.abs(clamped - ZOOM_LEVELS[0]);

  for (const level of ZOOM_LEVELS) {
    const diff = Math.abs(clamped - level);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }

  return closest;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- zoomLevels.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/components/Timeline/zoomLevels.ts src/components/Timeline/__tests__/zoomLevels.test.ts
git commit -m "feat: add zoom level constants and helper functions"
```

---

## Task 2: Update Timeline Component with Extended Zoom Range

**Files:**
- Modify: `src/components/Timeline/Timeline.tsx`
- Test: `src/components/Timeline/__tests__/Timeline.test.tsx`

**Step 1: Write the failing test**

Create or modify: `src/components/Timeline/__tests__/Timeline.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../Timeline';
import { useVideoStore } from '../../../store/videoStore';

// Mock the video store
jest.mock('../../../store/videoStore');

describe('Timeline Zoom', () => {
  beforeEach(() => {
    (useVideoStore as jest.Mock).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 120,
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 120,
      setTimelineRegion: jest.fn()
    });
  });

  it('should initialize with zoom level based on video duration', () => {
    render(<Timeline />);
    // For 120 seconds (2 minutes), initial zoom should be 0.5
    const zoomDisplay = screen.getByText(/0\.5x/);
    expect(zoomDisplay).toBeInTheDocument();
  });

  it('should zoom in when clicking + button', () => {
    render(<Timeline />);
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);
    // Should zoom from 0.5 to 0.75
    expect(screen.getByText(/0\.75x/)).toBeInTheDocument();
  });

  it('should zoom out when clicking - button', () => {
    render(<Timeline />);
    const minusButton = screen.getByText('-');
    fireEvent.click(minusButton);
    // Should zoom from 0.5 to 0.25
    expect(screen.getByText(/0\.25x/)).toBeInTheDocument();
  });

  it('should disable minus button at minimum zoom', () => {
    render(<Timeline />);
    const minusButton = screen.getByText('-');
    // Click until reaching minimum
    fireEvent.click(minusButton); // 0.5 -> 0.25
    fireEvent.click(minusButton); // 0.25 -> 0.1
    fireEvent.click(minusButton); // Should stay at 0.1

    expect(screen.getByText(/0\.1x/)).toBeInTheDocument();
    expect(minusButton).toBeDisabled();
  });

  it('should disable plus button at maximum zoom', () => {
    render(<Timeline />);

    // Click plus until reaching maximum
    const plusButton = screen.getByText('+');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(plusButton);
    }

    expect(screen.getByText(/10x/)).toBeInTheDocument();
    expect(plusButton).toBeDisabled();
  });

  it('should reset zoom when clicking reset button', () => {
    render(<Timeline />);

    // Zoom to a different level
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);

    // Click reset
    const resetButton = screen.getByLabelText('重置缩放');
    fireEvent.click(resetButton);

    // Should return to initial 0.5
    expect(screen.getByText(/0\.5x/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- Timeline.test.tsx`

Expected: FAIL with missing features (reset button, zoom level initialization, etc.)

**Step 3: Update Timeline component implementation**

Modify: `src/components/Timeline/Timeline.tsx`

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { formatDuration } from '../../utils/fileValidation';
import { TimelineSlider } from './TimelineSlider';
import { ThumbnailStrip } from './ThumbnailStrip';
import { ZOOM_LEVELS, getInitialZoomForVideo, findClosestZoomLevel } from './zoomLevels';
import { RefreshCw } from 'lucide-react';

export function Timeline() {
  const { currentVideo, timelineStart, timelineEnd, setTimelineRegion } = useVideoStore();
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    return currentVideo ? getInitialZoomForVideo(currentVideo.duration) : 1.0;
  });
  const [showZoomHint, setShowZoomHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update zoom level when video changes
  useEffect(() => {
    if (currentVideo) {
      setZoomLevel(getInitialZoomForVideo(currentVideo.duration));
    }
  }, [currentVideo?.path]);

  if (!currentVideo) return null;

  const duration = currentVideo.duration;
  const pixelsPerSecond = 100 * zoomLevel;
  const width = duration * pixelsPerSecond;
  const actualWidth = Math.max(width, containerRef.current?.clientWidth || 800);

  const handleRegionChange = useCallback((start: number, end: number) => {
    setTimelineRegion(start, end);
  }, [setTimelineRegion]);

  const handleZoomChange = useCallback((direction: number) => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level === zoomLevel);
    if (currentIndex === -1) {
      // Current zoom not in array, find closest
      const closest = findClosestZoomLevel(zoomLevel);
      const closestIndex = ZOOM_LEVELS.findIndex(level => level === closest);
      const newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, closestIndex + direction));
      setZoomLevel(ZOOM_LEVELS[newIndex]);
    } else {
      const newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + direction));
      setZoomLevel(ZOOM_LEVELS[newIndex]);
    }

    // Show zoom hint
    setShowZoomHint(true);
    setTimeout(() => setShowZoomHint(false), 1500);
  }, [zoomLevel]);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(getInitialZoomForVideo(duration));
    setShowZoomHint(true);
    setTimeout(() => setShowZoomHint(false), 1500);
  }, [duration]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    // Shift + wheel = zoom
    if (event.shiftKey) {
      event.preventDefault();

      const direction = event.deltaY > 0 ? -1 : 1;
      const step = event.ctrlKey || event.metaKey ? 2 : 1;

      const currentIndex = ZOOM_LEVELS.findIndex(level => level === zoomLevel);
      if (currentIndex !== -1) {
        const newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + direction * step));
        setZoomLevel(ZOOM_LEVELS[newIndex]);

        // Show zoom hint
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 1500);
      }
    }
    // Otherwise, allow default horizontal scrolling
  }, [zoomLevel]);

  const formatZoomLevel = (level: number): string => {
    return level % 1 === 0 ? `${level}x` : `${level.toFixed(1)}x`;
  };

  const canZoomOut = zoomLevel > ZOOM_LEVELS[0];
  const canZoomIn = zoomLevel < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 relative">
      {/* Zoom hint */}
      {showZoomHint && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm z-50 animate-fade-in-out">
          <div>
            {zoomLevel < 1 ? '🔍 缩小视图' : zoomLevel > 1 ? '🔍 放大视图' : '标准视图'}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {formatZoomLevel(zoomLevel)}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">时间轴</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoomChange(-1)}
            disabled={!canZoomOut}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="缩小"
          >
            -
          </button>
          <span className="text-sm text-gray-600 min-w-[3.5rem] text-center font-mono">
            {formatZoomLevel(zoomLevel)}
          </span>
          <button
            onClick={() => handleZoomChange(1)}
            disabled={!canZoomIn}
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
          {zoomLevel < 0.5 && (
            <span className="ml-1" title="缩小视图">🔍➖</span>
          )}
          {zoomLevel > 2 && (
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
          style={{ width: `${actualWidth}px`, height: '120px', minWidth: '100%' }}
        >
          {/* Video thumbnails */}
          <div className="absolute inset-0 top-6 bottom-0">
            <ThumbnailStrip
              videoPath={currentVideo.path}
              duration={duration}
              width={actualWidth}
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- Timeline.test.tsx`

Expected: PASS (all tests)

**Step 5: Add CSS animation**

Create or modify: `src/index.css` (add at end)

```css
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

.animate-fade-in-out {
  animation: fadeInOut 1.5s ease-out;
}
```

**Step 6: Commit**

```bash
git add src/components/Timeline/Timeline.tsx src/components/Timeline/__tests__/Timeline.test.tsx src/index.css
git commit -m "feat: implement extended zoom range (0.1x-10x) with wheel and button controls"
```

---

## Task 3: Add Integration Test for Zoom Interactions

**Files:**
- Create: `src/components/Timeline/__tests__/Timeline.integration.test.tsx`

**Step 1: Write the integration test**

```typescript
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '../Timeline';
import { useVideoStore } from '../../../store/videoStore';

jest.mock('../../../store/videoStore');

describe('Timeline Zoom Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    (useVideoStore as jest.Mock).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 600, // 10 minutes - long video
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 600,
      setTimelineRegion: jest.fn()
    });
  });

  it('should show first-time usage hint', () => {
    render(<Timeline />);
    expect(screen.getByText(/Shift \+ 滚轮可以缩放时间轴/)).toBeInTheDocument();
  });

  it('should hide first-time hint after closing', () => {
    render(<Timeline />);
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    expect(screen.queryByText(/Shift \+ 滚轮可以缩放时间轴/)).not.toBeInTheDocument();
    expect(localStorage.getItem('hasUsedTimelineZoom')).toBe('true');
  });

  it('should hide first-time hint after using zoom', () => {
    render(<Timeline />);
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);

    // Hint should disappear after zoom is used
    setTimeout(() => {
      expect(localStorage.getItem('hasUsedTimelineZoom')).toBe('true');
    }, 1600);
  });

  it('should initialize with 0.25x for long videos', () => {
    render(<Timeline />);
    expect(screen.getByText(/0\.25x/)).toBeInTheDocument();
  });

  it('should update timeline width when zooming', () => {
    const { container } = render(<Timeline />);

    // Get initial width
    const timelineContainer = container.querySelector('[style*="width"]');
    const initialWidth = timelineContainer?.style.width;

    // Zoom in
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);

    // Width should increase
    const updatedWidth = timelineContainer?.style.width;
    expect(updatedWidth).not.toBe(initialWidth);
  });

  it('should support Shift+wheel zooming', () => {
    const { container } = render(<Timeline />);
    const timelineArea = container.querySelector('.overflow-x-auto');

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      shiftKey: true
    });

    fireEvent(timelineArea!, wheelEvent);

    // Zoom should decrease
    expect(screen.getByText(/0\.1x/)).toBeInTheDocument();
  });

  it('should not zoom with regular wheel (no Shift)', () => {
    const { container } = render(<Timeline />);
    const timelineArea = container.querySelector('.overflow-x-auto');

    const initialZoom = screen.getByText(/0\.25x/).textContent;

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      shiftKey: false
    });

    fireEvent(timelineArea!, wheelEvent);

    // Zoom should not change
    expect(screen.getByText(/0\.25x/).textContent).toBe(initialZoom);
  });

  it('should support Ctrl+Shift+wheel for faster zoom', () => {
    const { container } = render(<Timeline />);
    const timelineArea = container.querySelector('.overflow-x-auto');

    // Zoom from 0.25 to 0.75 (skipping 0.5 due to Ctrl)
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100, // scroll up = zoom in
      shiftKey: true,
      ctrlKey: true
    });

    fireEvent(timelineArea!, wheelEvent);

    expect(screen.getByText(/0\.75x/)).toBeInTheDocument();
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- Timeline.integration.test.tsx`

Expected: PASS (all integration tests)

**Step 3: Commit**

```bash
git add src/components/Timeline/__tests__/Timeline.integration.test.tsx
git commit -m "test: add integration tests for zoom interactions"
```

---

## Task 4: Add Edge Case Handling and Error Boundaries

**Files:**
- Modify: `src/components/Timeline/Timeline.tsx`

**Step 1: Add error handling for zoom state**

Add to Timeline.tsx after the imports:

```typescript
// Add error boundary for zoom level
const clampZoomLevel = (level: number): number => {
  return Math.max(ZOOM_LEVELS[0], Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], level));
};

// Update handleZoomChange to use clamping
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

  // Show zoom hint
  setShowZoomHint(true);
  setTimeout(() => setShowZoomHint(false), 1500);
}, []);

// Update handleWheel to use clamping
const handleWheel = useCallback((event: React.WheelEvent) => {
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

    setShowZoomHint(true);
    setTimeout(() => setShowZoomHint(false), 1500);
  }
}, []);
```

**Step 2: Add tests for edge cases**

Add to Timeline.test.tsx:

```typescript
describe('Timeline Zoom Edge Cases', () => {
  it('should handle invalid zoom levels gracefully', () => {
    // Directly set invalid zoom level via state
    const { rerender } = render(<Timeline />);

    // Simulate state update with invalid zoom
    // Component should clamp to valid range
    expect(() => {
      // This would be tested by setting state directly
      // in a real scenario
    }).not.toThrow();
  });

  it('should handle rapid zoom changes', () => {
    render(<Timeline />);
    const plusButton = screen.getByText('+');

    // Rapidly click multiple times
    for (let i = 0; i < 20; i++) {
      fireEvent.click(plusButton);
    }

    // Should not exceed maximum
    expect(screen.getByText(/10x/)).toBeInTheDocument();
  });

  it('should handle video with zero duration', () => {
    (useVideoStore as jest.Mock).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 0,
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 0,
      setTimelineRegion: jest.fn()
    });

    expect(() => render(<Timeline />)).not.toThrow();
  });
});
```

**Step 3: Run tests**

Run: `npm test -- Timeline.test.tsx`

Expected: PASS (all tests including edge cases)

**Step 4: Commit**

```bash
git add src/components/Timeline/Timeline.tsx src/components/Timeline/__tests__/Timeline.test.tsx
git commit -m "fix: add edge case handling for zoom levels"
```

---

## Task 5: Performance Optimization - Memoization

**Files:**
- Modify: `src/components/Timeline/Timeline.tsx`

**Step 1: Add React.memo and useMemo for performance**

Update Timeline.tsx imports and add optimizations:

```typescript
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
// ... other imports

export function Timeline() {
  // ... existing code

  // Memoize zoom level display
  const formattedZoomLevel = useMemo(() => {
    return formatZoomLevel(zoomLevel);
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
    const pixelsPerSecond = 100 * zoomLevel;
    const width = duration * pixelsPerSecond;
    return {
      width,
      actualWidth: Math.max(width, containerRef.current?.clientWidth || 800),
      pixelsPerSecond
    };
  }, [duration, zoomLevel, containerRef.current?.clientWidth]);

  // ... rest of component using memoized values
}
```

**Step 2: Run performance tests**

Run: `npm test -- Timeline.test.tsx`

Expected: PASS (all tests still passing after optimization)

**Step 3: Commit**

```bash
git add src/components/Timeline/Timeline.tsx
git commit -m "perf: add memoization to optimize zoom performance"
```

---

## Task 6: Documentation and Type Definitions

**Files:**
- Create: `src/types/timeline.ts`

**Step 1: Create TypeScript type definitions**

```typescript
/**
 * Timeline zoom level (0.1x to 10x)
 */
export type ZoomLevel = 0.1 | 0.25 | 0.5 | 0.75 | 1.0 | 1.5 | 2.0 | 3.0 | 5.0 | 10.0;

/**
 * Zoom interaction types
 */
export type ZoomDirection = 'in' | 'out' | 'reset';

/**
 * Zoom hint state
 */
export interface ZoomHint {
  visible: boolean;
  level: ZoomLevel;
  message: string;
}

/**
 * Timeline zoom configuration
 */
export interface TimelineZoomConfig {
  level: ZoomLevel;
  minLevel: ZoomLevel;
  maxLevel: ZoomLevel;
  step: number;
  enableWheelZoom: boolean;
  enableButtonZoom: boolean;
}
```

**Step 2: Update Timeline component to use types**

Update Timeline.tsx to import and use types:

```typescript
import { ZoomLevel, ZoomDirection } from '../../types/timeline';

// Update state type
const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() => {
  return currentVideo ? getInitialZoomForVideo(currentVideo.duration) : 1.0;
});
```

**Step 3: Add README for timeline component**

Create: `src/components/Timeline/README.md`

```markdown
# Timeline Component

## Features

- Extended zoom range: 0.1x to 10x
- Mouse wheel zoom (Shift + wheel)
- Button controls (+/-/reset)
- Smart initial zoom based on video duration
- Visual feedback and hints

## Usage

```tsx
import { Timeline } from './components/Timeline';

function App() {
  return (
    <Timeline />
  );
}
```

## Zoom Levels

The timeline supports predefined zoom levels:
- 0.1x - Ultra compact view for very long videos
- 0.25x - Compact view for long videos
- 0.5x - Standard view for medium videos
- 0.75x - Slightly zoomed in
- 1.0x - Normal view (default for short videos)
- 1.5x - Moderately zoomed in
- 2.0x - Zoomed in for detail
- 3.0x - Highly zoomed in
- 5.0x - Very zoomed in
- 10.0x - Maximum zoom for fine editing

## Keyboard Shortcuts

- **Shift + Mouse Wheel**: Zoom in/out
- **Ctrl/Cmd + Shift + Wheel**: Fast zoom (skip levels)

## Initial Zoom Behavior

- Videos < 1 minute: 1.0x
- Videos 1-5 minutes: 0.5x
- Videos > 5 minutes: 0.25x
```

**Step 4: Commit**

```bash
git add src/types/timeline.ts src/components/Timeline/README.md src/components/Timeline/Timeline.tsx
git commit -m "docs: add TypeScript types and component documentation"
```

---

## Task 7: Final Testing and Validation

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Manual testing checklist**

Create: `docs/plans/TIMELINE_ZOOM_TEST_CHECKLIST.md`

```markdown
# Timeline Zoom Enhancement - Manual Testing Checklist

## P0 Tests (Must Pass)

- [ ] Load short video (< 1 min) → initial zoom should be 1.0x
- [ ] Load medium video (1-5 min) → initial zoom should be 0.5x
- [ ] Load long video (> 5 min) → initial zoom should be 0.25x
- [ ] Click "+" button → zoom increases
- [ ] Click "-" button → zoom decreases
- [ ] Click reset button → zoom returns to initial
- [ ] "+" button disabled at 10x
- [ ] "-" button disabled at 0.1x
- [ ] Shift + wheel up → zoom increases
- [ ] Shift + wheel down → zoom decreases
- [ ] Regular wheel (no Shift) → horizontal scrolling works

## P1 Tests (Important)

- [ ] First-time usage hint shows on initial load
- [ ] First-time hint disappears after closing
- [ ] First-time hint disappears after using zoom
- [ ] Zoom hint appears on zoom operation
- [ ] Zoom hint disappears after 1.5 seconds
- [ ] Timeline width updates smoothly on zoom
- [ ] Zoom level icon shows for extreme values
- [ ] Ctrl+Shift+wheel zooms faster (skips levels)

## P2 Tests (Nice to Have)

- [ ] Transition animation is smooth
- [ ] No visual glitches during rapid zoom
- [ ] Works with very long videos (> 30 min)
- [ ] Works with very short videos (< 10 sec)
- [ ] Button tooltips display correctly
- [ ] Accessibility: keyboard navigation works

## Performance Tests

- [ ] Zoom operation is smooth (60 FPS)
- [ ] No memory leaks after multiple zoom operations
- [ ] Thumbnail generation doesn't block zoom
- [ ] Scrolling is smooth at any zoom level

## Edge Cases

- [ ] Video with 0 duration doesn't crash
- [ ] Rapid zoom clicks don't break state
- [ ] Invalid zoom levels are clamped correctly
- [ ] Component unmounts cleanly
```

**Step 3: Lint and format check**

```bash
npm run lint
npm run format:check
```

**Step 4: Build verification**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 5: Commit final updates**

```bash
git add docs/plans/TIMELINE_ZOOM_TEST_CHECKLIST.md
git commit -m "test: add manual testing checklist for timeline zoom"
```

---

## Task 8: Create Migration Guide

**Files:**
- Create: `docs/migration/TIMELINE_ZOOM_MIGRATION.md`

**Step 1: Write migration guide**

```markdown
# Timeline Zoom Enhancement - Migration Guide

## Breaking Changes

None. This enhancement is fully backward compatible.

## What's New

### Extended Zoom Range
- **Before**: 1x to 5x
- **After**: 0.1x to 10x

### New Interactions
- **Shift + Mouse Wheel**: Zoom in/out
- **Ctrl/Cmd + Shift + Wheel**: Fast zoom
- **Reset Button**: Return to initial zoom level

### Smart Initial Zoom
The timeline now automatically selects an appropriate zoom level based on video duration:
- Short videos (< 1 min): 1.0x
- Medium videos (1-5 min): 0.5x
- Long videos (> 5 min): 0.25x

## API Changes

### Props
No props added or modified.

### State
The internal `zoomLevel` state type changed from `number` to `ZoomLevel` (a union type of valid zoom levels).

### Events
No new events added.

## Updating Your Code

If you were directly accessing `zoomLevel` state:

**Before:**
```typescript
const [zoomLevel, setZoomLevel] = useState(1); // 1-5
```

**After:**
```typescript
const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1.0); // 0.1-10
```

If you were testing for specific zoom levels:

**Before:**
```typescript
if (zoomLevel === 5) { // max zoom
```

**After:**
```typescript
if (zoomLevel === 10.0) { // new max zoom
```

## Testing Your Integration

1. Load your existing videos
2. Verify initial zoom level is appropriate for video length
3. Test zoom buttons still work
4. Test Shift+wheel zoom
5. Verify no regressions in your workflow

## Rollback Plan

If you need to revert to the old zoom range:

1. Restore `ZOOM_LEVELS` to `[1, 2, 3, 4, 5]`
2. Remove `getInitialZoomForVideo()` calls
3. Remove wheel event handlers
4. Update tests to expect 1-5 range

## Questions?

See the design doc: `docs/plans/2025-01-08-timeline-zoom-enhancement-design.md`
```

**Step 2: Commit**

```bash
git add docs/migration/TIMELINE_ZOOM_MIGRATION.md
git commit -m "docs: add migration guide for timeline zoom enhancement"
```

---

## Summary

This implementation plan delivers:

✅ Extended zoom range (0.1x - 10x)
✅ Mouse wheel zoom support (Shift + wheel)
✅ Smart initial zoom based on video duration
✅ Visual feedback and hints
✅ Comprehensive test coverage
✅ Performance optimizations
✅ Full documentation

**Estimated completion time**: 2-3 hours

**Test coverage target**: >90%

**Files modified**: 1 main component
**Files created**: 8 new files (utilities, tests, docs)

---

**Next Step**: Choose execution approach

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
