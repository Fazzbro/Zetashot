import { describe, it, expect } from 'vitest';
import { getTiltShiftMask } from '../App';

describe('3D Depth-of-Field & Tilt-Shift Blur Engine', () => {
  it('generates flat radial aperture mask for untilted camera (rotX=0, rotY=0)', () => {
    const mask = getTiltShiftMask(0, 0);
    expect(mask).toContain('radial-gradient');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('generates autofocus-aware radial mask when focal center shifts', () => {
    const mask = getTiltShiftMask(0, 0, { x: 0.8, y: 0.2 });
    expect(mask).toContain('radial-gradient');
    expect(mask).toContain('80.0% 20.0%');
  });

  it('generates directional linear-gradient mask when tilted back in 3D (rotX=20, rotY=0)', () => {
    // When rotX > 0 (tilted back), bottom is close to camera (sharp focus), top recedes into depth (blurred)
    const mask = getTiltShiftMask(20, 0);
    expect(mask).toContain('linear-gradient');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('generates directional linear-gradient mask when turned in 3D (rotX=0, rotY=25)', () => {
    // When rotY > 0 (turned left), right edge is closer to camera, left edge recedes into depth
    const mask = getTiltShiftMask(0, 25);
    expect(mask).toContain('linear-gradient');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('handles combined 3D compound rotations smoothly', () => {
    const mask = getTiltShiftMask(15, -20);
    expect(mask).toContain('linear-gradient');
  });
});
