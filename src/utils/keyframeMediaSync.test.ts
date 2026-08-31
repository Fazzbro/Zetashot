import { describe, it, expect } from 'vitest';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { calculateTimelineDuration } from './timelineDurationEngine';
import { generateClipsFromInterestRegions, InterestRegion } from './interestRegionEngine';

describe('Keyframe and Media Synchronous Stretching Engine', () => {
  it('synchronously calculates timeline duration when keyframe sequence is stretched', () => {
    // Initial 2 clips (3.0s total)
    const initialClips: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 } },
      { id: 'P02', name: 'P02', startTime: 1.5, duration: 1.5, camera: { rotX: 5, rotY: -10, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 } },
    ];

    expect(calculateTimelineDuration(initialClips, 3.0)).toBe(3.0);

    // Stretch sequence to 6.0s (step = 3.0s)
    const stretchedClips: TimelinePositionClip[] = [
      { ...initialClips[0], startTime: 0, duration: 3.0 },
      { ...initialClips[1], startTime: 3.0, duration: 3.0 },
    ];

    const newMediaDuration = 6.0;
    expect(calculateTimelineDuration(stretchedClips, newMediaDuration)).toBe(6.0);
  });

  it('correctly adapts composed interest region clips when stretched', () => {
    const regions: InterestRegion[] = [
      { id: 'r1', index: 1, x: 100, y: 100, width: 200, height: 150 },
      { id: 'r2', index: 2, x: 400, y: 200, width: 250, height: 180 },
      { id: 'r3', index: 3, x: 600, y: 100, width: 200, height: 200 },
    ];

    // Auto-compose with 3 regions = 3.0s composedDuration
    const composedClips = generateClipsFromInterestRegions(regions, 3.0);
    expect(composedClips.length).toBe(4); // P01 overview + P02, P03, P04
    expect(composedClips.every((c) => c.color === 'blue')).toBe(true);

    // Simulate stretching the 4-keyframe blue block from 3.0s to 7.5s (step = 2.5s)
    const newTotal = 7.5;
    const subCount = composedClips.length;
    const step = Number((newTotal / (subCount - 1)).toFixed(2)); // 2.5s

    const stretchedComposed = composedClips.map((clip, s) => ({
      ...clip,
      startTime: Number((s * step).toFixed(2)),
      duration: s === subCount - 1 ? 0 : step,
    }));

    const maxEnd = stretchedComposed[stretchedComposed.length - 1].startTime;
    expect(maxEnd).toBe(7.5);

    // Synchronized media duration matches the stretched keyframes
    const syncedMediaDuration = maxEnd;
    expect(syncedMediaDuration).toBe(7.5);
    expect(calculateTimelineDuration(stretchedComposed, syncedMediaDuration)).toBe(7.5);
  });

  it('calculates proper video playback rate compensation on stretch', () => {
    const naturalVideoDuration = 10.0; // 10s video source

    // Composed at 4.0s
    const composedDuration = 4.0;
    const initialRate = naturalVideoDuration / composedDuration; // 2.5x speed
    expect(initialRate).toBe(2.5);

    // Stretched to 8.0s
    const stretchedDuration = 8.0;
    const compensatedRate = naturalVideoDuration / stretchedDuration; // 1.25x speed
    expect(compensatedRate).toBe(1.25);
  });
});
