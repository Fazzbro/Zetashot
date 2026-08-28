import { describe, it, expect } from 'vitest';
import {
  easeLinear,
  easeInQuad,
  easeOutQuad,
  easeInOutCubic,
  smoothStep,
  interpolateNumber,
  interpolateKeyframe,
  KeyframePoint,
} from './easing';

describe('easing functions', () => {
  it('linear returns exact progress', () => {
    expect(easeLinear(0)).toBe(0);
    expect(easeLinear(0.5)).toBe(0.5);
    expect(easeLinear(1)).toBe(1);
  });

  it('easeInOutCubic eases at boundaries', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });

  it('smoothStep clamps and eases between 0 and 1', () => {
    expect(smoothStep(0)).toBe(0);
    expect(smoothStep(0.5)).toBe(0.5);
    expect(smoothStep(1)).toBe(1);
  });

  it('interpolateNumber calculates intermediate values', () => {
    expect(interpolateNumber(100, 200, 0.5, 'linear')).toBe(150);
    expect(interpolateNumber(100, 200, 0, 'linear')).toBe(100);
    expect(interpolateNumber(100, 200, 1, 'linear')).toBe(200);
  });

  describe('interpolateKeyframe', () => {
    const kf1: KeyframePoint = {
      id: '1',
      time: 0,
      x: 0,
      y: 0,
      zoom: 1.0,
      rotation: 0,
      easing: 'easeInOut',
    };
    const kf2: KeyframePoint = {
      id: '2',
      time: 2000, // 2s
      x: 200,
      y: 100,
      zoom: 1.5,
      rotation: 10,
      easing: 'easeInOut',
    };

    it('returns exact values at start time', () => {
      const result = interpolateKeyframe([kf1, kf2], 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.zoom).toBe(1.0);
      expect(result.rotation).toBe(0);
    });

    it('returns exact values at end time', () => {
      const result = interpolateKeyframe([kf1, kf2], 2000);
      expect(result.x).toBe(200);
      expect(result.y).toBe(100);
      expect(result.zoom).toBe(1.5);
      expect(result.rotation).toBe(10);
    });

    it('interpolates midpoint correctly', () => {
      const result = interpolateKeyframe([kf1, kf2], 1000);
      expect(result.x).toBeCloseTo(100, 1);
      expect(result.y).toBeCloseTo(50, 1);
      expect(result.zoom).toBeCloseTo(1.25, 2);
      expect(result.rotation).toBeCloseTo(5, 1);
    });

    it('clamps to first/last keyframe when outside timeline range', () => {
      const before = interpolateKeyframe([kf1, kf2], -100);
      expect(before.zoom).toBe(1.0);
      const after = interpolateKeyframe([kf1, kf2], 5000);
      expect(after.zoom).toBe(1.5);
    });
  });
});
