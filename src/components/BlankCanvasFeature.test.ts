import { describe, it, expect } from 'vitest';
import { BLANK_CANVAS_ITEM, BLANK_CANVAS_DATA_URL, BUILTIN_MEDIA_ITEMS } from './MediaLibraryModal';
import {
  MediaTimelineClip,
  calculateMediaSequenceDuration,
  getActiveMediaClipAtTime,
  sequenceClipsContiguously,
} from '../types/mediaTimeline';

describe('Blank Canvas Feature Specification', () => {
  it('exports a valid BLANK_CANVAS_ITEM with type blank and SVG data URL', () => {
    expect(BLANK_CANVAS_ITEM).toBeDefined();
    expect(BLANK_CANVAS_ITEM.id).toBe('blank-canvas');
    expect(BLANK_CANVAS_ITEM.type).toBe('blank');
    expect(BLANK_CANVAS_ITEM.name).toBe('Blank Canvas');
    expect(BLANK_CANVAS_ITEM.url).toBe(BLANK_CANVAS_DATA_URL);
    expect(BLANK_CANVAS_ITEM.url.startsWith('data:image/svg+xml;')).toBe(true);
    expect(BLANK_CANVAS_ITEM.dimensions).toBe('1920 × 1080');
  });

  it('includes BLANK_CANVAS_ITEM as the first built-in media item in library', () => {
    expect(BUILTIN_MEDIA_ITEMS.length).toBeGreaterThanOrEqual(1);
    expect(BUILTIN_MEDIA_ITEMS[0].id).toBe('blank-canvas');
    expect(BUILTIN_MEDIA_ITEMS[0].type).toBe('blank');
  });

  it('allows creating a Solo Blank Canvas sequence without other clips', () => {
    const soloBlankClip: MediaTimelineClip = {
      id: 'clip_blank_solo',
      mediaId: BLANK_CANVAS_ITEM.id,
      name: BLANK_CANVAS_ITEM.name,
      type: 'blank',
      url: BLANK_CANVAS_ITEM.url,
      startTime: 0,
      duration: 4.0,
    };

    const mediaClips: MediaTimelineClip[] = [soloBlankClip];
    expect(mediaClips.length).toBe(1);
    expect(mediaClips[0].type).toBe('blank');

    const totalDuration = calculateMediaSequenceDuration(mediaClips);
    expect(totalDuration).toBe(4.0);

    const activeClipAtStart = getActiveMediaClipAtTime(mediaClips, 0.5);
    expect(activeClipAtStart?.id).toBe('clip_blank_solo');
    expect(activeClipAtStart?.type).toBe('blank');
  });

  it('allows appending a blank canvas clip to an existing multi-clip sequence', () => {
    const initialClips: MediaTimelineClip[] = [
      {
        id: 'clip_video_1',
        mediaId: 'video_1',
        name: 'Screen Record',
        type: 'video',
        url: 'https://example.com/demo.mp4',
        startTime: 0,
        duration: 3.0,
      },
      {
        id: 'clip_image_2',
        mediaId: 'image_2',
        name: 'Dashboard',
        type: 'image',
        url: 'https://example.com/dash.png',
        startTime: 3.0,
        duration: 2.5,
      },
    ];

    const currentDuration = calculateMediaSequenceDuration(initialClips);
    expect(currentDuration).toBe(5.5);

    const appendedBlankClip: MediaTimelineClip = {
      id: 'clip_blank_appended',
      mediaId: BLANK_CANVAS_ITEM.id,
      name: BLANK_CANVAS_ITEM.name,
      type: 'blank',
      url: BLANK_CANVAS_ITEM.url,
      startTime: currentDuration,
      duration: 4.0,
      transition: 'gradient',
    };

    const updatedClips = [...initialClips, appendedBlankClip];
    const totalDuration = calculateMediaSequenceDuration(updatedClips);
    expect(totalDuration).toBe(9.5);

    // Verify clips resolve correctly across timeline boundaries
    expect(getActiveMediaClipAtTime(updatedClips, 1.5)?.type).toBe('video');
    expect(getActiveMediaClipAtTime(updatedClips, 4.0)?.type).toBe('image');
    expect(getActiveMediaClipAtTime(updatedClips, 7.0)?.type).toBe('blank');
  });

  it('ensures contiguously sequenced blank clips maintain valid time offsets', () => {
    const rawClips: MediaTimelineClip[] = [
      { id: 'c1', mediaId: 'm1', name: 'Blank Intro', type: 'blank', url: BLANK_CANVAS_ITEM.url, startTime: 0, duration: 2.0 },
      { id: 'c2', mediaId: 'm2', name: 'Product Shot', type: 'image', url: '/shot.png', startTime: 99, duration: 3.0 },
      { id: 'c3', mediaId: 'm3', name: 'Blank Outro', type: 'blank', url: BLANK_CANVAS_ITEM.url, startTime: 99, duration: 2.5 },
    ];

    const contiguous = sequenceClipsContiguously(rawClips);
    expect(contiguous[0].startTime).toBe(0);
    expect(contiguous[0].duration).toBe(2.0);

    expect(contiguous[1].startTime).toBe(2.0);
    expect(contiguous[1].duration).toBe(3.0);

    expect(contiguous[2].startTime).toBe(5.0);
    expect(contiguous[2].duration).toBe(2.5);

    expect(calculateMediaSequenceDuration(contiguous)).toBe(7.5);
  });
});
