/**
 * Timeline zoom level (any positive number, typical range: 0.01+ to 10x)
 */
export type ZoomLevel = number;

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
