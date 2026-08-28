import { describe, it, expect } from 'vitest';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { getCameraAtTime } from './videoExportEngine';
import {
  calculateTimelineDuration,
  validateExportParameters,
  validateExportedBlob,
} from '../utils/timelineDurationEngine';

describe('videoExportEngine & Timeline Sync Hardcore Reliability', () => {
  const sampleClips: TimelinePositionClip[] = [
    {
      id: 'p01',
      name: 'P01',
      startTime: 0,
      duration: 2.0,
      camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p02',
      name: 'P02',
      startTime: 2.0,
      duration: 2.0,
      camera: { rotX: 20, rotY: 40, rotZ: 10, zoom: 1.5, panX: 0, panY: 0, perspective: 1000 },
    },
  ];

  it('correctly calculates camera state at startTime of first clip', () => {
    const cam = getCameraAtTime(sampleClips, 0);
    expect(cam.rotX).toBeCloseTo(0);
    expect(cam.rotY).toBeCloseTo(0);
  });

  it('interpolates camera state smoothly halfway through transition', () => {
    const cam = getCameraAtTime(sampleClips, 2.0);
    expect(cam.rotX).toBeGreaterThan(0);
    expect(cam.rotY).toBeGreaterThan(0);
    expect(cam.zoom).toBeGreaterThan(1.0);
  });

  it('returns last keyframe camera state when time exceeds total duration', () => {
    const cam = getCameraAtTime(sampleClips, 10.0);
    expect(cam.rotX).toBeCloseTo(20);
    expect(cam.rotY).toBeCloseTo(40);
  });

  it('strictly calculates exact timeline duration from project clips without hardcoding 12s', () => {
    // 5s project -> exactly 5.0s
    const clips5s: TimelinePositionClip[] = [
      { id: 'c1', name: 'P01', startTime: 0, duration: 2.5, camera: sampleClips[0].camera },
      { id: 'c2', name: 'P02', startTime: 2.5, duration: 2.5, camera: sampleClips[1].camera },
    ];
    expect(calculateTimelineDuration(clips5s)).toBe(5.0);

    // 10s project -> exactly 10.0s
    const clips10s: TimelinePositionClip[] = [
      { id: 'c1', name: 'P01', startTime: 0, duration: 5.0, camera: sampleClips[0].camera },
      { id: 'c2', name: 'P02', startTime: 5.0, duration: 5.0, camera: sampleClips[1].camera },
    ];
    expect(calculateTimelineDuration(clips10s)).toBe(10.0);

    // 17.5s project -> exactly 17.5s
    const clips175s: TimelinePositionClip[] = [
      { id: 'c1', name: 'P01', startTime: 0, duration: 10.0, camera: sampleClips[0].camera },
      { id: 'c2', name: 'P02', startTime: 10.0, duration: 7.5, camera: sampleClips[1].camera },
    ];
    expect(calculateTimelineDuration(clips175s)).toBe(17.5);

    // 30s project -> exactly 30.0s
    const clips30s: TimelinePositionClip[] = [
      { id: 'c1', name: 'P01', startTime: 0, duration: 15.0, camera: sampleClips[0].camera },
      { id: 'c2', name: 'P02', startTime: 15.0, duration: 15.0, camera: sampleClips[1].camera },
    ];
    expect(calculateTimelineDuration(clips30s)).toBe(30.0);
  });

  it('validates export parameters before rendering and throws descriptive errors on invalid state', () => {
    // Valid state
    expect(() =>
      validateExportParameters({
        duration: 10.0,
        fps: 30,
        width: 1920,
        height: 1080,
        clips: sampleClips,
      })
    ).not.toThrow();

    // Invalid duration (0s or negative)
    expect(() =>
      validateExportParameters({
        duration: 0,
        fps: 30,
        width: 1920,
        height: 1080,
        clips: sampleClips,
      })
    ).toThrow(/Invalid export duration/);

    // Empty clips
    expect(() =>
      validateExportParameters({
        duration: 5.0,
        fps: 30,
        width: 1920,
        height: 1080,
        clips: [],
      })
    ).toThrow(/zero timeline clips/);
  });

  it('validates post-export blob integrity and rejects 0-byte corrupt outputs', async () => {
    const emptyBlob = new Blob([], { type: 'video/mp4' });
    await expect(validateExportedBlob(emptyBlob, 'mp4', 5.0)).rejects.toThrow(/empty 0-byte/);

    // Valid mock buffer with MP4 header (size > 1024 bytes and ftyp at bytes 4..7)
    const validBuffer = new Uint8Array(2048);
    // write 'ftyp' at indices 4, 5, 6, 7
    validBuffer[4] = 0x66; // 'f'
    validBuffer[5] = 0x74; // 't'
    validBuffer[6] = 0x79; // 'y'
    validBuffer[7] = 0x70; // 'p'
    const validBlob = new Blob([validBuffer], { type: 'video/mp4' });
    await expect(validateExportedBlob(validBlob, 'mp4', 5.0)).resolves.not.toThrow();
  });
});
