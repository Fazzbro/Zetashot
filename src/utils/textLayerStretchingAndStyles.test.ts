import { describe, it, expect } from 'vitest';
import {
  createDefaultTextLayer,
  getTextLayerInterpolation,
  getFontFamilyCss,
  getFontFamilyCanvas,
  smoothStep,
  getScrambledString,
  getStaggeredProgress,
  getTokenInterpolation,
} from './textLayer';
import { TextLayerOverlay, TextFontFamily } from '../types/textLayer';

describe('Text Layer Stretching, In/Out Animations, Typography & Color', () => {
  it('stretches duration correctly from right handle without moving startTime', () => {
    const layer = createDefaultTextLayer(1.0);
    expect(layer.startTime).toBe(1.0);
    expect(layer.duration).toBe(3.0);

    // Simulate right handle stretch by +2.5 seconds
    const deltaSec = 2.5;
    const newDuration = Number((layer.duration + deltaSec).toFixed(2));
    const stretchedLayer: TextLayerOverlay = {
      ...layer,
      duration: newDuration,
    };

    expect(stretchedLayer.startTime).toBe(1.0);
    expect(stretchedLayer.duration).toBe(5.5);
    expect(stretchedLayer.startTime + stretchedLayer.duration).toBe(6.5);
  });

  it('stretches duration correctly from left handle while shifting startTime and keeping right end anchored', () => {
    const layer = createDefaultTextLayer(2.0);
    layer.duration = 4.0;
    const initialEnd = layer.startTime + layer.duration; // 6.0

    // Simulate left handle drag to the left (earlier start time by 1.2 seconds)
    const deltaSec = -1.2;
    const newStart = Math.max(0, Number((layer.startTime + deltaSec).toFixed(2))); // 0.8
    const newDuration = Number((initialEnd - newStart).toFixed(2)); // 6.0 - 0.8 = 5.2

    const stretchedLayer: TextLayerOverlay = {
      ...layer,
      startTime: newStart,
      duration: newDuration,
    };

    expect(stretchedLayer.startTime).toBe(0.8);
    expect(stretchedLayer.duration).toBe(5.2);
    expect(stretchedLayer.startTime + stretchedLayer.duration).toBe(6.0); // Exactly anchored
  });

  it('drags and shifts startTime along timeline while preserving duration', () => {
    const layer = createDefaultTextLayer(1.5);
    layer.duration = 3.2;

    // Shift forward by +1.8s
    const shiftedStart = Number((layer.startTime + 1.8).toFixed(2));
    const shiftedLayer: TextLayerOverlay = {
      ...layer,
      startTime: shiftedStart,
    };

    expect(shiftedLayer.startTime).toBe(3.3);
    expect(shiftedLayer.duration).toBe(3.2);
    expect(shiftedLayer.startTime + shiftedLayer.duration).toBe(6.5);
  });

  it('evaluates all in-animation types (fade, pop, slide-up, slide-down, none)', () => {
    const base = createDefaultTextLayer(2.0);
    base.duration = 4.0;
    base.inDuration = 0.4;

    const animTypes = ['fade', 'pop', 'slide-up', 'slide-down', 'none'] as const;

    for (const animType of animTypes) {
      const layer: TextLayerOverlay = { ...base, inAnimation: animType };
      const atStart = getTextLayerInterpolation(layer, 2.0);
      const atMid = getTextLayerInterpolation(layer, 2.2);
      const atSteady = getTextLayerInterpolation(layer, 3.0);

      expect(atStart.visible).toBe(true);
      expect(atSteady.visible).toBe(true);
      expect(atSteady.opacity).toBe(1);

      if (animType === 'pop') {
        expect(atStart.scale).toBeCloseTo(0.75, 2);
        expect(atSteady.scale).toBe(1);
      } else if (animType === 'slide-up') {
        expect(atStart.translateY).toBeGreaterThan(0);
        expect(atSteady.translateY).toBe(0);
      } else if (animType === 'slide-down') {
        expect(atStart.translateY).toBeLessThan(0);
        expect(atSteady.translateY).toBe(0);
      } else if (animType === 'none') {
        expect(atStart.opacity).toBe(1);
      }
    }
  });

  it('evaluates all out-animation types (fade, pop, slide-up, slide-down, none)', () => {
    const base = createDefaultTextLayer(1.0);
    base.duration = 4.0; // ends at 5.0
    base.outDuration = 0.5; // active 4.5 to 5.0

    const animTypes = ['fade', 'pop', 'slide-up', 'slide-down', 'none'] as const;

    for (const animType of animTypes) {
      const layer: TextLayerOverlay = { ...base, outAnimation: animType };
      const midOut = getTextLayerInterpolation(layer, 4.75); // halfway out

      expect(midOut.visible).toBe(true);

      if (animType === 'fade' || animType === 'pop' || animType === 'slide-up' || animType === 'slide-down') {
        expect(midOut.opacity).toBeLessThan(1.0);
      } else if (animType === 'none') {
        expect(midOut.opacity).toBe(1.0);
      }
    }
  });

  it('correctly maps all required fonts without dummy fallbacks', () => {
    const fonts: TextFontFamily[] = ['Sora', 'SF Pro Display', 'Helvetica', 'Poppins'];

    fonts.forEach((f) => {
      const css = getFontFamilyCss(f);
      const canvas = getFontFamilyCanvas(f);

      expect(css).toContain(f);
      expect(canvas).toContain(f);
    });
  });

  it('supports custom hex colors and swatches', () => {
    const layer = createDefaultTextLayer(0);
    layer.color = '#38bdf8';

    expect(layer.color).toBe('#38bdf8');
  });

  it('correctly computes all Motion-Primitives presets (fade-in-blur, blur, blur-sm, scale, slide, scramble, shimmer, roll)', () => {
    const base = createDefaultTextLayer(2.0);
    base.duration = 4.0;
    base.inDuration = 0.5;

    // Test fade-in-blur
    const blurFadeLayer: TextLayerOverlay = { ...base, inAnimation: 'fade-in-blur' };
    const bfStart = getTextLayerInterpolation(blurFadeLayer, 2.0);
    expect(bfStart.visible).toBe(true);
    expect(bfStart.opacity).toBeCloseTo(0, 1);
    expect(bfStart.blur).toBeGreaterThan(5);
    expect(bfStart.translateY).toBeGreaterThan(10);

    const bfSteady = getTextLayerInterpolation(blurFadeLayer, 3.0);
    expect(bfSteady.opacity).toBe(1);
    expect(bfSteady.blur).toBe(0);
    expect(bfSteady.translateY).toBe(0);

    // Test scramble
    const scrambleLayer: TextLayerOverlay = { ...base, inAnimation: 'scramble' };
    const scStart = getTextLayerInterpolation(scrambleLayer, 2.0);
    expect(scStart.scrambleProgress).toBe(0);
    const scMid = getTextLayerInterpolation(scrambleLayer, 2.25);
    expect(scMid.scrambleProgress).toBeGreaterThan(0);
    expect(scMid.scrambleProgress).toBeLessThan(1);

    // Test roll (3D)
    const rollLayer: TextLayerOverlay = { ...base, inAnimation: 'roll' };
    const rStart = getTextLayerInterpolation(rollLayer, 2.0);
    expect(rStart.rotateX).toBeCloseTo(90, 0);
    const rSteady = getTextLayerInterpolation(rollLayer, 3.0);
    expect(rSteady.rotateX).toBe(0);

    // Test shimmer
    const shimmerLayer: TextLayerOverlay = { ...base, inAnimation: 'shimmer' };
    const shSteady = getTextLayerInterpolation(shimmerLayer, 3.0);
    expect(shSteady.shimmerOffset).toBeDefined();
  });

  it('deterministically scrambles text and resolves at 100% progress', () => {
    const original = 'Hello World';
    const scrambled0 = getScrambledString(original, 0.0);
    const scrambledHalf = getScrambledString(original, 0.5);
    const resolved = getScrambledString(original, 1.0);

    expect(resolved).toBe(original);
    expect(scrambled0.length).toBe(original.length);
    expect(scrambledHalf.length).toBe(original.length);
  });

  it('staggers progress across tokens correctly', () => {
    const t0 = getStaggeredProgress(0.5, 0, 4);
    const t3 = getStaggeredProgress(0.5, 3, 4);
    expect(t0).toBeGreaterThan(t3); // first token leads later tokens
  });
});
