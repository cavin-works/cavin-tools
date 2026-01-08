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
