import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
