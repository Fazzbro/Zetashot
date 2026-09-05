import { describe, it, expect } from 'vitest';
import {
  isCropActive,
  calculateCroppedDimensions,
  calculateMediaCropOffset,
} from './cropMath';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { interpolateCameraSpline } from './splineInterpolation';
import { generateClipsFromInterestRegions } from './interestRegionEngine';
import { Camera3DState } from './camera3D';

describe('cropMath & Media Input Cropping without Scaling', () => {
  const baseDims = { width: 520, height: 292.5 };

  it('correctly identifies default 100% rect as not cropped', () => {
    expect(isCropActive({ x: 0, y: 0, width: 100, height: 100 })).toBe(false);
    expect(isCropActive(null)).toBe(false);
    expect(isCropActive(undefined)).toBe(false);
  });

  it('correctly identifies partial rect as active crop', () => {
    expect(isCropActive({ x: 10, y: 10, width: 80, height: 80 })).toBe(true);
    expect(isCropActive({ x: 0, y: 0, width: 50, height: 100 })).toBe(true);
    expect(isCropActive({ x: 5, y: 0, width: 100, height: 100 })).toBe(true);
  });

  it('returns base dimensions when crop is inactive', () => {
    const dims = calculateCroppedDimensions(baseDims, { x: 0, y: 0, width: 100, height: 100 });
    expect(dims.width).toBe(520);
    expect(dims.height).toBe(293);
  });

  it('crops media dimensions proportionally to cropRect instead of scaling to original size', () => {
    // 50% width, 50% height crop
    const dims50 = calculateCroppedDimensions(baseDims, { x: 25, y: 25, width: 50, height: 50 });
    expect(dims50.width).toBe(260);
    expect(dims50.height).toBe(146);

    // 70% width, 40% height crop
    const dims70x40 = calculateCroppedDimensions(baseDims, { x: 10, y: 20, width: 70, height: 40 });
    expect(dims70x40.width).toBe(364);
    expect(dims70x40.height).toBe(117);
  });

  it('computes exact translation offset for unscaled media alignment', () => {
    const offset = calculateMediaCropOffset(baseDims, { x: 20, y: 30, width: 60, height: 50 }, 1.0);
    expect(offset.offsetX).toBe(104); // 20% of 520
    expect(offset.offsetY).toBe(88);  // 30% of 292.5 = 87.75 -> 88
  });
});

describe('Perspective Keyframe Persistence & Interpolation', () => {
  it('persists custom perspective values into keyframe cameras and interpolates smoothly', () => {
    const clips: TimelinePositionClip[] = [
      {
        id: 'P01',
        name: 'P01',
        startTime: 0,
        duration: 1.5,
        camera: { rotX: 10, rotY: 15, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 450 },
      },
      {
        id: 'P02',
        name: 'P02',
        startTime: 1.5,
        duration: 1.5,
        camera: { rotX: 25, rotY: -20, rotZ: 5, zoom: 1.2, panX: 0, panY: 0, perspective: 1600 },
      },
    ];

    // At start (t = 0), perspective must be exact start perspective
    const at0 = interpolateCameraSpline(clips, 0);
    expect(at0.perspective).toBe(450);

    // Midway through transition (t = 1.5), perspective must smoothly interpolate between 450 and 1600
    const atMid = interpolateCameraSpline(clips, 1.5);
    expect(atMid.perspective).toBeGreaterThan(800);
    expect(atMid.perspective).toBeLessThan(1250);

    // At end (t = 3.0), perspective must be exact end perspective
    const at3 = interpolateCameraSpline(clips, 3.0);
    expect(at3.perspective).toBe(1600);
  });

  it('preserves user custom perspective when auto-composing interest regions', () => {
    const customBaseCam: Camera3DState = {
      rotX: 12,
      rotY: -18,
      rotZ: 2,
      zoom: 0.9,
      panX: 20,
      panY: -10,
      perspective: 650, // User set dramatic wide perspective
    };

    const regions = [
      { id: 'r1', index: 0, x: 100, y: 100, width: 200, height: 150 },
      { id: 'r2', index: 1, x: 400, y: 250, width: 180, height: 120 },
    ];

    const generated = generateClipsFromInterestRegions(
      regions,
      4.0,
      { width: 960, height: 540 },
      customBaseCam
    );

    expect(generated.length).toBeGreaterThanOrEqual(2);
    // Overview keyframe must inherit custom base perspective
    expect(generated[0].camera.perspective).toBe(650);
    // Subsequent focus keyframes must modulate based on custom base perspective rather than reset to 1000
    expect(generated[1].camera.perspective).toBeLessThan(900);
  });
});
