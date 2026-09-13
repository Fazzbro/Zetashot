import { Camera3DState } from './camera3D';
import { TimelinePositionClip } from '../components/VideoTimeline';

export interface KeyframeSpan {
  startTime: number;
  endTime: number;
  startCamera: Camera3DState;
  endCamera: Camera3DState;
  color?: string;
}

/**
 * Groups contiguous clips by sequence block (sharing blockId, or contiguous without blockId).
 */
export function groupClipsIntoSequences(clips: TimelinePositionClip[]): TimelinePositionClip[][] {
  if (!clips || clips.length === 0) return [];
  const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);
  const groups: TimelinePositionClip[][] = [];
  let i = 0;
  while (i < sorted.length) {
    const current = sorted[i];
    const group: TimelinePositionClip[] = [current];
    let j = i + 1;
    if (current.blockId) {
      while (j < sorted.length && sorted[j].blockId === current.blockId) {
        group.push(sorted[j]);
        j++;
      }
    } else {
      while (j < sorted.length && !sorted[j].blockId) {
        group.push(sorted[j]);
        j++;
      }
    }
    groups.push(group);
    i = j;
  }
  return groups;
}

/**
 * Calculates accurate keyframe timestamp locations across a sequence group.
 * Guarantees:
 * - Keyframe 0 is at sequence start time
 * - Last Keyframe (N-1) is at sequence end time (the very last frame!)
 * - Intermediate keyframes are distributed smoothly across the sequence duration
 */
export function getKeyframeTimesForGroup(group: TimelinePositionClip[]): number[] {
  if (!group || group.length === 0) return [];
  if (group.length === 1) return [group[0].startTime];

  const firstClip = group[0];
  const lastClip = group[group.length - 1];
  const seqStart = firstClip.startTime;

  // If Compose mode created a block where last keyframe has duration 0,
  // keyframe times are already explicitly positioned at each clip's startTime.
  if (lastClip.duration === 0) {
    return group.map((c) => c.startTime);
  }

  const seqDuration = Math.max(
    0.1,
    lastClip.startTime + (lastClip.duration ?? 1.5) - firstClip.startTime
  );
  const seqEnd = Number((seqStart + seqDuration).toFixed(2));
  const N = group.length;

  if (N === 2) {
    return [seqStart, seqEnd];
  }

  // For N >= 3, apportion the N - 1 transition segments across the entire sequence duration.
  // Each transition segment k (0 <= k < N - 1) has weight w_k = max(0.1, group[k].duration ?? 1.5).
  // This guarantees that resizing the sequence scales all motion segments strictly proportionally
  // without any segment unexpectedly shrinking when total duration expands, or growing when it shrinks.
  const weights: number[] = [];
  for (let k = 0; k < N - 1; k++) {
    weights.push(Math.max(0.1, group[k].duration ?? 1.5));
  }
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);

  const times: number[] = [seqStart];
  let cumWeight = 0;
  for (let k = 0; k < N - 2; k++) {
    cumWeight += weights[k];
    const time = seqStart + (cumWeight / sumWeights) * seqDuration;
    times.push(Number(time.toFixed(2)));
  }
  times.push(seqEnd);

  // Ensure strictly monotonic timestamps
  for (let k = 1; k < times.length; k++) {
    if (times[k] <= times[k - 1]) {
      times[k] = Number((times[k - 1] + 0.01).toFixed(2));
    }
  }

  return times;
}

/**
 * Returns the exact timeline seek target timestamp for a clip.
 * When the last keyframe in a sequence is selected, it targets the very last frame of that sequence.
 */
export function getKeyframeTargetTime(
  clips: TimelinePositionClip[],
  clipIdOrIndex: string | number
): number {
  if (!clips || clips.length === 0) return 0;
  const groups = groupClipsIntoSequences(clips);

  for (const group of groups) {
    const idx = typeof clipIdOrIndex === 'string'
      ? group.findIndex((c) => c.id === clipIdOrIndex)
      : (clipIdOrIndex >= 0 && clipIdOrIndex < group.length && group[clipIdOrIndex] ? clipIdOrIndex : -1);

    if (idx !== -1) {
      const times = getKeyframeTimesForGroup(group);
      return times[idx] ?? group[idx].startTime;
    }
  }

  // Fallback if not found in groups
  if (typeof clipIdOrIndex === 'string') {
    const found = clips.find((c) => c.id === clipIdOrIndex);
    return found ? found.startTime : 0;
  }
  return clips[clipIdOrIndex]?.startTime ?? 0;
}

