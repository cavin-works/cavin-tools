# Timeline Component

## Features

- Extended zoom range: 0.1x to 10x
- Mouse wheel zoom (Shift + wheel)
- Button controls (+/-/reset)
- Smart initial zoom based on video duration
- Visual feedback and hints
- Performance optimized with React.memo

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

- **Shift + Mouse Wheel**: Zoom in/out (single level)
- **Ctrl/Cmd + Shift + Wheel**: Fast zoom (skip 2 levels)
- **Reset Button**: Return to initial zoom level

## Initial Zoom Behavior

The timeline automatically selects an appropriate zoom level based on video duration:
- Videos < 1 minute: 1.0x (normal view)
- Videos 1-5 minutes: 0.5x (standard view)
- Videos > 5 minutes: 0.25x (compact view)

## Component Structure

```
Timeline/
├── Timeline.tsx          # Main component
├── TimelineSlider.tsx    # Region selection slider
├── ThumbnailStrip.tsx    # Video thumbnail display
├── zoomLevels.ts         # Zoom level constants and helpers
├── __tests__/           # Component tests
└── README.md            # This file
```

## Props

The Timeline component uses the video store context and doesn't require direct props.

## State Management

The component uses:
- `currentVideo`: Current video metadata from video store
- `timelineStart/timelineEnd`: Selected time region
- `zoomLevel`: Current zoom level (ZoomLevel type)

## Performance

The component is optimized with:
- `useMemo` for expensive calculations (zoom display, button states, dimensions)
- `useCallback` for event handlers
- Optimized re-render patterns

## Accessibility

- Aria labels on all buttons
- Keyboard navigation support
- Visual feedback for all interactions
- Clear visual indicators for zoom state

## Examples

### Basic Usage

```tsx
import { Timeline } from '@/components/Timeline';

function VideoEditor() {
  return (
    <div>
      <Timeline />
      {/* Other editor components */}
    </div>
  );
}
```

### Custom Zoom Control (Advanced)

```tsx
import { Timeline } from '@/components/Timeline';
import { useVideoStore } from '@/store/videoStore';

function CustomEditor() {
  const { currentVideo } = useVideoStore();

  return (
    <div>
      {currentVideo && (
        <Timeline />
      )}
    </div>
  );
}
```

## Testing

```bash
# Run timeline tests
npm test -- Timeline

# Run specific test file
npm test -- Timeline.test.tsx
npm test -- zoomLevels.test.ts
```

## Troubleshooting

### Zoom not working
- Ensure video is loaded
- Check console for errors
- Verify zoom level is in valid range

### Performance issues
- Check video duration (very long videos may need optimization)
- Verify memoization is working
- Profile with React DevTools

## See Also

- Type definitions: `src/types/timeline.ts`
- Zoom utilities: `src/components/Timeline/zoomLevels.ts`
- Video store: `src/store/videoStore.ts`
