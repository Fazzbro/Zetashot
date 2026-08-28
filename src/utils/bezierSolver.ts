export type CubicBezierValues = [number, number, number, number];

export interface EasingPreset {
  id: string;
  name: string;
  values: CubicBezierValues;
}

export const EASING_PRESETS: EasingPreset[] = [
  { id: 'linear', name: 'Linear', values: [0.0, 0.0, 1.0, 1.0] },
  { id: 'ease', name: 'Ease', values: [0.25, 0.1, 0.25, 1.0] },
  { id: 'ease-in', name: 'Ease in', values: [0.42, 0.0, 1.0, 1.0] },
  { id: 'ease-out', name: 'Ease out', values: [0.0, 0.0, 0.58, 1.0] },
  { id: 'ease-in-out', name: 'Ease in out', values: [0.42, 0.0, 0.58, 1.0] },
  { id: 'smooth', name: 'Smooth', values: [0.16, 1.0, 0.3, 1.0] },
];

/**
 * Solves the cubic Bezier y value for a given x using Newton-Raphson iteration.
 */
export function solveCubicBezier(
  x: number,
  [x1, y1, x2, y2]: CubicBezierValues
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const sampleCurveX = (t: number) =>
    3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;

  const sampleCurveY = (t: number) =>
    3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;

  const sampleCurveDerivativeX = (t: number) =>
    3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);

  // Newton-Raphson iteration
  let t = x;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleCurveX(t) - x;
    if (Math.abs(currentX) < 1e-6) return sampleCurveY(t);
    const dX = sampleCurveDerivativeX(t);
    if (Math.abs(dX) < 1e-6) break;
    t -= currentX / dX;
  }

  // Binary subdivision fallback
  let t0 = 0;
  let t1 = 1;
  t = x;

  while (t0 < t1) {
    const currentX = sampleCurveX(t);
    if (Math.abs(currentX - x) < 1e-5) return sampleCurveY(t);
    if (x > currentX) t0 = t;
    else t1 = t;
    t = (t1 + t0) / 2;
  }

  return sampleCurveY(t);
}
