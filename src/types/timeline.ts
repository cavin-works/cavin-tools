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
