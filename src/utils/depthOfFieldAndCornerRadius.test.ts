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
    // When rotX > 0 (tilted back), bottom is close to camera (sharp focus), top recedes into depth (blurred).
    // Gradient direction is 0.0deg (bottom to top).
    const mask = getTiltShiftMask(20, 0);
    expect(mask).toContain('linear-gradient(0.0deg');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('generates directional linear-gradient mask when turned in 3D (rotX=0, rotY=25)', () => {
    // When rotY > 0 (turned right), left edge is closer to camera (sharp focus), right edge recedes into depth (blurred).
    // Gradient direction is 90.0deg (left to right).
    const mask = getTiltShiftMask(0, 25);
    expect(mask).toContain('linear-gradient(90.0deg');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('generates directional linear-gradient mask when tilted forward (rotX=-20, rotY=0)', () => {
    // When rotX < 0, top is close to camera, bottom recedes into depth.
    // Gradient direction is 180.0deg (top to bottom).
    const mask = getTiltShiftMask(-20, 0);
    expect(mask).toContain('linear-gradient(180.0deg');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('generates directional linear-gradient mask when turned left (rotX=0, rotY=-25)', () => {
    // When rotY < 0, right is close to camera, left recedes into depth.
    // Gradient direction is 270.0deg (right to left).
    const mask = getTiltShiftMask(0, -25);
    expect(mask).toContain('linear-gradient(270.0deg');
    expect(mask).toContain('transparent');
    expect(mask).toContain('black 100%');
  });

  it('handles combined 3D compound rotations smoothly', () => {
    const mask = getTiltShiftMask(15, -20);
    expect(mask).toContain('linear-gradient');
  });

  it('calculates exact 2D box signed distance function for corner radius clipping', () => {
    // Signed distance function for a 2D rounded box with dimensions (w, h) and radius r:
    const cornerRadius = 16;
    const frameW = 800;
    const frameH = 500;
    const halfW = frameW * 0.5;
    const halfH = frameH * 0.5;

    function sdfBox(px: number, py: number): number {
      const dx = Math.abs(px - halfW) - (halfW - cornerRadius);
      const dy = Math.abs(py - halfH) - (halfH - cornerRadius);
      const len = Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2);
      return len + Math.min(0, Math.max(dx, dy)) - cornerRadius;
    }

    // Inside center: strictly negative distance (inside)
    expect(sdfBox(400, 250)).toBeLessThan(0);

    // Cut off corner point: strictly positive distance (clipped/discarded)
    expect(sdfBox(2, 2)).toBeGreaterThan(0); // (2, 2) is cut off by 16px radius corner!
    expect(sdfBox(16, 16)).toBeLessThan(0); // (16, 16) is safely inside the circle arc

    // Far outside corner (0, 0): strictly positive distance (clipped/discarded)
    expect(sdfBox(0, 0)).toBeGreaterThan(5);
  });
});
