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
 * Converts timeline clips into sequence motion spans.
 * Supports isolated pairs (P01/P02), multi-point sequences (P01..P0N),
 * and composed blocks.
 */
export function getKeyframeSpans(clips: TimelinePositionClip[]): KeyframeSpan[] {
  if (!clips || clips.length === 0) return [];

  const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);

  if (sorted.length === 1) {
    const c = sorted[0];
    const dur = c.duration || 1.5;
    return [{
      startTime: c.startTime,
      endTime: c.startTime + dur,
      startCamera: c.camera,
      endCamera: c.camera,
      color: c.color || 'yellow',
    }];
  }

  // 2-keyframe isolated pair (e.g. default P01 / P02 covering full sequence block)
  if (sorted.length === 2 && !sorted[0].blockId && !sorted[1].blockId) {
    const c1 = sorted[0];
    const c2 = sorted[1];
    const d1 = typeof c1.duration === 'number' && c1.duration > 0 ? c1.duration : 1.5;
    const d2 = typeof c2.duration === 'number' && c2.duration > 0 ? c2.duration : 1.5;
    const seqDuration = d1 + d2;
    return [{
      startTime: c1.startTime,
      endTime: c1.startTime + seqDuration,
      startCamera: c1.camera,
      endCamera: c2.camera,
      color: c1.color || c2.color || 'yellow',
    }];
  }

  // Multi-keyframe sequence (3 or more keyframes, or Compose block)
  // Every keyframe P01 -> P02 -> P03 -> P04 -> ... connects smoothly to the next
  const spans: KeyframeSpan[] = [];
  for (let k = 0; k < sorted.length - 1; k++) {
    const cA = sorted[k];
    const cB = sorted[k + 1];
    const startTime = cA.startTime;
    const endTime = cB.startTime > cA.startTime ? cB.startTime : cA.startTime + (cA.duration || 1.5);

    spans.push({
      startTime,
      endTime,
      startCamera: cA.camera,
      endCamera: cB.camera,
      color: cA.color || cB.color || 'yellow',
    });
  }

  return spans.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Evaluates smooth, continuous, cinematic camera trajectory across timeline keyframes.
 * Uses Cubic Hermite Spline with boundary-clamped zero-acceleration entrance/exit
 * and continuous C1 velocity through all intermediate waypoints.
 */
export function interpolateCameraSpline(
  clips: TimelinePositionClip[],
  time: number
): Camera3DState {
  if (!clips || clips.length === 0) {
    return { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 };
  }

  const spans = getKeyframeSpans(clips);
  if (spans.length === 0) {
    return clips[0].camera;
  }

  // 1. If before first span
  if (time <= spans[0].startTime) {
    return spans[0].startCamera;
  }

  // 2. If after last span
  const lastSpan = spans[spans.length - 1];
  if (time >= lastSpan.endTime) {
    return lastSpan.endCamera;
  }

  // 3. Find active span
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];

    if (time >= span.startTime && time <= span.endTime) {
      const spanDur = Math.max(0.0001, span.endTime - span.startTime);
      const u = Math.max(0, Math.min(1, (time - span.startTime) / spanDur));

      // If single isolated span (e.g. 2 keyframes), use Perlin's quintic smootherstep
      if (spans.length === 1) {
        const t = u * u * u * (u * (u * 6 - 15) + 10);
        const p1 = span.startCamera;
        const p2 = span.endCamera;
        const lerp = (a: number, b: number) => a + (b - a) * t;

        const persp1 = typeof p1.perspective === 'number' && p1.perspective > 0 ? p1.perspective : 1000;
        const persp2 = typeof p2.perspective === 'number' && p2.perspective > 0 ? p2.perspective : 1000;

        return {
          rotX: lerp(p1.rotX, p2.rotX),
          rotY: lerp(p1.rotY, p2.rotY),
          rotZ: lerp(p1.rotZ, p2.rotZ),
          zoom: lerp(p1.zoom, p2.zoom),
          panX: lerp(p1.panX, p2.panX),
          panY: lerp(p1.panY, p2.panY),
          perspective: Math.round(lerp(persp1, persp2)),
        };
      }

      // Multi-span continuous trajectory: Cubic Hermite Spline with C1 continuity
      const p1 = span.startCamera;
      const p2 = span.endCamera;

      const persp1 = typeof p1.perspective === 'number' && p1.perspective > 0 ? p1.perspective : 1000;
      const persp2 = typeof p2.perspective === 'number' && p2.perspective > 0 ? p2.perspective : 1000;
      const prevPersp = spans[i - 1]?.startCamera?.perspective ?? persp1;
      const nextPersp = spans[i + 1]?.endCamera?.perspective ?? persp2;

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
        rotX: (p2.rotX - spans[i - 1].startCamera.rotX) * 0.5,
        rotY: (p2.rotY - spans[i - 1].startCamera.rotY) * 0.5,
        rotZ: (p2.rotZ - spans[i - 1].startCamera.rotZ) * 0.5,
        zoom: (p2.zoom - spans[i - 1].startCamera.zoom) * 0.5,
        panX: (p2.panX - spans[i - 1].startCamera.panX) * 0.5,
        panY: (p2.panY - spans[i - 1].startCamera.panY) * 0.5,
        perspective: (persp2 - prevPersp) * 0.5,
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
        rotX: (spans[i + 1].endCamera.rotX - p1.rotX) * 0.5,
        rotY: (spans[i + 1].endCamera.rotY - p1.rotY) * 0.5,
        rotZ: (spans[i + 1].endCamera.rotZ - p1.rotZ) * 0.5,
        zoom: (spans[i + 1].endCamera.zoom - p1.zoom) * 0.5,
        panX: (spans[i + 1].endCamera.panX - p1.panX) * 0.5,
        panY: (spans[i + 1].endCamera.panY - p1.panY) * 0.5,
        perspective: (nextPersp - persp1) * 0.5,
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
        perspective: Math.round(Math.max(200, Math.min(3000, hermite(persp1, persp2, m0.perspective, m1.perspective)))),
      };
    }

    // Gap between spans
    if (i < spans.length - 1) {
      const nextSpan = spans[i + 1];
      if (time > span.endTime && time < nextSpan.startTime) {
        return span.endCamera;
      }
    }
  }

  return lastSpan.endCamera;
}
