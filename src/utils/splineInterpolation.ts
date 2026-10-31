import { Camera3DState } from './camera3D';
import { MediaTimelineClip, getActiveMediaClipAtTime } from '../types/mediaTimeline';
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
export const DEFAULT_SPLINE_CAMERA: Camera3DState = {
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  zoom: 0.9,
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

function evaluateSpans(spans: KeyframeSpan[], time: number): Camera3DState {
  if (!spans || spans.length === 0) {
    return { ...DEFAULT_SPLINE_CAMERA };
  }

  // 1. Before first span
  if (time <= spans[0].startTime) {
    return safeCamera(spans[0].startCamera);
  }

  const lastSpan = spans[spans.length - 1];
  // 2. After last span
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

      // If single isolated span, use Perlin quintic smootherstep with zero start/end velocity
      if (spans.length === 1) {
        const t = u * u * u * (u * (u * 6 - 15) + 10);
        const lerp = (a: number, b: number) => a + (b - a) * t;

        return {
          rotX: lerp(p1.rotX, p2.rotX),
          rotY: lerp(p1.rotY, p2.rotY),
          rotZ: lerp(p1.rotZ, p2.rotZ),
          zoom: Math.max(0.25, Math.min(4.0, lerp(p1.zoom, p2.zoom))),
          panX: lerp(p1.panX, p2.panX),
          panY: lerp(p1.panY, p2.panY),
          perspective: Math.round(lerp(p1.perspective, p2.perspective)),
        };
      }

      // Continuous Monotone Hermite interpolation for multi-span sequences
      const u2 = u * u;
      const u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;

      const interpolateChannel = (getter: (c: Camera3DState) => number): number => {
        const y1 = getter(p1);
        const y2 = getter(p2);

        // Flat hold: strictly zero velocity, zero movement
        if (y1 === y2) {
          return y1;
        }

        const sCurr = (y2 - y1) / spanDur;

        // Start velocity v0 at span.startTime
        let v0 = 0;
        if (i > 0 && spans[i - 1].endTime === span.startTime) {
          const yPrev = getter(safeCamera(spans[i - 1].startCamera));
          const durPrev = Math.max(0.0001, spans[i - 1].endTime - spans[i - 1].startTime);
          const sPrev = (y1 - yPrev) / durPrev;
          if (sPrev * sCurr > 0) {
            const weightedSlope = (sPrev * spanDur + sCurr * durPrev) / (durPrev + spanDur);
            v0 = Math.sign(sCurr) * Math.min(Math.abs(weightedSlope), 2 * Math.min(Math.abs(sPrev), Math.abs(sCurr)));
          }
        }

        // End velocity v1 at span.endTime
        let v1 = 0;
        if (i < spans.length - 1 && spans[i + 1].startTime === span.endTime) {
          const yNext = getter(safeCamera(spans[i + 1].endCamera));
          const durNext = Math.max(0.0001, spans[i + 1].endTime - spans[i + 1].startTime);
          const sNext = (yNext - y2) / durNext;
          if (sCurr * sNext > 0) {
            const weightedSlope = (sCurr * durNext + sNext * spanDur) / (spanDur + durNext);
            v1 = Math.sign(sCurr) * Math.min(Math.abs(weightedSlope), 2 * Math.min(Math.abs(sCurr), Math.abs(sNext)));
          }
        }

        const m0 = spanDur * v0;
        const m1 = spanDur * v1;

        return h00 * y1 + h10 * m0 + h01 * y2 + h11 * m1;
      };

      return {
        rotX: interpolateChannel((c) => c.rotX),
        rotY: interpolateChannel((c) => c.rotY),
        rotZ: interpolateChannel((c) => c.rotZ),
        zoom: Math.max(0.25, Math.min(4.0, interpolateChannel((c) => c.zoom))),
        panX: interpolateChannel((c) => c.panX),
        panY: interpolateChannel((c) => c.panY),
        perspective: Math.round(interpolateChannel((c) => c.perspective)),
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

  return safeCamera(lastSpan?.endCamera);
}

/**
 * Resolves the optical focal center point on the media (normalized 0..1)
 * based on camera pan, zoom, and active interest regions.
 */
export function getOpticalFocusPoint(
  camera: Camera3DState,
  stageDims: { width: number; height: number } = { width: 960, height: 540 },
  activeRegion?: { x: number; y: number; width: number; height: number } | null
): { x: number; y: number } {
  if (activeRegion && activeRegion.width > 0 && activeRegion.height > 0) {
    const rx = (activeRegion.x + activeRegion.width / 2) / stageDims.width;
    const ry = (activeRegion.y + activeRegion.height / 2) / stageDims.height;
    return {
      x: Math.max(0.05, Math.min(0.95, Number(rx.toFixed(3)))),
      y: Math.max(0.05, Math.min(0.95, Number(ry.toFixed(3)))),
    };
  }

  const zoom = Math.max(0.2, camera.zoom || 0.9);
  const cx = stageDims.width / 2 - (camera.panX || 0) / zoom;
  const cy = stageDims.height / 2 - (camera.panY || 0) / zoom;
  return {
    x: Math.max(0.05, Math.min(0.95, Number((cx / stageDims.width).toFixed(3)))),
    y: Math.max(0.05, Math.min(0.95, Number((cy / stageDims.height).toFixed(3)))),
  };
}

/**
 * Computes dynamic optical rack-focus unblur multiplier.
 * When the camera transitions to an area and settles, the focused region
 * smoothly unblurs (from transition motion depth) to pinpoint 0-blur sharpness.
 */
export function getRackFocusUnblurFactor(
  progress: number,
  isDwelling: boolean = false
): number {
  if (isDwelling) return 0.0;
  if (progress < 0.60) return 1.0;
  const p = (progress - 0.60) / 0.40;
  return Math.max(0.0, Math.min(1.0, 1.0 - (p * p * (3 - 2 * p))));
}

export function interpolateCameraSpline(
  clips: TimelinePositionClip[],
  time: number,
  mediaClips?: MediaTimelineClip[]
): Camera3DState {
  if (!clips || clips.length === 0) {
    return { ...DEFAULT_SPLINE_CAMERA };
  }

  // If multi-clip media sequence exists, scope camera evaluation to the active media clip
  if (mediaClips && mediaClips.length > 0) {
    const activeMediaClip = getActiveMediaClipAtTime(mediaClips, time);
    if (activeMediaClip) {
      // Find keyframes associated with this media clip
      const clipKeyframes = clips.filter((c) => {
        if (c.mediaClipId) {
          return c.mediaClipId === activeMediaClip.id;
        }
        return c.startTime >= activeMediaClip.startTime - 0.05 && c.startTime < activeMediaClip.startTime + activeMediaClip.duration;
      });

      // If the active media clip has no keyframes, it must remain in the clean default imported pose!
      if (clipKeyframes.length === 0) {
        return { ...DEFAULT_SPLINE_CAMERA };
      }

      const spans = getKeyframeSpans(clipKeyframes);
      if (spans.length === 0) {
        return safeCamera(clipKeyframes[0]?.camera);
      }

      if (time <= spans[0].startTime) {
        return safeCamera(spans[0].startCamera);
      }

      const lastSpan = spans[spans.length - 1];
      if (time >= lastSpan.endTime) {
        return safeCamera(lastSpan?.endCamera);
      }

      return evaluateSpans(spans, time);
    }
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
    return safeCamera(lastSpan?.endCamera);
  }

  return evaluateSpans(spans, time);
}
