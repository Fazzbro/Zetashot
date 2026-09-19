import { describe, it, expect } from 'vitest';
import {
  InterestRegion,
  calculateCameraForRegion,
  generateClipsFromInterestRegions,
  STAGE_BASE_DIMS,
} from './interestRegionEngine';
import { Camera3DState } from './camera3D';

describe('interestRegionEngine (Intelligent Auto-Zoom & Framing)', () => {
  const stageDims = STAGE_BASE_DIMS; // { width: 960, height: 540 }

  const sampleRegions: InterestRegion[] = [
    {
      id: 'reg-1',
      index: 1,
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      label: 'Top Left Feature',
    },
    {
      id: 'reg-2',
      index: 2,
      x: 100,
      y: 300,
      width: 300,
      height: 150,
      label: 'Bottom Slider',
    },
    {
      id: 'reg-3',
      index: 3,
      x: 600,
      y: 150,
      width: 250,
      height: 200,
      label: 'Right Display',
    },
  ];

  it('calculates intelligent, readable camera zoom for marked focus region', () => {
    const baseCamera: Camera3DState = {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      zoom: 0.70,
      panX: 0,
      panY: 0,
      perspective: 1000,
    };
    const r1 = sampleRegions[0];
    const cam = calculateCameraForRegion(r1, stageDims, baseCamera, 1000);

    // Zoom pushes in cleanly to make the 200x150 region readable and highlighted (e.g. 1.8x - 2.5x)
    expect(cam.zoom).toBeGreaterThanOrEqual(1.40);
    expect(cam.zoom).toBeLessThanOrEqual(2.50);
    // Pan centers the region accurately
    expect(Math.abs(cam.panX)).toBeLessThan(stageDims.width * cam.zoom);
    expect(Math.abs(cam.panY)).toBeLessThan(stageDims.height * cam.zoom);
  });

  it('calculates cinematic dynamic 3D angles (Auto X, Y, Z) based on region position', () => {
    const baseCamera: Camera3DState = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.70, panX: 0, panY: 0, perspective: 1000 };
    
    // Top-left region: should have positive rotY (facing camera) and negative rotX / Dutch roll rotZ
    const topLeftRegion: InterestRegion = { id: 'tl', index: 1, x: 50, y: 50, width: 150, height: 100 };
    const tlCam = calculateCameraForRegion(topLeftRegion, stageDims, baseCamera, 1000, true);
    expect(tlCam.rotY).toBeGreaterThan(5); // Turns rightward towards center
    expect(tlCam.rotZ).toBeLessThan(0);    // Subtle Dutch tilt
    
    // Bottom-right region: should have negative rotY and positive rotX (tilting bottom forward)
    const bottomRightRegion: InterestRegion = { id: 'br', index: 2, x: 750, y: 400, width: 150, height: 100 };
    const brCam = calculateCameraForRegion(bottomRightRegion, stageDims, baseCamera, 1000, true);
    expect(brCam.rotY).toBeLessThan(-5);   // Turns leftward towards center
    expect(brCam.rotX).toBeGreaterThan(5); // Bottom tilts forward
  });

  it('accurately centers the marked interest point without drifting left or right', () => {
    const baseCamera: Camera3DState = { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 };
    // Marked point at (680, 270) -> 200px to the right of stage center (480, 270)
    const rightRegion: InterestRegion = { id: 'r-center', index: 1, x: 630, y: 220, width: 100, height: 100 };
    const cam = calculateCameraForRegion(rightRegion, stageDims, baseCamera);

    // To bring a point 200px to the right to center (480), panX must equal -200 * zoom
    const regionCenterX = 630 + 50; // 680
    const offsetX = regionCenterX - stageDims.width / 2; // 680 - 480 = 200
    expect(cam.panX).toBe(Number((-offsetX * cam.zoom).toFixed(1)));
  });

  it('respects existing user camera zoom and pushes into readable focus', () => {
    const customUserCamera: Camera3DState = {
      rotX: -5,
      rotY: 10,
      rotZ: 0,
      zoom: 1.20,
      panX: 20,
      panY: -10,
      perspective: 1000,
    };
    const r1 = sampleRegions[0];
    const cam = calculateCameraForRegion(r1, stageDims, customUserCamera, 1000);

    // When user had 1.20x zoom, it pushes into readable focus (>= 1.40x)
    expect(cam.zoom).toBeGreaterThanOrEqual(1.40);
    expect(cam.zoom).toBeLessThanOrEqual(2.50);
  });

  it('returns empty array when 0 interest points exist (causing ZERO keyframes and zero camera movement)', () => {
    const clips = generateClipsFromInterestRegions([], 5.0, stageDims);
    expect(clips).toEqual([]);
  });

  it('generates K+1 sets in a single block for K interest points (3 points -> 4 sets)', () => {
    const totalDuration = 3.0;
    const clips = generateClipsFromInterestRegions(sampleRegions, totalDuration, stageDims);

    // For 3 interest points -> 4 sets (P01 overview, P02 point 1, P03 point 2, P04 point 3)
    expect(clips.length).toBe(4);

    expect(clips[0].name).toBe('P01');
    expect(clips[0].startTime).toBe(0);
    expect(clips[0].duration).toBe(1.0);

    expect(clips[1].name).toBe('P02');
    expect(clips[1].startTime).toBe(1.0);
    expect(clips[1].duration).toBe(1.0);

    expect(clips[2].name).toBe('P03');
    expect(clips[2].startTime).toBe(2.0);
    expect(clips[2].duration).toBe(1.0);

    expect(clips[3].name).toBe('P04');
    expect(clips[3].startTime).toBe(3.0);
    expect(clips[3].duration).toBe(0);
  });

  it('assigns exactly 1 second per interest point when synchronized on Compose (4 points -> 4 seconds)', () => {
    const fourRegions: InterestRegion[] = [
      ...sampleRegions,
      { id: 'reg-4', index: 4, x: 400, y: 200, width: 150, height: 100 },
    ];
    const syncDuration = fourRegions.length * 1.0; // 4.0s
    const clips = generateClipsFromInterestRegions(fourRegions, syncDuration, stageDims);

    expect(syncDuration).toBe(4.0);
    expect(clips.length).toBe(5);
    expect(clips[0].startTime).toBe(0);
    expect(clips[4].startTime).toBe(4.0);
  });
});
