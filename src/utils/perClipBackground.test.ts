import { describe, it, expect } from 'vitest';
import {
  MediaTimelineClip,
  splitMediaClipAtTime,
  getActiveMediaClipAtTime,
} from '../types/mediaTimeline';
import { deleteMediaClipAndSyncKeyframes } from './keyframeMediaSyncEngine';
import { BackgroundConfig } from './gradientUtils';
import { TimelinePositionClip } from '../components/VideoTimeline';

describe('Per-Clip Separate Background Engine', () => {
  const defaultGlobalBg: BackgroundConfig = {
    type: 'solid',
    color: '#ffffff',
  };

  const customBgClip1: BackgroundConfig = {
    type: 'solid',
    color: '#09090b',
  };

  const customBgClip2: BackgroundConfig = {
    type: 'image',
    imageUrl: '/backgrounds/bg-sunflowers.png',
    position: { x: 50, y: 100 },
    imageScale: 1.0,
    imageFit: 'cover',
  };

  const customBgClip3: BackgroundConfig = {
    type: 'gradient',
    gradientType: 'linear',
    angle: 135,
    stops: [
      { color: '#6366f1', position: 0 },
      { color: '#ec4899', position: 100 },
    ],
  };

  it('correctly resolves effective background per clip with fallback to global default', () => {
    const clips: MediaTimelineClip[] = [
      {
        id: 'clip_1',
        mediaId: 'm1',
        name: 'Clip 1 (Dark)',
        type: 'image',
        url: '/img1.png',
        startTime: 0,
        duration: 3.0,
        background: customBgClip1,
      },
      {
        id: 'clip_2',
        mediaId: 'm2',
        name: 'Clip 2 (Inherit Global)',
        type: 'image',
        url: '/img2.png',
        startTime: 3.0,
        duration: 3.0,
        // no background set -> should inherit global
      },
      {
        id: 'clip_3',
        mediaId: 'm3',
        name: 'Clip 3 (Sunflowers)',
        type: 'image',
        url: '/img3.png',
        startTime: 6.0,
        duration: 3.0,
        background: customBgClip2,
      },
    ];

    // At t = 1.5s -> inside clip 1
    const active1 = getActiveMediaClipAtTime(clips, 1.5);
    const bg1 = active1?.background || defaultGlobalBg;
    expect(bg1).toEqual(customBgClip1);

    // At t = 4.5s -> inside clip 2 (inherits global default)
    const active2 = getActiveMediaClipAtTime(clips, 4.5);
    const bg2 = active2?.background || defaultGlobalBg;
    expect(bg2).toEqual(defaultGlobalBg);

    // At t = 7.5s -> inside clip 3
    const active3 = getActiveMediaClipAtTime(clips, 7.5);
    const bg3 = active3?.background || defaultGlobalBg;
    expect(bg3).toEqual(customBgClip2);
  });

  it('clones separate background when splitting a media clip at timestamp', () => {
    const clips: MediaTimelineClip[] = [
      {
        id: 'clip_split',
        mediaId: 'm_split',
        name: 'Long Shot',
        type: 'video',
        url: '/video.mp4',
        startTime: 0,
        duration: 6.0,
        background: customBgClip3,
      },
    ];

    const { updatedClips, splitClipId } = splitMediaClipAtTime(clips, 2.5);
    expect(updatedClips).toHaveLength(2);
    expect(splitClipId).toBeTruthy();

    const [part1, part2] = updatedClips;
    expect(part1.duration).toBe(2.5);
    expect(part2.duration).toBe(3.5);

    // Both parts retain the cloned background configuration
    expect(part1.background).toEqual(customBgClip3);
    expect(part2.background).toEqual(customBgClip3);

    // Modifying part2's background does not mutate part1
    part2.background = customBgClip1;
    expect(part1.background).toEqual(customBgClip3);
    expect(part2.background).toEqual(customBgClip1);
  });

  it('preserves other clips separate backgrounds when a clip is deleted', () => {
    const keyframes: TimelinePositionClip[] = [
      { id: 'P01', name: 'P01', startTime: 0, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }, mediaClipId: 'c1' },
      { id: 'P02', name: 'P02', startTime: 1.5, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }, mediaClipId: 'c1' },
      { id: 'P03', name: 'P03', startTime: 3.0, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }, mediaClipId: 'c2' },
      { id: 'P04', name: 'P04', startTime: 4.5, duration: 1.5, camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }, mediaClipId: 'c3' },
    ];

    const mediaClips: MediaTimelineClip[] = [
      { id: 'c1', mediaId: 'm1', name: 'Clip 1', type: 'image', url: '/1.png', startTime: 0, duration: 3.0, background: customBgClip1 },
      { id: 'c2', mediaId: 'm2', name: 'Clip 2', type: 'image', url: '/2.png', startTime: 3.0, duration: 1.5, background: customBgClip2 },
      { id: 'c3', mediaId: 'm3', name: 'Clip 3', type: 'image', url: '/3.png', startTime: 4.5, duration: 1.5, background: customBgClip3 },
    ];

    // Delete clip 2
    const result = deleteMediaClipAndSyncKeyframes(keyframes, mediaClips, 'c2');
    expect(result.updatedMediaClips).toHaveLength(2);

    const [remaining1, remaining2] = result.updatedMediaClips;
    expect(remaining1.id).toBe('c1');
    expect(remaining1.background).toEqual(customBgClip1);

    expect(remaining2.id).toBe('c3');
    expect(remaining2.background).toEqual(customBgClip3);
  });

  it('allows resetting a clip background to inherit the project default', () => {
    let clips: MediaTimelineClip[] = [
      {
        id: 'clip_reset',
        mediaId: 'm1',
        name: 'Clip Custom',
        type: 'image',
        url: '/1.png',
        startTime: 0,
        duration: 3.0,
        background: customBgClip1,
      },
    ];

    expect(clips[0].background).toBeDefined();

    // Resetting background to null strips the background property
    clips = clips.map((c) => {
      const { background: _, ...rest } = c;
      return rest;
    });

    expect(clips[0].background).toBeUndefined();
    const effective = clips[0].background || defaultGlobalBg;
    expect(effective).toEqual(defaultGlobalBg);
  });
});
