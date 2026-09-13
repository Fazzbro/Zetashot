import { describe, it, expect } from 'vitest';
import {
  createDefaultTextLayer,
  smoothStep,
  getTextLayerInterpolation,
  getFontFamilyCss,
  getFontFamilyCanvas,
} from './textLayer';

describe('textLayer utilities', () => {
  it('creates default text layer with correct structure and fallback values', () => {
    const layer = createDefaultTextLayer(1.5);
    expect(layer.startTime).toBe(1.5);
    expect(layer.duration).toBe(3.0);
    expect(layer.fontFamily).toBe('SF Pro Display');
    expect(layer.color).toBe('#ffffff');
    expect(layer.inAnimation).toBe('pop');
    expect(layer.outAnimation).toBe('fade');
  });

  it('smoothStep clamps cleanly between 0 and 1', () => {
    expect(smoothStep(-0.5)).toBe(0);
    expect(smoothStep(0)).toBe(0);
    expect(smoothStep(0.5)).toBe(0.5);
    expect(smoothStep(1)).toBe(1);
    expect(smoothStep(1.5)).toBe(1);
  });

  it('getTextLayerInterpolation returns hidden when before startTime or after endTime', () => {
    const layer = createDefaultTextLayer(2.0);
    layer.duration = 4.0; // 2.0 to 6.0

    const before = getTextLayerInterpolation(layer, 1.5);
    expect(before.visible).toBe(false);
    expect(before.opacity).toBe(0);

    const after = getTextLayerInterpolation(layer, 6.5);
    expect(after.visible).toBe(false);
    expect(after.opacity).toBe(0);
  });

  it('interpolates in-animation correctly', () => {
    const layer = createDefaultTextLayer(2.0);
    layer.inAnimation = 'fade';
    layer.inDuration = 0.5;
    layer.duration = 4.0;

    // Start of in-animation
    const atStart = getTextLayerInterpolation(layer, 2.0);
    expect(atStart.visible).toBe(true);
    expect(atStart.opacity).toBeCloseTo(0, 2);

    // Mid in-animation
    const midIn = getTextLayerInterpolation(layer, 2.25);
    expect(midIn.visible).toBe(true);
    expect(midIn.opacity).toBeCloseTo(0.5, 2);

    // End of in-animation / steady state
    const steady = getTextLayerInterpolation(layer, 3.0);
    expect(steady.visible).toBe(true);
    expect(steady.opacity).toBe(1);
    expect(steady.scale).toBe(1);
    expect(steady.translateY).toBe(0);
  });

  it('interpolates out-animation correctly', () => {
    const layer = createDefaultTextLayer(1.0);
    layer.duration = 3.0; // 1.0 to 4.0
    layer.outAnimation = 'pop';
    layer.outDuration = 0.5; // active out from 3.5 to 4.0

    // Mid out-animation at 3.75s (halfway out)
    const midOut = getTextLayerInterpolation(layer, 3.75);
    expect(midOut.visible).toBe(true);
    expect(midOut.opacity).toBeCloseTo(0.5, 2);
    expect(midOut.scale).toBeLessThan(1.0);
  });

  it('returns valid font family CSS and Canvas stacks for SF Pro Display, Helvetica, and Poppins', () => {
    expect(getFontFamilyCss('SF Pro Display')).toContain('SF Pro Display');
    expect(getFontFamilyCss('Helvetica')).toContain('Helvetica');
    expect(getFontFamilyCss('Poppins')).toContain('Poppins');

    expect(getFontFamilyCanvas('SF Pro Display')).toContain('SF Pro Display');
    expect(getFontFamilyCanvas('Helvetica')).toContain('Helvetica');
    expect(getFontFamilyCanvas('Poppins')).toContain('Poppins');
  });
});
