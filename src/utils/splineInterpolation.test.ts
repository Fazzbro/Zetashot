import { describe, it, expect } from 'vitest';
import { interpolateCameraSpline, getKeyframeSpans } from './splineInterpolation';
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

  it('correctly builds keyframe span for default 2-keyframe pair block', () => {
    const spans = getKeyframeSpans(pairClips);
    expect(spans.length).toBe(1);
    expect(spans[0].startTime).toBe(0);
    expect(spans[0].endTime).toBe(3.0);
    expect(spans[0].startCamera.rotX).toBe(0);
    expect(spans[0].endCamera.rotX).toBe(20);
  });

  it('correctly builds connected keyframe spans for multi-point sequence', () => {
    const spans = getKeyframeSpans(multiClips);
    expect(spans.length).toBe(3);
    expect(spans[0].startTime).toBe(0);
    expect(spans[0].endTime).toBe(1.5);
    expect(spans[1].startTime).toBe(1.5);
    expect(spans[1].endTime).toBe(3.0);
    expect(spans[2].startTime).toBe(3.0);
    expect(spans[2].endTime).toBe(4.5);
  });

  it('evaluates cleanly at exact keyframe boundaries for 2-keyframe pair', () => {
    const at0 = interpolateCameraSpline(pairClips, 0);
    expect(at0.rotX).toBeCloseTo(0);
    expect(at0.rotY).toBeCloseTo(0);

    const atEnd = interpolateCameraSpline(pairClips, 3.0);
    expect(atEnd.rotX).toBeCloseTo(20);
    expect(atEnd.rotY).toBeCloseTo(30);
  });

  it('evaluates cleanly across multi-keyframe sequence waypoints', () => {
    const at0 = interpolateCameraSpline(multiClips, 0);
    expect(at0.rotX).toBeCloseTo(0);

    const atP2 = interpolateCameraSpline(multiClips, 1.5);
    expect(atP2.rotX).toBeCloseTo(20);
    expect(atP2.rotY).toBeCloseTo(30);

    const atP3 = interpolateCameraSpline(multiClips, 3.0);
    expect(atP3.rotX).toBeCloseTo(10);
    expect(atP3.rotY).toBeCloseTo(15);

    const atP4 = interpolateCameraSpline(multiClips, 4.5);
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
});
