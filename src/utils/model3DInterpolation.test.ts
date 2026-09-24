import { describe, it, expect } from 'vitest';
import {
  interpolateModel3DTransform,
  setOrUpdateModelKeyframe,
  removeModelKeyframe,
} from './model3DInterpolation';
import { DEFAULT_MODEL_3D_TRANSFORM, Model3DKeyframe } from '../types/model3D';

describe('model3DInterpolation', () => {
  it('returns fallback transform when keyframes list is empty', () => {
    const res = interpolateModel3DTransform([], 1.5, DEFAULT_MODEL_3D_TRANSFORM);
    expect(res).toEqual(DEFAULT_MODEL_3D_TRANSFORM);
  });

  it('clamps to boundary keyframes before start and after end', () => {
    const keyframes: Model3DKeyframe[] = [
      {
        id: 'kf1',
        time: 1.0,
        transform: { ...DEFAULT_MODEL_3D_TRANSFORM, posX: 50, scale: 1.0 },
      },
      {
        id: 'kf2',
        time: 3.0,
        transform: { ...DEFAULT_MODEL_3D_TRANSFORM, posX: 150, scale: 2.0 },
      },
    ];

    const before = interpolateModel3DTransform(keyframes, 0.5);
    expect(before.posX).toBe(50);
    expect(before.scale).toBe(1.0);

    const after = interpolateModel3DTransform(keyframes, 4.0);
    expect(after.posX).toBe(150);
    expect(after.scale).toBe(2.0);
  });

  it('interpolates smoothly at midpoint with smootherstep', () => {
    const keyframes: Model3DKeyframe[] = [
      {
        id: 'kf1',
        time: 0.0,
        transform: { ...DEFAULT_MODEL_3D_TRANSFORM, posX: 0, rotY: 0, scale: 1.0 },
      },
      {
        id: 'kf2',
        time: 2.0,
        transform: { ...DEFAULT_MODEL_3D_TRANSFORM, posX: 100, rotY: 90, scale: 2.0 },
      },
    ];

    const mid = interpolateModel3DTransform(keyframes, 1.0);
    // At t=0.5 normalized, smootherstep(0.5) is exactly 0.5
    expect(mid.posX).toBeCloseTo(50, 1);
    expect(mid.rotY).toBeCloseTo(45, 1);
    expect(mid.scale).toBeCloseTo(1.5, 1);
  });

  it('handles shortest rotational distance across 360 wrap', () => {
    const keyframes: Model3DKeyframe[] = [
      {
        id: 'kf1',
        time: 0.0,
        transform: { ...DEFAULT_MODEL_3D_TRANSFORM, rotY: 350 },
      },
      {
        id: 'kf2',
        time: 2.0,
        transform: { ...DEFAULT_MODEL_3D_TRANSFORM, rotY: 10 },
      },
    ];

    const mid = interpolateModel3DTransform(keyframes, 1.0);
    // Shortest path between 350 and 10 is +20 deg, so midpoint is 350 + 10 = 360 = 0 deg
    expect((mid.rotY + 360) % 360).toBeCloseTo(0, 1);
  });

  it('inserts and updates keyframes cleanly', () => {
    let keyframes: Model3DKeyframe[] = [];
    keyframes = setOrUpdateModelKeyframe(keyframes, 1.0, { ...DEFAULT_MODEL_3D_TRANSFORM, scale: 1.2 });
    expect(keyframes).toHaveLength(1);
    expect(keyframes[0].time).toBe(1.0);
    expect(keyframes[0].transform.scale).toBe(1.2);

    // Update existing keyframe at t=1.0
    keyframes = setOrUpdateModelKeyframe(keyframes, 1.02, { ...DEFAULT_MODEL_3D_TRANSFORM, scale: 1.5 });
    expect(keyframes).toHaveLength(1);
    expect(keyframes[0].transform.scale).toBe(1.5);

    // Add second keyframe
    keyframes = setOrUpdateModelKeyframe(keyframes, 3.0, { ...DEFAULT_MODEL_3D_TRANSFORM, scale: 2.0 });
    expect(keyframes).toHaveLength(2);

    // Remove keyframe
    keyframes = removeModelKeyframe(keyframes, 1.0);
    expect(keyframes).toHaveLength(1);
    expect(keyframes[0].time).toBe(3.0);
  });

  it('updates existing keyframe within 0.12s snap tolerance without creating duplicates', () => {
    let keyframes: Model3DKeyframe[] = [
      { id: 'kf1', time: 0.0, transform: { ...DEFAULT_MODEL_3D_TRANSFORM, scale: 1.0 } },
      { id: 'kf2', time: 2.0, transform: { ...DEFAULT_MODEL_3D_TRANSFORM, scale: 2.0 } },
    ];

    // User is at playhead 0.08s and modifies scale to 1.75x
    keyframes = setOrUpdateModelKeyframe(keyframes, 0.08, { ...DEFAULT_MODEL_3D_TRANSFORM, scale: 1.75 }, 0.12);
    expect(keyframes).toHaveLength(2);
    expect(keyframes[0].transform.scale).toBe(1.75);

    // Verify interpolation at 0s now immediately reflects the updated scale
    const atZero = interpolateModel3DTransform(keyframes, 0.0);
    expect(atZero.scale).toBe(1.75);
  });

  it('removes keyframe with tolerance for slight floating-point differences', () => {
    let keyframes: Model3DKeyframe[] = [
      { id: 'kf1', time: 1.5, transform: { ...DEFAULT_MODEL_3D_TRANSFORM } },
    ];
    // Remove with slight float drift (e.g., 1.54)
    keyframes = removeModelKeyframe(keyframes, 1.54, 0.1);
    expect(keyframes).toHaveLength(0);
  });

  it('interpolates playAnimation toggle accurately across keyframes', () => {
    const keyframes: Model3DKeyframe[] = [
      { id: 'kf1', time: 0.0, transform: { ...DEFAULT_MODEL_3D_TRANSFORM, playAnimation: true } },
      { id: 'kf2', time: 2.0, transform: { ...DEFAULT_MODEL_3D_TRANSFORM, playAnimation: false } },
    ];

    const early = interpolateModel3DTransform(keyframes, 0.5);
    expect(early.playAnimation).toBe(true);

    const late = interpolateModel3DTransform(keyframes, 1.6);
    expect(late.playAnimation).toBe(false);
  });
});
