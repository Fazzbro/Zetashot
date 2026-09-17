import { describe, it, expect } from 'vitest';
import { applyClipTransitions, resizeSequenceDuration } from './transitionMath';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { MediaTimelineClip } from '../types/mediaTimeline';

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

  it('applies gradient start and exit transitions with radiant intensity', () => {
    const clip: TimelinePositionClip = {
      id: 'p01',
      name: 'P01',
      startTime: 0,
      duration: 2.0,
      camera: baseCamera,
      transition: 'gradient',
      exitTransition: 'gradient',
    };

    // At clip start, radiant intensity is at max (1.0)
    const resStart = applyClipTransitions(baseCamera, clip, 0, 0.4);
    expect(resStart.gradientIntensity).toBe(1.0);

    // After transition window, intensity is 0
    const resMid = applyClipTransitions(baseCamera, clip, 0.5, 0.4);
    expect(resMid.gradientIntensity).toBe(0);

    // Near clip end, exit gradient intensity ramps up
    const resExit = applyClipTransitions(baseCamera, clip, 1.9, 0.4);
    expect(resExit.gradientIntensity).toBeGreaterThan(0);
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

  it('calculates getMediaTransitionAtTime with peak intensity at the cut point', async () => {
    const { getMediaTransitionAtTime } = await import('./transitionMath');
    const mediaClips: MediaTimelineClip[] = [
      {
        id: 'clip-1',
        mediaId: 'm1',
        name: 'Clip 1',
        type: 'video' as const,
        url: 'blob:clip1',
        startTime: 0,
        duration: 3.0,
      },
      {
        id: 'clip-2',
        mediaId: 'm2',
        name: 'Clip 2',
        type: 'video' as const,
        url: 'blob:clip2',
        startTime: 3.0,
        duration: 3.0,
        transition: 'gradient' as const,
        transitionDuration: 0.6,
      },
    ];

    // 1. Before transition window (e.g. 2.0s) -> inactive
    const before = getMediaTransitionAtTime(mediaClips, 2.0);
    expect(before.active).toBe(false);
    expect(before.intensity).toBe(0);

    // 2. Start of transition window (2.7s) -> active, intensity starts near 0
    const start = getMediaTransitionAtTime(mediaClips, 2.7);
    expect(start.active).toBe(true);
    expect(start.type).toBe('gradient');
    expect(start.progress).toBeCloseTo(0, 1);
    expect(start.intensity).toBeCloseTo(0, 1);

    // 3. Exact cut point (3.0s) -> peak intensity 1.0!
    const peak = getMediaTransitionAtTime(mediaClips, 3.0);
    expect(peak.active).toBe(true);
    expect(peak.type).toBe('gradient');
    expect(peak.progress).toBeCloseTo(0.5, 2);
    expect(peak.intensity).toBeCloseTo(1.0, 2);
    expect(peak.fromClipId).toBe('clip-1');
    expect(peak.toClipId).toBe('clip-2');

    // 4. End of transition window (3.3s) -> active, intensity drops back near 0
    const end = getMediaTransitionAtTime(mediaClips, 3.3);
    expect(end.active).toBe(true);
    expect(end.progress).toBeCloseTo(1.0, 1);
    expect(end.intensity).toBeCloseTo(0, 1);

    // 5. After transition window (3.5s) -> inactive
    const after = getMediaTransitionAtTime(mediaClips, 3.5);
    expect(after.active).toBe(false);
    expect(after.intensity).toBe(0);

    // 6. Scope defaults to 'canvas'
    expect(peak.scope).toBe('canvas');

    // 7. Explicit 'clip' scope is honored
    mediaClips[1].transitionScope = 'clip';
    const clipPeak = getMediaTransitionAtTime(mediaClips, 3.0);
    expect(clipPeak.scope).toBe('clip');
  });

  it('draws block-by-block mosaic grid onto canvas and adapts to portrait/landscape', async () => {
    const { getBlockTransitionGrid, drawBlockTransitionCanvas } = await import('./transitionMath');

    // Landscape grid 10x6
    const landscapeGrid = getBlockTransitionGrid(10, 6);
    expect(landscapeGrid.length).toBe(60);

    // Portrait grid 6x10
    const portraitGrid = getBlockTransitionGrid(6, 10);
    expect(portraitGrid.length).toBe(60);

    // Canvas rendering execution
    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    // Call draw at progress 0.5 (full coverage)
    expect(() => {
      drawBlockTransitionCanvas(mockCtx, 1920, 1080, 0.5);
      drawBlockTransitionCanvas(mockCtx, 1080, 1920, 0.5);
    }).not.toThrow();
  });
});
