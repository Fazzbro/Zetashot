export interface MediaTimelineClip {
  id: string;
  mediaId: string;
  name: string;
  type: 'video' | 'image' | 'demo';
  url: string;
  startTime: number; // in seconds on master timeline
  duration: number; // in seconds
  sourceStartTime?: number; // trim in offset in seconds
  poster?: string;
  thumbnails?: string[];
  volume?: number; // 0.0 to 1.0
  isMuted?: boolean;
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
