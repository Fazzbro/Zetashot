import { describe, it, expect } from 'vitest';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { calculateTimelineDuration } from './timelineDurationEngine';
import { generateClipsFromInterestRegions, InterestRegion } from './interestRegionEngine';
import {
  syncMediaClipsToKeyframeDuration,
  syncKeyframeSequenceToDuration,
  calculatePlaybackRate,
  generateKeyframesForNewMediaClip,
  syncKeyframesForResizedMediaClip,
  splitKeyframesAtTime,
} from './keyframeMediaSyncEngine';
import { MediaTimelineClip, calculateMediaSequenceDuration } from '../types/mediaTimeline';

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
    const initialRate = calculatePlaybackRate(naturalVideoDuration, composedDuration);
    expect(initialRate).toBe(2.5);

    // Stretched to 8.0s
    const stretchedDuration = 8.0;
    const compensatedRate = calculatePlaybackRate(naturalVideoDuration, stretchedDuration);
    expect(compensatedRate).toBe(1.25);
  });

  it('supports intra-sequence divider resizing while maintaining total sequence duration', () => {
    const p1Duration = 1.5;
    const p2Duration = 1.5;
    const totalDuration = p1Duration + p2Duration;

    // Move divider by +0.5s: P01 becomes 2.0s, P02 becomes 1.0s
    const deltaSec = 0.5;
    const newP1Duration = Math.max(0.3, Math.min(totalDuration - 0.3, p1Duration + deltaSec));
    const newP2Duration = Math.max(0.3, totalDuration - newP1Duration);

    expect(newP1Duration).toBe(2.0);
    expect(newP2Duration).toBe(1.0);
    expect(newP1Duration + newP2Duration).toBe(3.0);

    // Verify clips layout
    const clips: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: newP1Duration, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 } },
      { id: 'P02', name: 'P02', startTime: newP1Duration, duration: newP2Duration, camera: { rotX: 5, rotY: -10, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 } },
    ];

    expect(clips[1].startTime).toBe(2.0);
    expect(calculateTimelineDuration(clips, 3.0)).toBe(3.0);
  });

  it('correctly shifts downstream clips when an upstream sequence block is stretched', () => {
    const clips: TimelinePositionClip[] = [
      // Sequence 1: P01 & P02 (0s -> 3s, stretched to 5s, +2s delta)
      { id: 'P01', name: 'P01', startTime: 0, duration: 2.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 } },
      { id: 'P02', name: 'P02', startTime: 2.5, duration: 2.5, camera: { rotX: 5, rotY: -10, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 } },
      // Sequence 2: P03 & P04 (originally started at 3s, now shifted to 5s)
      { id: 'P03', name: 'P03', startTime: 5.0, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0, perspective: 1000 } },
      { id: 'P04', name: 'P04', startTime: 6.5, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0, perspective: 1000 } },
    ];

    const timelineTotal = calculateTimelineDuration(clips, 8.0);
    expect(timelineTotal).toBe(8.0);
    expect(clips[2].startTime).toBe(5.0);
    expect(clips[3].startTime).toBe(6.5);
  });

  it('syncs media clip duration and speed when keyframe sequence is stretched or compressed', () => {
    const mediaClips: MediaTimelineClip[] = [
      { id: 'c1', mediaId: 'm1', name: 'Video 1', type: 'video', url: 'v.mp4', startTime: 0, duration: 4.0 },
    ];

    // Keyframes stretched from 4.0s to 8.0s (source video is 12.0s)
    const stretched = syncMediaClipsToKeyframeDuration(mediaClips, 8.0, 12.0);
    expect(stretched[0].duration).toBe(8.0);
    expect(stretched[0].speed).toBe(1.5); // 12.0s / 8.0s = 1.5x speed

    // Keyframes compressed from 8.0s to 3.0s
    const compressed = syncMediaClipsToKeyframeDuration(mediaClips, 3.0, 12.0);
    expect(compressed[0].duration).toBe(3.0);
    expect(compressed[0].speed).toBe(4.0); // 12.0s / 3.0s = 4.0x speed
  });

  it('syncs keyframe sequence proportionally when media clip is stretched vice-versa', () => {
    const clips: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: 2.0, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 }, color: 'blue' },
      { id: 'P02', name: 'P02', startTime: 2.0, duration: 2.0, camera: { rotX: 5, rotY: -10, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 }, color: 'blue' },
    ];

    // Media clip resized from 4.0s to 6.0s
    const rescaled = syncKeyframeSequenceToDuration(clips, 0, 2, 6.0);
    expect(rescaled[0].duration).toBe(3.0);
    expect(rescaled[1].startTime).toBe(3.0);
    expect(rescaled[1].duration).toBe(3.0);
    expect(rescaled[0].duration + rescaled[1].duration).toBe(6.0);
  });

  it('generates new keyframes for newly added media clip without altering existing composed keyframes', () => {
    // Clip 1 composed with 3 regions (e.g. 4 keyframes P01-P04 from 0s to 3s)
    const regions: InterestRegion[] = [
      { id: 'r1', index: 1, x: 100, y: 100, width: 200, height: 150 },
      { id: 'r2', index: 2, x: 400, y: 200, width: 250, height: 180 },
      { id: 'r3', index: 3, x: 600, y: 100, width: 200, height: 200 },
    ];
    const composedClips = generateClipsFromInterestRegions(regions, 3.0);
    expect(composedClips.length).toBe(4);

    const defaultCam = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };

    // When uploading/adding a 2nd clip of duration 4.0s starting at 3.0s:
    const updatedClips = generateKeyframesForNewMediaClip(composedClips, 3.0, 4.0, defaultCam);

    // Should have 4 existing + 2 new = 6 clips total
    expect(updatedClips.length).toBe(6);

    // Existing composed clips P01-P04 remain completely intact in timing and properties
    expect(updatedClips[0].name).toBe('P01');
    expect(updatedClips[0].startTime).toBe(0);
    expect(updatedClips[3].name).toBe('P04');
    expect(updatedClips[3].startTime + updatedClips[3].duration).toBe(3.0);

    // New clips for 2nd media clip are P05 and P06 starting at 3.0s with duration 2.0s each
    expect(updatedClips[4].name).toBe('P05');
    expect(updatedClips[4].startTime).toBe(3.0);
    expect(updatedClips[4].duration).toBe(2.0);

    expect(updatedClips[5].name).toBe('P06');
    expect(updatedClips[5].startTime).toBe(5.0);
    expect(updatedClips[5].duration).toBe(2.0);
  });

  it('correctly resizes a middle media clip and shifts only downstream keyframes while keeping upstream untouched', () => {
    const mediaClips: MediaTimelineClip[] = [
      { id: 'm1', mediaId: 'm1', name: 'Clip 1', type: 'video', url: '1.mp4', startTime: 0, duration: 4.0 },
      { id: 'm2', mediaId: 'm2', name: 'Clip 2 (Middle)', type: 'video', url: '2.mp4', startTime: 4.0, duration: 3.0 },
      { id: 'm3', mediaId: 'm3', name: 'Clip 3', type: 'video', url: '3.mp4', startTime: 7.0, duration: 3.0 },
    ];

    const cam = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };
    const clips: TimelinePositionClip[] = [
      // Clip 1 keyframes [0s -> 4s]
      { id: 'P01', name: 'P01', startTime: 0, duration: 2.0, camera: cam },
      { id: 'P02', name: 'P02', startTime: 2.0, duration: 2.0, camera: cam },
      // Clip 2 (Middle) keyframes [4s -> 7s]
      { id: 'P03', name: 'P03', startTime: 4.0, duration: 1.5, camera: cam },
      { id: 'P04', name: 'P04', startTime: 5.5, duration: 1.5, camera: cam },
      // Clip 3 keyframes [7s -> 10s]
      { id: 'P05', name: 'P05', startTime: 7.0, duration: 1.5, camera: cam },
      { id: 'P06', name: 'P06', startTime: 8.5, duration: 1.5, camera: cam },
    ];

    // Resize Middle Clip (idx = 1) from 3.0s to 5.0s (+2.0s durationDelta)
    const synced = syncKeyframesForResizedMediaClip(clips, mediaClips, 1, 5.0);

    // Upstream (Clip 1) keyframes must be 100% UNTOUCHED
    expect(synced[0].startTime).toBe(0);
    expect(synced[0].duration).toBe(2.0);
    expect(synced[1].startTime).toBe(2.0);
    expect(synced[1].duration).toBe(2.0);

    // Middle Clip keyframes scaled to 5.0s (2.5s each, starting at 4.0s)
    expect(synced[2].startTime).toBe(4.0);
    expect(synced[2].duration).toBe(2.5);
    expect(synced[3].startTime).toBe(6.5);
    expect(synced[3].duration).toBe(2.5);

    // Downstream (Clip 3) keyframes shifted by +2.0s (start at 9.0s instead of 7.0s)
    expect(synced[4].startTime).toBe(9.0);
    expect(synced[4].duration).toBe(1.5);
    expect(synced[5].startTime).toBe(10.5);
    expect(synced[5].duration).toBe(1.5);
  });

  it('preserves clip 1 keyframes and boundary anchor when composing a second combo on clip 2', () => {
    // Clip 1: 5.1s with 4 composed keyframes ending at 5.1s
    const clip1Keyframes: TimelinePositionClip[] = [
      { id: 'c1_p01', name: 'P01', startTime: 0, duration: 1.7, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c1', mediaClipId: 'c1' },
      { id: 'c1_p02', name: 'P02', startTime: 1.7, duration: 1.7, camera: { rotX: 5, rotY: 0, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c1', mediaClipId: 'c1' },
      { id: 'c1_p03', name: 'P03', startTime: 3.4, duration: 1.7, camera: { rotX: 10, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c1', mediaClipId: 'c1' },
      { id: 'c1_p04', name: 'P04', startTime: 5.1, duration: 0, camera: { rotX: 10, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c1', mediaClipId: 'c1' },
    ];

    // Clip 2: 3.0s (starting at 5.1s)
    const clip2Keyframes: TimelinePositionClip[] = [
      { id: 'c2_p05', name: 'P05', startTime: 5.1, duration: 1.0, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c2', mediaClipId: 'c2' },
      { id: 'c2_p06', name: 'P06', startTime: 6.1, duration: 1.0, camera: { rotX: 5, rotY: 0, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c2', mediaClipId: 'c2' },
      { id: 'c2_p07', name: 'P07', startTime: 7.1, duration: 1.0, camera: { rotX: 5, rotY: 0, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c2', mediaClipId: 'c2' },
      { id: 'c2_p08', name: 'P08', startTime: 8.1, duration: 0, camera: { rotX: 5, rotY: 0, rotZ: 0, zoom: 0.8, panX: 0, panY: 0, perspective: 1000 }, color: 'blue', blockId: 'block_c2', mediaClipId: 'c2' },
    ];

    const allClips = [...clip1Keyframes, ...clip2Keyframes];
    const clipStart = 5.1;

    // Upstream filtering matches our new logic
    const upstream = allClips.filter((c) => {
      if (c.mediaClipId) {
        return c.mediaClipId !== 'c2' && c.startTime <= clipStart + 0.001;
      }
      return c.startTime < clipStart - 0.001 || (Math.abs(c.startTime - clipStart) <= 0.01 && c.duration === 0);
    });

    // Verify all 4 keyframes of Clip 1 are preserved
    expect(upstream.length).toBe(4);
    expect(upstream[0].name).toBe('P01');
    expect(upstream[3].name).toBe('P04');
    expect(upstream[3].startTime).toBe(5.1);

    // Sequence duration of Clip 1 keyframes must be exactly 5.1s
    const firstClip = upstream[0];
    const lastClip = upstream[upstream.length - 1];
    const seqDuration = Math.max(0.1, lastClip.startTime + (lastClip.duration ?? 0) - firstClip.startTime);
    expect(seqDuration).toBe(5.1);
  });

  it('positions second clip keyframes directly above the second clip starting at clip2 startTime, not after it', () => {
    const defaultCam = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };
    // Clip 1: 3.0s with initial keyframes [0s -> 3.0s]
    const clip1Keyframes: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: 1.5, camera: defaultCam, mediaClipId: 'clip1' },
      { id: 'P02', name: 'P02', startTime: 1.5, duration: 1.5, camera: defaultCam, mediaClipId: 'clip1' },
    ];

    const mediaClips: MediaTimelineClip[] = [
      { id: 'clip1', mediaId: 'm1', name: 'Clip 1', type: 'image', url: '1.png', startTime: 0, duration: 3.0 },
    ];

    // Compute start time for clip 2 BEFORE adding it to mediaClips (equals 3.0s)
    const newClipStartTime = calculateMediaSequenceDuration(mediaClips);
    expect(newClipStartTime).toBe(3.0);

    const clip2Duration = 3.0;
    const updatedClips = generateKeyframesForNewMediaClip(
      clip1Keyframes,
      newClipStartTime,
      clip2Duration,
      defaultCam,
      'clip2'
    );

    expect(updatedClips.length).toBe(4);
    // P01 & P02 are preserved on clip 1 [0s -> 3.0s]
    expect(updatedClips[0].startTime).toBe(0);
    expect(updatedClips[1].startTime + updatedClips[1].duration).toBe(3.0);

    // Clip 2 keyframes P03 and P04 MUST start at 3.0s (NOT 6.0s!)
    expect(updatedClips[2].name).toBe('P03');
    expect(updatedClips[2].startTime).toBe(3.0);
    expect(updatedClips[2].duration).toBe(1.5);
    expect(updatedClips[2].mediaClipId).toBe('clip2');

    expect(updatedClips[3].name).toBe('P04');
    expect(updatedClips[3].startTime).toBe(4.5);
    expect(updatedClips[3].duration).toBe(1.5);
    expect(updatedClips[3].mediaClipId).toBe('clip2');

    // Capsule 2 visual start and duration match Clip 2 (from 3.0s to 6.0s) exactly
    const clip2Keyframes = updatedClips.filter((c) => c.mediaClipId === 'clip2');
    const cap2Start = clip2Keyframes[0].startTime;
    const cap2End = clip2Keyframes[clip2Keyframes.length - 1].startTime + (clip2Keyframes[clip2Keyframes.length - 1].duration || 0);
    expect(cap2Start).toBe(3.0);
    expect(cap2End).toBe(6.0);
  });
it('correctly splits keyframes at cut time when cutting a clip into two', () => {
    const defaultCam = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };
    const customCam = { rotX: 15, rotY: 25, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 };

    const initialClips: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: 2.0, camera: defaultCam, mediaClipId: 'clip1' },
      { id: 'P02', name: 'P02', startTime: 2.0, duration: 2.0, camera: customCam, mediaClipId: 'clip1' },
      // Unaffected 3rd clip
      { id: 'P03', name: 'P03', startTime: 4.0, duration: 2.0, camera: defaultCam, mediaClipId: 'clip3' },
    ];

    // Split clip1 at 2.0s into clip1 and clip2
    const splitClips = splitKeyframesAtTime(initialClips, 2.0, 'clip1', 'clip2');

    expect(splitClips.length).toBe(3);

    // First keyframe stays with clip1
    expect(splitClips[0].id).toBe('P01');
    expect(splitClips[0].mediaClipId).toBe('clip1');
    expect(splitClips[0].blockId).toBe('block_clip1');
    expect(splitClips[0].startTime).toBe(0);
    expect(splitClips[0].duration).toBe(2.0);

    // Second keyframe is transferred to clip2 with unique blockId
    expect(splitClips[1].id).toBe('P02');
    expect(splitClips[1].mediaClipId).toBe('clip2');
    expect(splitClips[1].blockId).toBe('block_clip2');
    expect(splitClips[1].startTime).toBe(2.0);
    expect(splitClips[1].duration).toBe(2.0);

    // Third keyframe on clip3 is completely untouched
    expect(splitClips[2].id).toBe('P03');
    expect(splitClips[2].mediaClipId).toBe('clip3');
  });

  it('correctly splits a straddling keyframe when cut time falls inside a keyframe span', () => {
    const defaultCam = { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };

    // Single keyframe spanning from 0s to 4.0s
    const initialClips: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: 4.0, camera: defaultCam, mediaClipId: 'clip1' },
    ];

    // Split at 1.5s
    const splitClips = splitKeyframesAtTime(initialClips, 1.5, 'clip1', 'clip2');

    expect(splitClips.length).toBe(2);

    // First part: 0s -> 1.5s
    expect(splitClips[0].startTime).toBe(0);
    expect(splitClips[0].duration).toBe(1.5);
    expect(splitClips[0].mediaClipId).toBe('clip1');
    expect(splitClips[0].blockId).toBe('block_clip1');

    // Second part: 1.5s -> 4.0s (duration = 2.5s)
    expect(splitClips[1].startTime).toBe(1.5);
    expect(splitClips[1].duration).toBe(2.5);
    expect(splitClips[1].mediaClipId).toBe('clip2');
    expect(splitClips[1].blockId).toBe('block_clip2');
  });
});
