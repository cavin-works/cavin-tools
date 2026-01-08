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
 * @param duration - Video duration in seconds (must be non-negative)
 * @returns Recommended initial zoom level
 * @throws {Error} If duration is NaN or negative
 */
export function getInitialZoomForVideo(duration: number): number {
  // Input validation
  if (isNaN(duration)) {
    throw new Error('Duration must be a valid number');
  }
  if (duration < 0) {
    throw new Error('Duration must be non-negative');
  }

  // Edge case: zero duration videos
  if (duration === 0) return 1.0;

  if (duration < 60) return 1.0;      // short videos (< 1 minute)
  if (duration <= 300) return 0.5;    // medium videos (1-5 minutes, inclusive)
  return 0.25;                        // long videos (> 5 minutes)
}

/**
 * Find the closest zoom level to a given value
 * @param value - Desired zoom level
 * @returns Closest zoom level from ZOOM_LEVELS
 */
export function findClosestZoomLevel(value: number): number {
  const minLevel = ZOOM_LEVELS[0];
  const maxLevel = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const clamped = Math.max(minLevel, Math.min(maxLevel, value));

  // Special handling for values between 1.0 and 1.5
  // Prefer rounding up to give users more zoom capability
  if (clamped > 1.0 && clamped < 1.5) {
    return 1.5;
  }

  // For other ranges, find the closest level
  let closest: number = minLevel;
  let minDiff = Math.abs(clamped - minLevel);

  for (const level of ZOOM_LEVELS) {
    const diff = Math.abs(clamped - level);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }

  return closest;
}
