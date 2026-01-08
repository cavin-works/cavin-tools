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
