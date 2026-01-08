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
