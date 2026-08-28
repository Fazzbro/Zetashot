import { describe, it, expect } from 'vitest';
import { applyClipTransitions, resizeSequenceDuration } from './transitionMath';
import { TimelinePositionClip } from '../components/VideoTimeline';

describe('transitionMath', () => {
  const baseCamera = {
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    perspective: 1000,
  };

  it('applies fade start transition with initial 0 opacity', () => {
    const clip: TimelinePositionClip = {
      id: 'p01',
      name: 'P01',
      startTime: 0,
      duration: 1.5,
      camera: baseCamera,
      transition: 'fade',
    };

    const resStart = applyClipTransitions(baseCamera, clip, 0, 0.4);
    expect(resStart.opacity).toBe(0);

    const resMid = applyClipTransitions(baseCamera, clip, 0.2, 0.4);
    expect(resMid.opacity).toBeGreaterThan(0);
    expect(resMid.opacity).toBeLessThan(1);

    const resEnd = applyClipTransitions(baseCamera, clip, 0.5, 0.4);
    expect(resEnd.opacity).toBe(1);
  });

  it('applies push start transition with panX offset', () => {
    const clip: TimelinePositionClip = {
      id: 'p01',
      name: 'P01',
      startTime: 0,
      duration: 1.5,
      camera: baseCamera,
      transition: 'push',
    };

    const resStart = applyClipTransitions(baseCamera, clip, 0, 0.4);
    expect(resStart.camera.panX).toBeLessThan(0);

    const resEnd = applyClipTransitions(baseCamera, clip, 0.5, 0.4);
    expect(resEnd.camera.panX).toBe(0);
  });

  it('applies zoom exit transition at end of sequence', () => {
    const clip: TimelinePositionClip = {
      id: 'p02',
      name: 'P02',
      startTime: 1.5,
      duration: 1.5,
      camera: baseCamera,
      exitTransition: 'zoom',
    };

    // Clip ends at 3.0s. At 2.9s (0.1s from end), it should be zooming out
    const resExit = applyClipTransitions(baseCamera, clip, 2.9, 0.4);
    expect(resExit.camera.zoom).toBeLessThan(1.0);
  });

  it('resizes a 2-keyframe sequence proportionally from 3.0s to 5.0s', () => {
    const clips: TimelinePositionClip[] = [
      { id: 'p01', name: 'P01', startTime: 0, duration: 1.5, camera: baseCamera },
      { id: 'p02', name: 'P02', startTime: 1.5, duration: 1.5, camera: baseCamera },
    ];

    const resized = resizeSequenceDuration(clips, 0, 5.0);
    expect(resized[0].duration).toBe(2.5);
    expect(resized[1].startTime).toBe(2.5);
    expect(resized[1].duration).toBe(2.5);
  });
});
