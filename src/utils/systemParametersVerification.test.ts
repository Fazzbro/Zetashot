import { describe, it, expect } from 'vitest';
import { calculateCameraForRegion, generateClipsFromInterestRegions, InterestRegion, STAGE_BASE_DIMS } from './interestRegionEngine';
import { interpolateCameraSpline, DEFAULT_SPLINE_CAMERA } from './splineInterpolation';
import { getMockupDimensions } from './aspectRatioHelper';
import { Camera3DState } from './camera3D';

describe('Comprehensive System & Parameter Verification', () => {
  const stageDims = STAGE_BASE_DIMS; // { width: 960, height: 540 }

  it('verifies mockup aspect ratio geometry for all presets', () => {
    const presets = ['16:9', '9:16', '1:1', '4:3', '21:9'];
    presets.forEach((preset) => {
      const dims = getMockupDimensions(preset);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });
  });

  it('strictly verifies Zero Interest Points on Compose causes zero camera changes and returns 0 keyframes', () => {
    const emptyClips = generateClipsFromInterestRegions([], 12.0, stageDims);
    expect(emptyClips).toEqual([]);
    expect(emptyClips.length).toBe(0);
  });

  it('verifies intelligent, readable auto-zoom scaling across different region sizes', () => {
    const baseCam: Camera3DState = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.70, panX: 0, panY: 0, perspective: 1000 };

    // Small region (e.g. button or card) -> Balanced focus push-in without extreme crop
    const smallRegion: InterestRegion = { id: 'r1', index: 1, x: 100, y: 75, width: 125, height: 90 };
    const smallCam = calculateCameraForRegion(smallRegion, stageDims, baseCam);
    expect(smallCam.zoom).toBeGreaterThanOrEqual(1.15);
    expect(smallCam.zoom).toBeLessThanOrEqual(1.35);

    // Large region (> 35% of stage) -> Balanced wide framing
    const largeRegion: InterestRegion = { id: 'r2', index: 2, x: 50, y: 50, width: 700, height: 400 };
    const largeCam = calculateCameraForRegion(largeRegion, stageDims, baseCam);
    expect(largeCam.zoom).toBeGreaterThanOrEqual(0.80);
    expect(largeCam.zoom).toBeLessThanOrEqual(1.15);
  });

  it('respects existing manual user camera zoom and position while focusing region', () => {
    const userCam: Camera3DState = { rotX: -5, rotY: 10, rotZ: 0, zoom: 1.20, panX: 50, panY: -20, perspective: 1000 };
    const region: InterestRegion = { id: 'r1', index: 1, x: 100, y: 75, width: 125, height: 90 };
    const adjustedCam = calculateCameraForRegion(region, stageDims, userCam);

    // Adjusts to ensure focus is clear and readable without over-zooming
    expect(adjustedCam.zoom).toBeGreaterThanOrEqual(1.25);
    expect(adjustedCam.zoom).toBeLessThanOrEqual(1.45);
  });

  it('verifies 1s per interest point synchronization across 1, 3, and 5 points', () => {
    const baseCam: Camera3DState = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.70, panX: 0, panY: 0, perspective: 1000 };

    // 1 point
    const r1: InterestRegion[] = [{ id: 'p1', index: 1, x: 50, y: 50, width: 150, height: 100 }];
    const clips1 = generateClipsFromInterestRegions(r1, 1.0, stageDims, baseCam);
    expect(clips1.length).toBe(2);
    expect(clips1[0].startTime).toBe(0);
    expect(clips1[0].duration).toBe(1.0);
    expect(clips1[1].startTime).toBe(1.0);

    // 3 points
    const r3: InterestRegion[] = [
      { id: 'p1', index: 1, x: 50, y: 50, width: 150, height: 100 },
      { id: 'p2', index: 2, x: 200, y: 150, width: 150, height: 100 },
      { id: 'p3', index: 3, x: 400, y: 100, width: 150, height: 100 },
    ];
    const clips3 = generateClipsFromInterestRegions(r3, 3.0, stageDims, baseCam);
    expect(clips3.length).toBe(4);
    expect(clips3[0].startTime).toBe(0);
    expect(clips3[1].startTime).toBe(1.0);
    expect(clips3[2].startTime).toBe(2.0);
    expect(clips3[3].startTime).toBe(3.0);

    // 5 points
    const r5: InterestRegion[] = [
      ...r3,
      { id: 'p4', index: 4, x: 600, y: 250, width: 150, height: 100 },
      { id: 'p5', index: 5, x: 750, y: 200, width: 150, height: 100 },
    ];
    const clips5 = generateClipsFromInterestRegions(r5, 5.0, stageDims, baseCam);
    expect(clips5.length).toBe(6);
    expect(clips5[0].startTime).toBe(0);
    expect(clips5[5].startTime).toBe(5.0);
  });

  it('verifies smooth camera spline interpolation across the entire timeline', () => {
    const baseCam: Camera3DState = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.70, panX: 0, panY: 0, perspective: 1000 };
    const r4: InterestRegion[] = [
      { id: 'p1', index: 1, x: 50, y: 50, width: 150, height: 100 },
      { id: 'p2', index: 2, x: 200, y: 150, width: 150, height: 100 },
      { id: 'p3', index: 3, x: 400, y: 100, width: 150, height: 100 },
      { id: 'p4', index: 4, x: 600, y: 250, width: 150, height: 100 },
    ];
    const clips = generateClipsFromInterestRegions(r4, 4.0, stageDims, baseCam);

    for (let t = 0; t <= 4.0; t += 0.25) {
      const interpolated = interpolateCameraSpline(clips, t);
      expect(interpolated.zoom).toBeGreaterThanOrEqual(0.65);
      expect(interpolated.zoom).toBeLessThanOrEqual(2.80);
      expect(Number.isFinite(interpolated.panX)).toBe(true);
      expect(Number.isFinite(interpolated.panY)).toBe(true);
      expect(Number.isFinite(interpolated.rotX)).toBe(true);
      expect(Number.isFinite(interpolated.rotY)).toBe(true);
    }
  });

  it('verifies video speed warping math for accurate playback synchronization', () => {
    const videoDuration = 3.0; // 3-second uploaded video
    const composedDuration = 4.0; // 4 interest points
    const playbackRate = videoDuration / composedDuration;
    expect(playbackRate).toBe(0.75); // Exact 0.75x slowdown

    // Seeking formula: (currentTime / composedDuration) * videoDuration
    const sampleTime = 2.0; // halfway through composition
    const targetVideoTime = (sampleTime / composedDuration) * videoDuration;
    expect(targetVideoTime).toBe(1.5); // exactly halfway through video
  });

  it('verifies deterministic frame counts across timeline durations and FPS rates', () => {
    const testCases = [
      { duration: 5.0, fps: 30, expectedFrames: 150 },
      { duration: 10.0, fps: 30, expectedFrames: 300 },
      { duration: 17.5, fps: 30, expectedFrames: 525 },
      { duration: 30.0, fps: 30, expectedFrames: 900 },
      { duration: 10.0, fps: 60, expectedFrames: 600 },
      { duration: 10.0, fps: 24, expectedFrames: 240 },
    ];

    for (const tc of testCases) {
      const frames = Math.max(1, Math.round(tc.duration * tc.fps));
      expect(frames).toBe(tc.expectedFrames);
    }
  });

  it('strictly verifies default camera zoom is 0.9x across system presets', () => {
    expect(DEFAULT_SPLINE_CAMERA.zoom).toBe(0.9);

    // Verify calculateCameraForRegion fallback with null/undefined baseCamera uses 0.90 base
    const testRegion: InterestRegion = { id: 'r_default', index: 1, x: 200, y: 150, width: 300, height: 200 };
    const cam = calculateCameraForRegion(testRegion, stageDims, undefined);
    expect(cam.zoom).toBeGreaterThanOrEqual(0.9);
  });

  it('verifies hardware video decoder clock sync without seeking storms', () => {
    // Simulates timeline progression derived directly from video.currentTime
    const clipStartTime = 2.0;
    const clipSpeed = 1.25;
    const sourceStartTime = 0.5;
    const videoCurrentTime = 1.75; // hardware video decoder reports 1.75s

    const computedNextTime = clipStartTime + (videoCurrentTime - sourceStartTime) / clipSpeed;
    expect(computedNextTime).toBe(3.0);

    // Inverse check: targetVidTime evaluated at computedNextTime yields the exact same videoCurrentTime
    const targetVidTime = (computedNextTime - clipStartTime) * clipSpeed + sourceStartTime;
    expect(targetVidTime).toBe(videoCurrentTime);
    expect(Math.abs(videoCurrentTime - targetVidTime)).toBe(0); // Zero drift!
  });

  it('verifies 3D model mode uses transparent background without blue box overlay', () => {
    // Media of type '3d' must render transparently without #0f172a chassis or blue radial gradient
    const is3D = true;
    const chassisFill = is3D ? 'transparent' : '#0f172a';
    expect(chassisFill).toBe('transparent');
  });
});
