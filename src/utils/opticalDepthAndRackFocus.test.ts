import { describe, it, expect } from 'vitest';
import {
  interpolateCameraSpline,
  getOpticalFocusPoint,
  getRackFocusUnblurFactor,
} from './splineInterpolation';
import { TimelinePositionClip } from '../components/VideoTimeline';

describe('Optical Depth of Field, Focus Point Tracking & Rack-Focus Unblur', () => {
  it('computes exact normalized optical focal center for centered camera', () => {
    const defaultCam = { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 };
    const fp = getOpticalFocusPoint(defaultCam, { width: 960, height: 540 });
    expect(fp.x).toBeCloseTo(0.5, 2);
    expect(fp.y).toBeCloseTo(0.5, 2);
  });

  it('tracks optical focus point when camera pans across stage', () => {
    // Camera panned right by 192px at zoom 1.0 -> screen center looks at stageX = 480 - (-192) = 672 (70% of 960)
    const pannedRight = { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: -192, panY: 0, perspective: 1000 };
    const fp = getOpticalFocusPoint(pannedRight, { width: 960, height: 540 });
    expect(fp.x).toBeCloseTo(0.70, 2);
    expect(fp.y).toBeCloseTo(0.50, 2);
  });

  it('snaps focus center directly to active interest region', () => {
    const cam = { rotX: 10, rotY: 15, rotZ: 0, zoom: 1.2, panX: -50, panY: 20, perspective: 1000 };
    const region = { x: 192, y: 108, width: 192, height: 108 }; // Center is at (288, 162) -> (30%, 30%)
    const fp = getOpticalFocusPoint(cam, { width: 960, height: 540 }, region);
    expect(fp.x).toBeCloseTo(0.30, 2);
    expect(fp.y).toBeCloseTo(0.30, 2);
  });

  it('gradually unblurs during landing window [0.60 .. 1.00] with smooth cubic resolve', () => {
    // During travel (< 0.60): full motion depth
    expect(getRackFocusUnblurFactor(0.0)).toBe(1.0);
    expect(getRackFocusUnblurFactor(0.3)).toBe(1.0);
    expect(getRackFocusUnblurFactor(0.6)).toBe(1.0);

    // During landing ([0.60 .. 1.00]): unblur factor decreases smoothly
    const midLanding = getRackFocusUnblurFactor(0.8);
    expect(midLanding).toBeLessThan(1.0);
    expect(midLanding).toBeGreaterThan(0.0);

    // Upon exact arrival: 0.0 unblur factor (100% tack-sharp clarity)
    expect(getRackFocusUnblurFactor(1.0)).toBe(0.0);

    // When dwelling/holding at keyframe: 0.0 unblur factor
    expect(getRackFocusUnblurFactor(0.5, true)).toBe(0.0);
  });

  it('monotonic spline prevents overshoot and wobble on flat hold keyframes', () => {
    // 3 keyframes where P01 travels to 20deg, and P02 holds at 20deg
    const holdClips: TimelinePositionClip[] = [
      {
        id: 'p01',
        name: 'P01',
        startTime: 0,
        duration: 1.0,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
      },
      {
        id: 'p02',
        name: 'P02',
        startTime: 1.0,
        duration: 2.0,
        camera: { rotX: 20, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
      },
      {
        id: 'p03',
        name: 'P03',
        startTime: 3.0,
        duration: 0,
        camera: { rotX: 20, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
      },
    ];

    // During the hold period between 1.0s and 3.0s, rotX must never overshoot above 20.0 or dip below 20.0
    for (let t = 1.0; t <= 3.0; t += 0.1) {
      const cam = interpolateCameraSpline(holdClips, t);
      expect(cam.rotX).toBeCloseTo(20.0, 1);
      expect(cam.rotX).toBeLessThanOrEqual(20.001);
      expect(cam.rotX).toBeGreaterThanOrEqual(19.999);
    }
  });
});
