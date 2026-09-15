import { describe, it, expect } from 'vitest';
import {
  MediaTimelineClip,
  getActiveMediaClipAtTime,
  calculateMediaSequenceDuration,
  sequenceClipsContiguously,
  splitMediaClipAtTime,
} from '../types/mediaTimeline';

describe('mediaTimeline utilities', () => {
  const sampleClips: MediaTimelineClip[] = [
    {
      id: 'clip_1',
      mediaId: 'm1',
      name: 'Clip 1',
      type: 'image',
      url: '/test1.png',
      startTime: 0,
      duration: 3.0,
    },
    {
      id: 'clip_2',
      mediaId: 'm2',
      name: 'Clip 2',
      type: 'video',
      url: '/test2.mp4',
      startTime: 3.0,
      duration: 4.5,
    },
    {
      id: 'clip_3',
      mediaId: 'm3',
      name: 'Clip 3',
      type: 'image',
      url: '/test3.png',
      startTime: 7.5,
      duration: 2.5,
    },
  ];

  it('correctly resolves active clip at start, middle, and edge timestamps', () => {
    expect(getActiveMediaClipAtTime(sampleClips, 0)?.id).toBe('clip_1');
    expect(getActiveMediaClipAtTime(sampleClips, 1.5)?.id).toBe('clip_1');
    expect(getActiveMediaClipAtTime(sampleClips, 2.99)?.id).toBe('clip_1');
    expect(getActiveMediaClipAtTime(sampleClips, 3.0)?.id).toBe('clip_2');
    expect(getActiveMediaClipAtTime(sampleClips, 5.2)?.id).toBe('clip_2');
    expect(getActiveMediaClipAtTime(sampleClips, 7.49)?.id).toBe('clip_2');
    expect(getActiveMediaClipAtTime(sampleClips, 7.5)?.id).toBe('clip_3');
    expect(getActiveMediaClipAtTime(sampleClips, 9.9)?.id).toBe('clip_3');
  });

  it('handles out of bounds timestamps gracefully', () => {
    expect(getActiveMediaClipAtTime([], 2.0)).toBeNull();
    // Beyond end returns last clip
    expect(getActiveMediaClipAtTime(sampleClips, 15.0)?.id).toBe('clip_3');
    // Negative time defaults to first clip
    expect(getActiveMediaClipAtTime(sampleClips, -1.0)?.id).toBe('clip_1');
  });

  it('calculates total media sequence duration accurately', () => {
    expect(calculateMediaSequenceDuration(sampleClips)).toBe(10.0);
    expect(calculateMediaSequenceDuration([])).toBe(0);
  });

  it('sequences clips contiguously end-to-end', () => {
    const rawClips: MediaTimelineClip[] = [
      { id: 'c1', mediaId: 'm1', name: 'C1', type: 'image', url: '', startTime: 5, duration: 2 },
      { id: 'c2', mediaId: 'm2', name: 'C2', type: 'image', url: '', startTime: 10, duration: 4 },
      { id: 'c3', mediaId: 'm3', name: 'C3', type: 'image', url: '', startTime: 0, duration: 3 },
    ];
    const sequenced = sequenceClipsContiguously(rawClips);
    expect(sequenced[0].startTime).toBe(0);
    expect(sequenced[0].duration).toBe(2);
    expect(sequenced[1].startTime).toBe(2);
    expect(sequenced[1].duration).toBe(4);
    expect(sequenced[2].startTime).toBe(6);
    expect(sequenced[2].duration).toBe(3);
  });

  it('splits a media clip cleanly at a designated playhead time', () => {
    const { updatedClips, splitClipId } = splitMediaClipAtTime(sampleClips, 5.0);
    expect(splitClipId).not.toBeNull();
    expect(updatedClips.length).toBe(4);

    // clip_1 unaffected
    expect(updatedClips[0].id).toBe('clip_1');
    expect(updatedClips[0].duration).toBe(3.0);

    // clip_2 split into 2 parts: 3.0 to 5.0 (2.0s) and 5.0 to 7.5 (2.5s)
    expect(updatedClips[1].id).toBe('clip_2');
    expect(updatedClips[1].startTime).toBe(3.0);
    expect(updatedClips[1].duration).toBe(2.0);

    // Second part
    expect(updatedClips[2].id).toBe(splitClipId);
    expect(updatedClips[2].startTime).toBe(5.0);
    expect(updatedClips[2].duration).toBe(2.5);
    expect(updatedClips[2].sourceStartTime).toBe(2.0);

    // clip_3 preserved at 7.5s
    expect(updatedClips[3].id).toBe('clip_3');
    expect(updatedClips[3].startTime).toBe(7.5);
    expect(updatedClips[3].duration).toBe(2.5);
  });

  it('ignores split requests too close to clip edges', () => {
    // 3.05s is too close to clip_2 start (3.0s, delta 0.05 < 0.15s)
    const resNearStart = splitMediaClipAtTime(sampleClips, 3.05);
    expect(resNearStart.splitClipId).toBeNull();
    expect(resNearStart.updatedClips.length).toBe(3);

    // 100s is outside all clips
    const resOutOfRange = splitMediaClipAtTime(sampleClips, 100);
    expect(resOutOfRange.splitClipId).toBeNull();
  });
});
