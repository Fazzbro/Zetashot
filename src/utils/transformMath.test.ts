import { describe, it, expect } from 'vitest';
import {
  clampZoom,
  calculateZoomAroundPoint,
  snapToGuides,
  calculateAspectRatio,
  degToRad,
  formatDimensions,
} from './transformMath';

describe('transformMath', () => {
  describe('clampZoom', () => {
    it('clamps zoom within min 0.25 (25%) and max 4.0 (400%)', () => {
      expect(clampZoom(0.1)).toBe(0.25);
      expect(clampZoom(5.0)).toBe(4.0);
      expect(clampZoom(1.0)).toBe(1.0);
      expect(clampZoom(2.5)).toBe(2.5);
    });
  });

  describe('calculateZoomAroundPoint', () => {
    it('keeps cursor point invariant when zooming in', () => {
      const currentZoom = 1.0;
      const newZoom = 2.0;
      const cursor = { x: 400, y: 300 };
      const pan = { x: 0, y: 0 };

      const newPan = calculateZoomAroundPoint(currentZoom, newZoom, cursor, pan);
      // When zooming from 1 to 2 around (400, 300) starting at pan (0,0):
      // point in world = (400 - 0) / 1 = 400
      // new pan = 400 - (400 * 2) = -400
      expect(newPan.x).toBe(-400);
      expect(newPan.y).toBe(-300);
    });
  });

  describe('snapToGuides', () => {
    it('snaps to center horizontal and vertical if within threshold', () => {
      const pos = { x: 98, y: 102 };
      const canvasSize = { width: 1000, height: 800 };
      const objectSize = { width: 800, height: 600 };
      // Center of canvas is (1000 - 800)/2 = 100 on X, (800 - 600)/2 = 100 on Y
      const threshold = 5;

      const result = snapToGuides(pos, objectSize, canvasSize, threshold);
      expect(result.snappedPosition.x).toBe(100);
      expect(result.snappedPosition.y).toBe(100);
      expect(result.snappedX).toBe(true);
      expect(result.snappedY).toBe(true);
    });

    it('does not snap if outside threshold', () => {
      const pos = { x: 80, y: 120 };
      const canvasSize = { width: 1000, height: 800 };
      const objectSize = { width: 800, height: 600 };
      const threshold = 5;

      const result = snapToGuides(pos, objectSize, canvasSize, threshold);
      expect(result.snappedPosition.x).toBe(80);
      expect(result.snappedPosition.y).toBe(120);
      expect(result.snappedX).toBe(false);
      expect(result.snappedY).toBe(false);
    });
  });

  describe('calculateAspectRatio', () => {
    it('calculates common aspect ratios accurately', () => {
      expect(calculateAspectRatio(1920, 1080)).toBe('16:9');
      expect(calculateAspectRatio(1440, 900)).toBe('16:10');
      expect(calculateAspectRatio(1024, 768)).toBe('4:3');
      expect(calculateAspectRatio(1080, 1080)).toBe('1:1');
      expect(calculateAspectRatio(1080, 1920)).toBe('9:16');
    });
  });

  describe('degToRad', () => {
    it('converts degrees to radians correctly', () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
    });
  });

  describe('formatDimensions', () => {
    it('formats width, height, and DPR properly', () => {
      expect(formatDimensions(1920, 1080, 2)).toBe('1920 × 1080 @2x (3840×2160)');
    });
  });
});
