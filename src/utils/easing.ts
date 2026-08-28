export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'cubic'
  | 'smooth';

export interface KeyframePoint {
  id: string;
  time: number; // milliseconds from start (0..duration)
  x: number; // canvas pan/target X
  y: number; // canvas pan/target Y
  zoom: number; // 0.25 .. 4.0
  rotation: number; // -360 .. 360
  easing: EasingType;
}

export function easeLinear(t: number): number {
  return t;
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

export function smoothStep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

export function getEasingFunction(easing: EasingType): (t: number) => number {
  switch (easing) {
    case 'linear':
      return easeLinear;
    case 'easeIn':
      return easeInQuad;
    case 'easeOut':
      return easeOutQuad;
    case 'easeInOut':
    case 'cubic':
      return easeInOutCubic;
    case 'smooth':
      return smoothStep;
    default:
      return easeInOutCubic;
  }
}

export function interpolateNumber(
  start: number,
  end: number,
  progress: number,
  easing: EasingType = 'easeInOut'
): number {
  const easeFn = getEasingFunction(easing);
  const easedT = easeFn(Math.max(0, Math.min(1, progress)));
  return start + (end - start) * easedT;
}

export interface InterpolatedState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export function interpolateKeyframe(
  keyframes: KeyframePoint[],
  currentTime: number
): InterpolatedState {
  if (!keyframes || keyframes.length === 0) {
    return { x: 0, y: 0, zoom: 1.0, rotation: 0 };
  }

  // Sort by timestamp
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  if (currentTime <= sorted[0].time) {
    const first = sorted[0];
    return { x: first.x, y: first.y, zoom: first.zoom, rotation: first.rotation };
  }

  if (currentTime >= sorted[sorted.length - 1].time) {
    const last = sorted[sorted.length - 1];
    return { x: last.x, y: last.y, zoom: last.zoom, rotation: last.rotation };
  }

  // Find bounding keyframes
  let prev = sorted[0];
  let next = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const duration = next.time - prev.time;
  const progress = duration > 0 ? (currentTime - prev.time) / duration : 1;
  const easing = next.easing || 'easeInOut';

  return {
    x: interpolateNumber(prev.x, next.x, progress, easing),
    y: interpolateNumber(prev.y, next.y, progress, easing),
    zoom: interpolateNumber(prev.zoom, next.zoom, progress, easing),
    rotation: interpolateNumber(prev.rotation, next.rotation, progress, easing),
  };
}
