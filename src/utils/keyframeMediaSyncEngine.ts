import { TimelinePositionClip } from '../components/VideoTimeline';
import { MediaTimelineClip, sequenceClipsContiguously } from '../types/mediaTimeline';

/**
 * Calculates the compensated video playback speed multiplier based on natural duration and composed/target duration.
 * Clamped between 0.1x and 8.0x.
 */
export function calculatePlaybackRate(naturalDuration: number, targetDuration: number): number {
  if (!naturalDuration || naturalDuration <= 0 || !targetDuration || targetDuration <= 0) {
    return 1.0;
  }
  const raw = naturalDuration / targetDuration;
  return Math.max(0.1, Math.min(8.0, Number(raw.toFixed(2))));
}

/**
 * Synchronously scales media clips to match a target keyframe duration.
 * Updates clip durations proportionally and assigns compensated playback speed.
 */
export function syncMediaClipsToKeyframeDuration(
  mediaClips: MediaTimelineClip[],
  targetDuration: number,
  naturalVideoDuration?: number
): MediaTimelineClip[] {
  if (!mediaClips || mediaClips.length === 0 || targetDuration <= 0) {
    return mediaClips;
  }

  const clampedTarget = Math.max(0.4, Number(targetDuration.toFixed(2)));

  if (mediaClips.length === 1) {
    const single = mediaClips[0];
    const naturalDur = naturalVideoDuration || single.sourceDuration || single.duration;
    const computedSpeed = calculatePlaybackRate(naturalDur, clampedTarget);
    return [
      {
        ...single,
        startTime: 0,
        duration: clampedTarget,
        speed: computedSpeed,
        sourceDuration: naturalDur,
      },
    ];
  }

  const origDurs = mediaClips.map((c) => Math.max(0.1, c.duration));
  const currentTotal = origDurs.reduce((a, b) => a + b, 0);

  // Strictly proportional scaling
  const rawDurs = origDurs.map((d) => (currentTotal > 0 ? (d / currentTotal) * clampedTarget : clampedTarget / mediaClips.length));
  const newDurs = rawDurs.map((d) => Math.max(0.2, Number(d.toFixed(2))));

  // Eliminate rounding drift
  const sumDurs = Number(newDurs.reduce((a, b) => a + b, 0).toFixed(2));
  const drift = Number((clampedTarget - sumDurs).toFixed(2));
  if (drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < newDurs.length; i++) {
      if (newDurs[i] > newDurs[maxIdx]) maxIdx = i;
    }
    newDurs[maxIdx] = Math.max(0.2, Number((newDurs[maxIdx] + drift).toFixed(2)));
  }

  const updated = mediaClips.map((c, i) => {
    const naturalDur = naturalVideoDuration || c.sourceDuration || c.duration;
    const computedSpeed = calculatePlaybackRate(naturalDur, newDurs[i]);
    return {
      ...c,
      duration: newDurs[i],
      speed: computedSpeed,
      sourceDuration: naturalDur,
    };
  });

  return sequenceClipsContiguously(updated);
}

/**
 * Synchronously scales a keyframe sequence block to match a target media clip duration.
 * Adjusts each sub-clip duration proportionally and shifts downstream clips accordingly.
 */
export function syncKeyframeSequenceToDuration(
  clips: TimelinePositionClip[],
  groupStartIndex: number,
  subCount: number,
  targetDuration: number
): TimelinePositionClip[] {
  if (!clips || clips.length === 0 || groupStartIndex < 0 || subCount <= 0) {
    return clips;
  }

  const clampedTarget = Math.max(subCount * 0.25, Number(targetDuration.toFixed(2)));
  const updated = clips.map((c) => ({ ...c }));
  const initialStart = updated[groupStartIndex]?.startTime ?? 0;

  if (subCount === 1) {
    const oldDur = updated[groupStartIndex].duration || 1.5;
    const delta = clampedTarget - oldDur;
    updated[groupStartIndex].duration = clampedTarget;

    // Shift downstream
    for (let k = groupStartIndex + 1; k < updated.length; k++) {
      updated[k].startTime = Math.max(0, Number((updated[k].startTime + delta).toFixed(2)));
    }
    return updated;
  }

  const subClips = updated.slice(groupStartIndex, groupStartIndex + subCount);
  const origDurs = subClips.map((c) => (typeof c.duration === 'number' ? c.duration : 1.5));
  const sumOrigDur = origDurs.reduce((a, b) => a + b, 0);

  const rawDurs = origDurs.map((d) => {
    if (d === 0) return 0;
    const ratio = sumOrigDur > 0 ? d / sumOrigDur : 1 / subCount;
    return clampedTarget * ratio;
  });

  const newDurs = rawDurs.map((d) => (d === 0 ? 0 : Math.max(0.1, Number(d.toFixed(2)))));
  const currentSum = Number(newDurs.reduce((a, b) => a + b, 0).toFixed(2));
  const drift = Number((clampedTarget - currentSum).toFixed(2));

  if (drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < newDurs.length; i++) {
      if (newDurs[i] > newDurs[maxIdx]) maxIdx = i;
    }
    newDurs[maxIdx] = Math.max(0.1, Number((newDurs[maxIdx] + drift).toFixed(2)));
  }

  const oldTotalSeqDuration = Number(sumOrigDur.toFixed(2));
  const durationDelta = Number((clampedTarget - oldTotalSeqDuration).toFixed(2));

  let accStart = initialStart;
  for (let s = 0; s < subCount; s++) {
    const clipIdx = groupStartIndex + s;
    if (!updated[clipIdx]) continue;
    updated[clipIdx].startTime = Number(accStart.toFixed(2));
    updated[clipIdx].duration = newDurs[s];
    accStart += newDurs[s];
  }

  // Shift downstream clips
  for (let k = groupStartIndex + subCount; k < updated.length; k++) {
    updated[k].startTime = Math.max(0, Number((updated[k].startTime + durationDelta).toFixed(2)));
  }

  return updated;
}
