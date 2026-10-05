import { describe, it, expect } from 'vitest';
import { clampRotation } from '../utils/camera3D';
import { getDefaultTimelineDuration } from '../utils/viewportPresets';

describe('Mobile Responsiveness and Touch Gestures Logic', () => {
  it('correctly clamps rotation values during touch dragging for X/Y and Z axes', () => {
    // Pitch (X) and Yaw (Y) are clamped between -85 and +85 to prevent gimbal flipping
    expect(clampRotation(90, -85, 85)).toBe(85);
    expect(clampRotation(-100, -85, 85)).toBe(-85);
    expect(clampRotation(45, -85, 85)).toBe(45);

    // Roll (Z) can rotate up to +/- 180 degrees
    expect(clampRotation(200, -180, 180)).toBe(180);
    expect(clampRotation(-210, -180, 180)).toBe(-180);
    expect(clampRotation(15, -180, 180)).toBe(15);
  });

  it('calculates pinch-to-zoom distance scale factor correctly without division by zero', () => {
    const calculatePinchZoom = (initialDistance: number, currentDistance: number, initialZoom: number) => {
      const scaleFactor = currentDistance / Math.max(1, initialDistance);
      return Math.max(0.2, Math.min(3.5, Number((initialZoom * scaleFactor).toFixed(2))));
    };

    // Zooming in: distance doubles
    expect(calculatePinchZoom(100, 200, 1.0)).toBe(2.0);

    // Zooming out: distance halves
    expect(calculatePinchZoom(200, 100, 1.0)).toBe(0.5);

    // Clamps to min 0.2x
    expect(calculatePinchZoom(200, 10, 1.0)).toBe(0.2);

    // Clamps to max 3.5x
    expect(calculatePinchZoom(50, 400, 1.0)).toBe(3.5);

    // Zero initial distance fallback handles gracefully
    expect(calculatePinchZoom(0, 100, 1.0)).toBe(3.5);
  });

  it('calculates single-finger pan movement scaled by stageScale accurately', () => {
    const calculatePan = (initialPan: number, deltaPx: number, stageScale: number) => {
      const currentScale = stageScale || 1.0;
      return Math.round(initialPan + deltaPx / currentScale);
    };

    // 1:1 scale pan
    expect(calculatePan(0, 100, 1.0)).toBe(100);

    // On scaled canvas (e.g. 0.5x stage scale on mobile phone), touch delta of 50px translates to 100px stage coordinates
    expect(calculatePan(0, 50, 0.5)).toBe(100);

    // Pan with existing offset
    expect(calculatePan(50, -30, 1.0)).toBe(20);
  });

  it('determines mobile collapsed timeline state based on viewport width contract', () => {
    const shouldCollapseTimeline = (width: number) => width <= 768;

    // Mobile phones
    expect(shouldCollapseTimeline(320)).toBe(true);
    expect(shouldCollapseTimeline(360)).toBe(true);
    expect(shouldCollapseTimeline(390)).toBe(true);
    expect(shouldCollapseTimeline(412)).toBe(true);
    expect(shouldCollapseTimeline(768)).toBe(true);

    // Tablets and Desktop
    expect(shouldCollapseTimeline(1024)).toBe(false);
    expect(shouldCollapseTimeline(1440)).toBe(false);
    expect(shouldCollapseTimeline(1920)).toBe(false);
  });

  it('enforces default timeline duration of 10s on mobile devices and 12s on desktop', () => {
    // Mobile devices (<= 768px): 10.0s
    expect(getDefaultTimelineDuration(320)).toBe(10.0);
    expect(getDefaultTimelineDuration(360)).toBe(10.0);
    expect(getDefaultTimelineDuration(390)).toBe(10.0);
    expect(getDefaultTimelineDuration(412)).toBe(10.0);
    expect(getDefaultTimelineDuration(768)).toBe(10.0);

    // Desktop and larger devices (> 768px): 12.0s
    expect(getDefaultTimelineDuration(769)).toBe(12.0);
    expect(getDefaultTimelineDuration(1024)).toBe(12.0);
    expect(getDefaultTimelineDuration(1440)).toBe(12.0);
    expect(getDefaultTimelineDuration(1920)).toBe(12.0);
  });
});
