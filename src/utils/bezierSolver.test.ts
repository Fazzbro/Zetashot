import { describe, it, expect } from 'vitest';
import { solveCubicBezier, EASING_PRESETS } from '../utils/bezierSolver';

describe('bezierSolver utilities', () => {
  it('contains all 6 standard ui.camera presets', () => {
    expect(EASING_PRESETS.length).toBe(6);
    const ease = EASING_PRESETS.find((p) => p.name === 'Ease');
    expect(ease).toBeDefined();
    expect(ease?.values).toEqual([0.25, 0.1, 0.25, 1.0]);

    const smooth = EASING_PRESETS.find((p) => p.name === 'Smooth');
    expect(smooth).toBeDefined();
    expect(smooth?.values).toEqual([0.16, 1.0, 0.3, 1.0]);
  });

  it('solves cubic bezier progress at boundary values', () => {
    const ease = [0.25, 0.1, 0.25, 1.0] as [number, number, number, number];
    expect(solveCubicBezier(0, ease)).toBeCloseTo(0);
    expect(solveCubicBezier(1, ease)).toBeCloseTo(1);
  });

  it('evaluates monotonically increasing values for standard ease curves', () => {
    const ease = [0.25, 0.1, 0.25, 1.0] as [number, number, number, number];
    let prev = 0;
    for (let t = 0.1; t <= 1.0; t += 0.1) {
      const val = solveCubicBezier(t, ease);
      expect(val).toBeGreaterThanOrEqual(prev);
      prev = val;
    }
  });
});