/**
 * Resolves which clip is currently active or closest at a given timeline timestamp.
 */
export function getActiveClipAtTime(
  clips: TimelinePositionClip[],
  time: number
): TimelinePositionClip | null {
  if (!clips || clips.length === 0) return null;
  const groups = groupClipsIntoSequences(clips);

  for (const group of groups) {
    const first = group[0];
    const last = group[group.length - 1];
    const groupStart = first.startTime;
    const groupEnd = last.startTime + (last.duration ?? 1.5);

    if (time >= groupStart && time <= groupEnd) {
      const times = getKeyframeTimesForGroup(group);
      // Find the keyframe index closest to time
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < times.length; i++) {
        const diff = Math.abs(time - times[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return group[closestIdx] || group[0];
    }
  }

  // If outside all sequence groups, pick overall closest
  let bestClip = clips[0];
  let minDiff = Infinity;
  for (const c of clips) {
    const diff = Math.abs(time - c.startTime);
    if (diff < minDiff) {
      minDiff = diff;
      bestClip = c;
    }
  }
  return bestClip;
}

/**
 * Converts timeline clips into sequence motion spans.
 * Supports isolated pairs (P01/P02), multi-point sequences (P01..P0N),
 * and composed blocks.
 * Spans smoothly cover the full duration up to the very last frame of each sequence group.
 */
export function getKeyframeSpans(clips: TimelinePositionClip[]): KeyframeSpan[] {
  if (!clips || clips.length === 0) return [];

  const groups = groupClipsIntoSequences(clips);
  const spans: KeyframeSpan[] = [];

  for (const group of groups) {
    const N = group.length;
    if (N === 1) {
      const c = group[0];
      const dur = c.duration || 1.5;
      spans.push({
        startTime: c.startTime,
        endTime: Number((c.startTime + dur).toFixed(2)),
        startCamera: c.camera,
        endCamera: c.camera,
        color: c.color || 'yellow',
      });
      continue;
    }

    const times = getKeyframeTimesForGroup(group);
    for (let k = 0; k < N - 1; k++) {
      const cA = group[k];
      const cB = group[k + 1];
      const startTime = times[k];
      const endTime = times[k + 1];

      spans.push({
        startTime,
        endTime,
        startCamera: cA.camera,
        endCamera: cB.camera,
        color: cA.color || cB.color || 'yellow',
      });
    }
  }

  return spans.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Evaluates smooth, continuous, cinematic camera trajectory across timeline keyframes.
 * Uses Cubic Hermite Spline with boundary-clamped zero-acceleration entrance/exit
 * and continuous C1 velocity through all intermediate waypoints.
 */
const DEFAULT_SPLINE_CAMERA: Camera3DState = {
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  perspective: 1000,
};

function safeCamera(cam?: Partial<Camera3DState> | null): Camera3DState {
  if (!cam) return { ...DEFAULT_SPLINE_CAMERA };
  return {
    rotX: typeof cam.rotX === 'number' ? cam.rotX : DEFAULT_SPLINE_CAMERA.rotX,
    rotY: typeof cam.rotY === 'number' ? cam.rotY : DEFAULT_SPLINE_CAMERA.rotY,
    rotZ: typeof cam.rotZ === 'number' ? cam.rotZ : DEFAULT_SPLINE_CAMERA.rotZ,
    zoom: typeof cam.zoom === 'number' ? cam.zoom : DEFAULT_SPLINE_CAMERA.zoom,
    panX: typeof cam.panX === 'number' ? cam.panX : DEFAULT_SPLINE_CAMERA.panX,
    panY: typeof cam.panY === 'number' ? cam.panY : DEFAULT_SPLINE_CAMERA.panY,
    perspective: typeof cam.perspective === 'number' && cam.perspective > 0 ? cam.perspective : DEFAULT_SPLINE_CAMERA.perspective,
  };
}

export function interpolateCameraSpline(
  clips: TimelinePositionClip[],
  time: number
): Camera3DState {
  if (!clips || clips.length === 0) {
    return { ...DEFAULT_SPLINE_CAMERA };
  }

  const spans = getKeyframeSpans(clips);
  if (spans.length === 0) {
    return safeCamera(clips[0]?.camera);
  }

  // 1. If before first span
  if (time <= spans[0].startTime) {
    return safeCamera(spans[0].startCamera);
  }

  // 2. If after last span
  const lastSpan = spans[spans.length - 1];
  if (time >= lastSpan.endTime) {
    return safeCamera(lastSpan.endCamera);
  }

  // 3. Find active span
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];

    if (time >= span.startTime && time <= span.endTime) {
      const spanDur = Math.max(0.0001, span.endTime - span.startTime);
      const u = Math.max(0, Math.min(1, (time - span.startTime) / spanDur));

      const p1 = safeCamera(span.startCamera);
      const p2 = safeCamera(span.endCamera);

      // If single isolated span (e.g. 2 keyframes), use Perlin's quintic smootherstep
      if (spans.length === 1) {
        const t = u * u * u * (u * (u * 6 - 15) + 10);
        const lerp = (a: number, b: number) => a + (b - a) * t;

        return {
          rotX: lerp(p1.rotX, p2.rotX),
          rotY: lerp(p1.rotY, p2.rotY),
          rotZ: lerp(p1.rotZ, p2.rotZ),
          zoom: lerp(p1.zoom, p2.zoom),
          panX: lerp(p1.panX, p2.panX),
          panY: lerp(p1.panY, p2.panY),
          perspective: Math.round(lerp(p1.perspective, p2.perspective)),
        };
      }

      // Multi-span continuous trajectory: Cubic Hermite Spline with C1 continuity
      const prevCam = spans[i - 1]?.startCamera ? safeCamera(spans[i - 1].startCamera) : p1;
      const nextCam = spans[i + 1]?.endCamera ? safeCamera(spans[i + 1].endCamera) : p2;

      // Start tangent M0 for this segment:
      // At sequence start (i === 0), start smoothly from rest (M0 = 0)
      // Otherwise, use central difference tangent between previous span and current
      const m0 = i === 0 ? {
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        zoom: 0,
        panX: 0,
        panY: 0,
        perspective: 0,
      } : {
        rotX: (p2.rotX - prevCam.rotX) * 0.5,
        rotY: (p2.rotY - prevCam.rotY) * 0.5,
        rotZ: (p2.rotZ - prevCam.rotZ) * 0.5,
        zoom: (p2.zoom - prevCam.zoom) * 0.5,
        panX: (p2.panX - prevCam.panX) * 0.5,
        panY: (p2.panY - prevCam.panY) * 0.5,
        perspective: (p2.perspective - prevCam.perspective) * 0.5,
      };

      // End tangent M1 for this segment:
      // At sequence end (i === spans.length - 1), settle smoothly to rest (M1 = 0)
      // Otherwise, use central difference tangent between current and next span
      const m1 = i === spans.length - 1 ? {
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        zoom: 0,
        panX: 0,
        panY: 0,
        perspective: 0,
      } : {
        rotX: (nextCam.rotX - p1.rotX) * 0.5,
        rotY: (nextCam.rotY - p1.rotY) * 0.5,
        rotZ: (nextCam.rotZ - p1.rotZ) * 0.5,
        zoom: (nextCam.zoom - p1.zoom) * 0.5,
        panX: (nextCam.panX - p1.panX) * 0.5,
        panY: (nextCam.panY - p1.panY) * 0.5,
        perspective: (nextCam.perspective - p1.perspective) * 0.5,
      };

      const u2 = u * u;
      const u3 = u2 * u;

      // Hermite basis functions
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;

      const hermite = (v0: number, v1: number, t0: number, t1: number) => {
        return h00 * v0 + h10 * t0 + h01 * v1 + h11 * t1;
      };

      return {
        rotX: hermite(p1.rotX, p2.rotX, m0.rotX, m1.rotX),
        rotY: hermite(p1.rotY, p2.rotY, m0.rotY, m1.rotY),
        rotZ: hermite(p1.rotZ, p2.rotZ, m0.rotZ, m1.rotZ),
        zoom: Math.max(0.4, hermite(p1.zoom, p2.zoom, m0.zoom, m1.zoom)),
        panX: hermite(p1.panX, p2.panX, m0.panX, m1.panX),
        panY: hermite(p1.panY, p2.panY, m0.panY, m1.panY),
        perspective: Math.round(Math.max(200, Math.min(3000, hermite(p1.perspective, p2.perspective, m0.perspective, m1.perspective)))),
      };
    }

    // Gap between spans
    if (i < spans.length - 1) {
      const nextSpan = spans[i + 1];
      if (time > span.endTime && time < nextSpan.startTime) {
        return safeCamera(span.endCamera);
      }
    }
  }

  return safeCamera(lastSpan.endCamera);
}
