import { useState, MouseEvent } from 'react';

interface TimelineSliderProps {
  duration: number;
  onRegionChange: (start: number, end: number) => void;
}

export function TimelineSlider({ duration, onRegionChange }: TimelineSliderProps) {
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [startPos, setStartPos] = useState(0);
  const [endPos, setEndPos] = useState(duration);

  const handleMouseDown = (type: 'start' | 'end') => (e: MouseEvent) => {
    e.stopPropagation();
    if (type === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingStart && !isDraggingEnd) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, (x / rect.width) * duration));

    if (isDraggingStart) {
      const newStart = Math.min(time, endPos - 0.1);
      setStartPos(newStart);
      onRegionChange(newStart, endPos);
    } else if (isDraggingEnd) {
      const newEnd = Math.max(time, startPos + 0.1);
      setEndPos(newEnd);
      onRegionChange(startPos, newEnd);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
  };

  return (
    <div
      className="absolute inset-0 cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 开始标记 */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize hover:w-2 transition-all"
        style={{ left: `${(startPos / duration) * 100}%` }}
        onMouseDown={handleMouseDown('start')}
      />

      {/* 结束标记 */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize hover:w-2 transition-all"
        style={{ left: `${(endPos / duration) * 100}%` }}
        onMouseDown={handleMouseDown('end')}
      />
    </div>
  );
}
