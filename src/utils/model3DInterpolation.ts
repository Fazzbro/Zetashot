import { Model3DTransform, Model3DKeyframe, DEFAULT_MODEL_3D_TRANSFORM } from '../types/model3D';

/**
 * Normalizes an angle in degrees to [-180, 180)
 */
function normalizeAngleDeg(angle: number): number {
  let a = (angle + 180) % 360;
  if (a < 0) a += 360;
  return a - 180;
}

/**
 * Interpolates two angles in degrees taking the shortest rotational path
 */
function lerpAngleDeg(a: number, b: number, t: number): number {
  const diff = normalizeAngleDeg(b - a);
  return a + diff * t;
}

/**
 * Standard smootherstep (Ken Perlin's quintic polynomial): 6t^5 - 15t^4 + 10t^3
 * Yields continuous 1st and 2nd derivatives for zero-jerk cinematic motion.
 */
function smootherstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

/**
 * Linearly interpolates two numbers
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolates a Model3DTransform across a set of sorted keyframes at timestamp `time`.
 */
export function interpolateModel3DTransform(
  keyframes: Model3DKeyframe[] | undefined,
  time: number,
  fallback: Model3DTransform = DEFAULT_MODEL_3D_TRANSFORM
): Model3DTransform {
  if (!keyframes || keyframes.length === 0) {
    return { ...fallback };
  }

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe
  if (time <= sorted[0].time) {
    return { ...sorted[0].transform };
  }

  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) {
    return { ...sorted[sorted.length - 1].transform };
  }

  // Find surrounding span
  for (let i = 0; i < sorted.length - 1; i++) {
    const kfA = sorted[i];
    const kfB = sorted[i + 1];

    if (time >= kfA.time && time <= kfB.time) {
      const spanDur = kfB.time - kfA.time;
      const rawProgress = spanDur > 0.0001 ? (time - kfA.time) / spanDur : 0;
      const smoothT = smootherstep(rawProgress);

      const tA = kfA.transform;
      const tB = kfB.transform;

      return {
        posX: lerp(tA.posX, tB.posX, smoothT),
        posY: lerp(tA.posY, tB.posY, smoothT),
        posZ: lerp(tA.posZ, tB.posZ, smoothT),
        rotX: lerpAngleDeg(tA.rotX, tB.rotX, smoothT),
        rotY: lerpAngleDeg(tA.rotY, tB.rotY, smoothT),
        rotZ: lerpAngleDeg(tA.rotZ, tB.rotZ, smoothT),
        scale: Math.max(0.01, lerp(tA.scale, tB.scale, smoothT)),
        animationSpeed: lerp(tA.animationSpeed ?? 1.0, tB.animationSpeed ?? 1.0, smoothT),
        playAnimation: tB.playAnimation ?? tA.playAnimation ?? true,
      };
    }
  }

  return { ...sorted[sorted.length - 1].transform };
}

/**
 * Inserts or updates a keyframe at the target timestamp.
 */
export function setOrUpdateModelKeyframe(
  keyframes: Model3DKeyframe[] = [],
  time: number,
  transform: Model3DTransform,
  tolerance = 0.05
): Model3DKeyframe[] {
  const roundedTime = Number(time.toFixed(2));
  const existingIdx = keyframes.findIndex((k) => Math.abs(k.time - roundedTime) <= tolerance);

  if (existingIdx >= 0) {
    const updated = [...keyframes];
    updated[existingIdx] = {
      ...updated[existingIdx],
      time: roundedTime,
      transform: { ...transform },
    };
    return updated.sort((a, b) => a.time - b.time);
  }

  const newKf: Model3DKeyframe = {
    id: `m3d_kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    time: roundedTime,
    transform: { ...transform },
  };

  return [...keyframes, newKf].sort((a, b) => a.time - b.time);
}

/**
 * Deletes a keyframe by id or close timestamp.
 */
export function removeModelKeyframe(
  keyframes: Model3DKeyframe[],
  idOrTime: string | number
): Model3DKeyframe[] {
  if (typeof idOrTime === 'string') {
    return keyframes.filter((k) => k.id !== idOrTime);
  }
  return keyframes.filter((k) => Math.abs(k.time - idOrTime) > 0.05);
}
