import { describe, it, expect } from 'vitest';
import {
  interpolateCameraSpline,
  getKeyframeSpans,
  getKeyframeTimesForGroup,
  getKeyframeTargetTime,
  getActiveClipAtTime,
} from './splineInterpolation';
import { TimelinePositionClip } from '../components/VideoTimeline';

describe('splineInterpolation utilities', () => {
  const pairClips: TimelinePositionClip[] = [
    {
      id: 'p01',
      name: 'P01',
      startTime: 0,
      duration: 1.5,
      camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p02',
      name: 'P02',
      startTime: 1.5,
      duration: 1.5,
      camera: { rotX: 20, rotY: 30, rotZ: 5, zoom: 1.2, panX: 0, panY: 0, perspective: 1000 },
    },
  ];

  const multiClips: TimelinePositionClip[] = [
    {
      id: 'p01',
      name: 'P01',
      startTime: 0,
      duration: 1.5,
      camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p02',
      name: 'P02',
      startTime: 1.5,
      duration: 1.5,
      camera: { rotX: 20, rotY: 30, rotZ: 5, zoom: 1.2, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p03',
      name: 'P03',
      startTime: 3.0,
      duration: 1.5,
      camera: { rotX: 10, rotY: 15, rotZ: 0, zoom: 1.1, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p04',
      name: 'P04',
      startTime: 4.5,
      duration: 1.5,
      camera: { rotX: -10, rotY: -20, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 },
    },
  ];

  const fiveClips: TimelinePositionClip[] = [
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
      duration: 1.0,
      camera: { rotX: 10, rotY: 10, rotZ: 0, zoom: 1.1, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p03',
      name: 'P03',
      startTime: 2.0,
      duration: 1.0,
      camera: { rotX: 20, rotY: -10, rotZ: 0, zoom: 1.2, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p04',
      name: 'P04',
      startTime: 3.0,
      duration: 1.0,
      camera: { rotX: 5, rotY: 25, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 },
    },
    {
      id: 'p05',
      name: 'P05',
      startTime: 4.0,
      duration: 1.0,
      camera: { rotX: -15, rotY: -30, rotZ: 0, zoom: 1.3, panX: 0, panY: 0, perspective: 1000 },
    },
  ];

  it('correctly builds keyframe span for default 2-keyframe pair block', () => {
    const spans = getKeyframeSpans(pairClips);
    expect(spans.length).toBe(1);
    expect(spans[0].startTime).toBe(0);
    expect(spans[0].endTime).toBe(3.0);
    expect(spans[0].startCamera.rotX).toBe(0);
    expect(spans[0].endCamera.rotX).toBe(20);
  });

  it('correctly builds connected keyframe spans for multi-point sequence covering the full duration', () => {
    const spans = getKeyframeSpans(multiClips);
    expect(spans.length).toBe(3);
    expect(spans[0].startTime).toBe(0);
    expect(spans[0].endTime).toBe(2.0);
    expect(spans[1].startTime).toBe(2.0);
    expect(spans[1].endTime).toBe(4.0);
    expect(spans[2].startTime).toBe(4.0);
    expect(spans[2].endTime).toBe(6.0); // Spans reach very last frame at 6.0s!
  });

  it('correctly completes motion on very last frame for 5 keyframes without static pause', () => {
    const times = getKeyframeTimesForGroup(fiveClips);
    expect(times).toEqual([0, 1.25, 2.5, 3.75, 5.0]);

    const spans = getKeyframeSpans(fiveClips);
    expect(spans.length).toBe(4);
    expect(spans[0].startTime).toBe(0);
    expect(spans[0].endTime).toBe(1.25);
    expect(spans[3].startTime).toBe(3.75);
    expect(spans[3].endTime).toBe(5.0); // Motion completes exactly at 5.0s (very last frame)

    // Camera at very last frame matches P05 exactly
    const atLastFrame = interpolateCameraSpline(fiveClips, 5.0);
    expect(atLastFrame.rotX).toBeCloseTo(-15);
    expect(atLastFrame.rotY).toBeCloseTo(-30);
    expect(atLastFrame.zoom).toBeCloseTo(1.3);

    // Active continuous movement during the last keyframe segment (3.75s to 5.0s)
    const midLast = interpolateCameraSpline(fiveClips, 4.375);
    expect(midLast.rotX).not.toBeCloseTo(-15);
    expect(midLast.rotX).not.toBeCloseTo(5);

    // Selecting P05 targets the very last frame (5.0s)
    expect(getKeyframeTargetTime(fiveClips, 'p05')).toBe(5.0);
    expect(getKeyframeTargetTime(fiveClips, 'p01')).toBe(0.0);
    expect(getKeyframeTargetTime(fiveClips, 'p03')).toBe(2.5);

    // Active clip resolution
    expect(getActiveClipAtTime(fiveClips, 5.0)?.id).toBe('p05');
    expect(getActiveClipAtTime(fiveClips, 0.0)?.id).toBe('p01');
  });

  it('evaluates cleanly at exact keyframe boundaries for 2-keyframe pair', () => {
    const at0 = interpolateCameraSpline(pairClips, 0);
    expect(at0.rotX).toBeCloseTo(0);
    expect(at0.rotY).toBeCloseTo(0);

    const atEnd = interpolateCameraSpline(pairClips, 3.0);
    expect(atEnd.rotX).toBeCloseTo(20);
    expect(atEnd.rotY).toBeCloseTo(30);
  });

  it('evaluates cleanly across multi-keyframe sequence waypoints up to final frame', () => {
    const at0 = interpolateCameraSpline(multiClips, 0);
    expect(at0.rotX).toBeCloseTo(0);

    const atP2 = interpolateCameraSpline(multiClips, 2.0);
    expect(atP2.rotX).toBeCloseTo(20);
    expect(atP2.rotY).toBeCloseTo(30);

    const atP3 = interpolateCameraSpline(multiClips, 4.0);
    expect(atP3.rotX).toBeCloseTo(10);
    expect(atP3.rotY).toBeCloseTo(15);

    const atP4 = interpolateCameraSpline(multiClips, 6.0);
    expect(atP4.rotX).toBeCloseTo(-10);
    expect(atP4.rotY).toBeCloseTo(-20);
  });

  it('produces continuous and smooth derivative without abrupt jumps', () => {
    const samples = 20;
    const dt = 3.0 / samples;
    let prevCam = interpolateCameraSpline(pairClips, 0);

    for (let i = 1; i <= samples; i++) {
      const t = i * dt;
      const currCam = interpolateCameraSpline(pairClips, t);
      const deltaX = Math.abs(currCam.rotX - prevCam.rotX);
      const deltaY = Math.abs(currCam.rotY - prevCam.rotY);

      expect(deltaX).toBeLessThan(10);
      expect(deltaY).toBeLessThan(15);
      prevCam = currCam;
    }
  });

  it('correctly interpolates custom perspective values across keyframes', () => {
    const customPerspClips: TimelinePositionClip[] = [
      {
        id: 'p01',
        name: 'P01',
        startTime: 0,
        duration: 1.5,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 500 },
      },
      {
        id: 'p02',
        name: 'P02',
        startTime: 1.5,
        duration: 1.5,
        camera: { rotX: 20, rotY: 30, rotZ: 5, zoom: 1.2, panX: 0, panY: 0, perspective: 1500 },
      },
    ];

    const at0 = interpolateCameraSpline(customPerspClips, 0);
    expect(at0.perspective).toBe(500);

    const atMid = interpolateCameraSpline(customPerspClips, 1.5);
    expect(atMid.perspective).toBeGreaterThanOrEqual(950);
    expect(atMid.perspective).toBeLessThanOrEqual(1050);

    const atEnd = interpolateCameraSpline(customPerspClips, 3.0);
    expect(atEnd.perspective).toBe(1500);
  });
});
