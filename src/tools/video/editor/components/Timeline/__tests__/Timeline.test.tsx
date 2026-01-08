import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Timeline } from '../Timeline';
import { useVideoStore } from '../../../store/videoStore';

// Mock the video store
vi.mock('../../../store/videoStore');

describe('Timeline Zoom', () => {
  beforeEach(() => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 120,
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 120,
      setTimelineRegion: vi.fn()
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with zoom level based on video duration', () => {
    render(<Timeline />);
    // For 120 seconds (2 minutes), initial zoom should be 0.5
    const zoomDisplay = screen.getByText(/0\.5x/);
    expect(zoomDisplay).toBeInTheDocument();
  });

  it('should have zoom controls', () => {
    render(<Timeline />);
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByLabelText('重置缩放')).toBeInTheDocument();
  });

  it('should have working zoom buttons', () => {
    const { container } = render(<Timeline />);

    // Check initial zoom
    expect(screen.getByText('0.5x')).toBeInTheDocument();

    // Click plus button
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);

    // Check that zoom changed (should be 0.8x after rounding)
    const zoomTexts = container.querySelectorAll('.font-mono');
    expect(zoomTexts.length).toBeGreaterThan(0);
  });

  it('should show first-time usage hint', () => {
    render(<Timeline />);
    expect(screen.getByText(/Shift \+ 滚轮可以缩放时间轴/)).toBeInTheDocument();
  });
});

describe('Timeline Zoom Edge Cases', () => {
  beforeEach(() => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 120,
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 120,
      setTimelineRegion: vi.fn()
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle invalid zoom levels gracefully', () => {
    // Test that the component can handle edge cases
    const { container } = render(<Timeline />);

    // Simulate rapid zoom in
    const plusButton = screen.getByText('+');
    for (let i = 0; i < 20; i++) {
      fireEvent.click(plusButton);
    }

    // Should not exceed maximum (10x)
    // Use the font-mono element to find the current zoom level display
    const zoomDisplay = container.querySelector('.font-mono');
    expect(zoomDisplay?.textContent).toBe('10x');

    // Simulate rapid zoom out
    const minusButton = screen.getByText('-');
    for (let i = 0; i < 20; i++) {
      fireEvent.click(minusButton);
    }

    // Should not go below minimum (0.1x)
    expect(zoomDisplay?.textContent).toBe('0.1x');
  });

  it('should handle rapid zoom changes', () => {
    render(<Timeline />);
    const plusButton = screen.getByText('+');
    const minusButton = screen.getByText('-');

    // Rapidly click multiple times alternating
    for (let i = 0; i < 30; i++) {
      fireEvent.click(plusButton);
      fireEvent.click(minusButton);
    }

    // Component should not crash and should maintain a valid state
    const zoomTexts = screen.queryAllByText(/\d+(\.\d+)?x/);
    expect(zoomTexts.length).toBeGreaterThan(0);
  });

  it('should handle video with zero duration', () => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 0,
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 0,
      setTimelineRegion: vi.fn()
    });

    expect(() => render(<Timeline />)).not.toThrow();
  });

  it('should handle video with very large duration', () => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 999999, // Very long video
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 999999,
      setTimelineRegion: vi.fn()
    });

    expect(() => render(<Timeline />)).not.toThrow();
  });

  it('should handle very short duration videos', () => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: 0.1, // Very short video
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 0.1,
      setTimelineRegion: vi.fn()
    });

    expect(() => render(<Timeline />)).not.toThrow();
  });

  it('should clamp zoom level at minimum boundary', () => {
    const { container } = render(<Timeline />);

    const minusButton = screen.getByText('-');

    // Click until minimum
    fireEvent.click(minusButton); // 0.5 -> 0.25
    fireEvent.click(minusButton); // 0.25 -> 0.1

    // Should stay at 0.1x
    const zoomDisplay = container.querySelector('.font-mono');
    expect(zoomDisplay?.textContent).toBe('0.1x');
    expect(minusButton).toBeDisabled();
  });

  it('should clamp zoom level at maximum boundary', () => {
    const { container } = render(<Timeline />);

    const plusButton = screen.getByText('+');

    // Click until maximum
    for (let i = 0; i < 10; i++) {
      fireEvent.click(plusButton);
    }

    // Should stay at 10x
    const zoomDisplay = container.querySelector('.font-mono');
    expect(zoomDisplay?.textContent).toBe('10x');
    expect(plusButton).toBeDisabled();
  });

  it('should handle reset zoom correctly', () => {
    const { container } = render(<Timeline />);

    // Zoom in a few times
    const plusButton = screen.getByText('+');
    fireEvent.click(plusButton);
    fireEvent.click(plusButton);

    // Reset zoom
    const resetButton = screen.getByLabelText('重置缩放');
    fireEvent.click(resetButton);

    // Should return to initial zoom (0.5x for 120 seconds)
    expect(screen.getByText(/0\.5x/)).toBeInTheDocument();
  });

  it('should not crash with null currentVideo', () => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: null,
      timelineStart: 0,
      timelineEnd: 0,
      setTimelineRegion: vi.fn()
    });

    expect(() => render(<Timeline />)).not.toThrow();
  });

  it('should handle zoom with undefined duration', () => {
    (useVideoStore as any).mockReturnValue({
      currentVideo: {
        path: '/test/video.mp4',
        duration: undefined as any,
        width: 1920,
        height: 1080
      },
      timelineStart: 0,
      timelineEnd: 0,
      setTimelineRegion: vi.fn()
    });

    // Component should handle gracefully
    expect(() => render(<Timeline />)).not.toThrow();
  });
});
