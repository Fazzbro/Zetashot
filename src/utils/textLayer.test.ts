import { describe, it, expect } from 'vitest';
import {
  createDefaultTextLayer,
  smoothStep,
  getTextLayerInterpolation,
  getFontFamilyCss,
  getFontFamilyCanvas,
  splitTextLayerLines,
} from './textLayer';

describe('textLayer utilities', () => {
  it('creates default text layer with correct structure and fallback values', () => {
    const layer = createDefaultTextLayer(1.5);
    expect(layer.startTime).toBe(1.5);
    expect(layer.duration).toBe(3.0);
    expect(layer.fontFamily).toBe('Sora');
    expect(layer.color).toBe('#000000');
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

  it('returns valid font family CSS and Canvas stacks for Sora, SF Pro Display, Helvetica, and Poppins', () => {
    expect(getFontFamilyCss('Sora')).toContain('Sora');
    expect(getFontFamilyCss('SF Pro Display')).toContain('SF Pro Display');
    expect(getFontFamilyCss('Helvetica')).toContain('Helvetica');
    expect(getFontFamilyCss('Poppins')).toContain('Poppins');

    expect(getFontFamilyCanvas('Sora')).toContain('Sora');
    expect(getFontFamilyCanvas('SF Pro Display')).toContain('SF Pro Display');
    expect(getFontFamilyCanvas('Helvetica')).toContain('Helvetica');
    expect(getFontFamilyCanvas('Poppins')).toContain('Poppins');
  });

  it('supports custom lineHeight and letterSpacing', () => {
    const layer = createDefaultTextLayer(0);
    expect(layer.lineHeight).toBe(0.95);
    expect(layer.letterSpacing).toBe(0);

    layer.lineHeight = 1.45;
    layer.letterSpacing = 2.5;
    expect(layer.lineHeight).toBe(1.45);
    expect(layer.letterSpacing).toBe(2.5);
  });

  it('splitTextLayerLines separates multi-line text into independent layers without hierarchy constraints', () => {
    const baseLayer = createDefaultTextLayer(1.0);
    baseLayer.text = 'Bringing\ntechnology to life';
    baseLayer.y = 50; // center
    baseLayer.fontSize = 48;
    baseLayer.lineHeight = 1.2;

    const split = splitTextLayerLines(baseLayer, 1080);
    expect(split.length).toBe(2);

    // First line
    expect(split[0].text).toBe('Bringing');
    expect(split[0].fontFamily).toBe(baseLayer.fontFamily);
    expect(split[0].color).toBe(baseLayer.color);
    expect(split[0].y).toBeLessThan(50); // Shifted upward

    // Second line
    expect(split[1].text).toBe('technology to life');
    expect(split[1].y).toBeGreaterThan(50); // Shifted downward

    // Vertical spacing matches line height calculation
    const diff = split[1].y - split[0].y;
    const expectedDiff = ((48 * 1.2) / 1080) * 100;
    expect(diff).toBeCloseTo(expectedDiff, 0);
  });

  it('splitTextLayerLines returns the same layer if there is only 1 line', () => {
    const layer = createDefaultTextLayer(0);
    layer.text = 'Single Line Heading';
    const split = splitTextLayerLines(layer);
    expect(split.length).toBe(1);
    expect(split[0]).toBe(layer);
  });
});

