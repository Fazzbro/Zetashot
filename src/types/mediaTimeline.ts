export type TransitionType = 'cut' | 'gradient' | 'blocks' | 'fade' | 'push' | 'zoom';
export type TransitionScope = 'clip' | 'canvas';

export interface MediaTimelineClip {
  id: string;
  mediaId: string;
  name: string;
  type: 'video' | 'image' | 'demo';
  url: string;
  startTime: number; // in seconds on master timeline
  duration: number; // in seconds
  sourceStartTime?: number; // trim in offset in seconds
  speed?: number; // playback rate multiplier (default: 1.0)
  sourceDuration?: number; // original natural duration of video in seconds
  poster?: string;
  thumbnails?: string[];
  volume?: number; // 0.0 to 1.0
  isMuted?: boolean;
  transition?: TransitionType;
  transitionDuration?: number;
  transitionScope?: TransitionScope;
}

/**
 * Finds the active media clip at a given timestamp on the timeline.
 */
export function getActiveMediaClipAtTime(
  clips: MediaTimelineClip[],
  time: number
): MediaTimelineClip | null {
  if (!clips || clips.length === 0) return null;
  const match = clips.find(
    (c) => time >= c.startTime && time < c.startTime + c.duration
  );
  if (match) return match;
  // If time is at or beyond the end of the last clip, return the last clip
  if (time >= clips[clips.length - 1].startTime + clips[clips.length - 1].duration) {
    return clips[clips.length - 1];
  }
  // Otherwise default to the first clip
  return clips[0];
}

/**
 * Calculates the total media sequence duration from all clips.
 */
export function calculateMediaSequenceDuration(clips: MediaTimelineClip[]): number {
  if (!clips || clips.length === 0) return 0;
  return clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
}

/**
 * Re-sequences clips end-to-end to maintain a contiguous timeline strip.
 */
export function sequenceClipsContiguously(clips: MediaTimelineClip[]): MediaTimelineClip[] {
  let runningTime = 0;
  return clips.map((c) => {
    const updated = {
      ...c,
      startTime: Number(runningTime.toFixed(2)),
    };
    runningTime += c.duration;
    return updated;
  });
}

/**
 * Splits a media clip at the specified timestamp into two contiguous segments.
 * Minimum segment duration threshold is 0.15s.
 */
export function splitMediaClipAtTime(
  clips: MediaTimelineClip[],
  cutTime: number
): { updatedClips: MediaTimelineClip[]; splitClipId: string | null } {
  if (!clips || clips.length === 0) {
    return { updatedClips: clips, splitClipId: null };
  }

  const minDuration = 0.15;
  const clipIndex = clips.findIndex(
    (c) => cutTime >= c.startTime + minDuration && cutTime <= c.startTime + c.duration - minDuration
  );

  if (clipIndex === -1) {
    return { updatedClips: clips, splitClipId: null };
  }

  const target = clips[clipIndex];
  const firstDuration = Number((cutTime - target.startTime).toFixed(2));
  const secondDuration = Number((target.duration - firstDuration).toFixed(2));

  if (firstDuration < minDuration || secondDuration < minDuration) {
    return { updatedClips: clips, splitClipId: null };
  }

  const speed = target.speed || 1.0;
  const sourceOffset = target.sourceStartTime || 0;
  const secondSourceStartTime = Number((sourceOffset + firstDuration * speed).toFixed(2));

  const firstClip: MediaTimelineClip = {
    ...target,
    duration: firstDuration,
  };

  const newClipId = `${target.mediaId || 'clip'}_part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const secondClip: MediaTimelineClip = {
    ...target,
    id: newClipId,
    name: target.name.includes('(Cut') ? target.name : `${target.name} (Cut)`,
    startTime: Number(cutTime.toFixed(2)),
    duration: secondDuration,
    sourceStartTime: secondSourceStartTime,
    transition: 'cut',
  };

  const updated = [
    ...clips.slice(0, clipIndex),
    firstClip,
    secondClip,
    ...clips.slice(clipIndex + 1),
  ];

  return {
    updatedClips: sequenceClipsContiguously(updated),
    splitClipId: newClipId,
  };
}
