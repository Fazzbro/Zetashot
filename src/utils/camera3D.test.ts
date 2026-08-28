import { describe, it, expect } from 'vitest';
import {
  Camera3DState,
  PERSPECTIVE_PRESETS,
  calculate3DTransform,
  clampRotation,
  interpolateCamera3D,
} from './camera3D';

describe('camera3D utilities', () => {
  it('clamps rotation angles to valid limits', () => {
    expect(clampRotation(100, -85, 85)).toBe(85);
    expect(clampRotation(-100, -85, 85)).toBe(-85);
    expect(clampRotation(25, -85, 85)).toBe(25);
  });

  it('calculates CSS 3D transform string accurately', () => {
    const camera: Camera3DState = {
      rotX: 15,
      rotY: -45,
      rotZ: 0,
      zoom: 1.2,
      panX: 0,
      panY: 0,
      perspective: 1000,
    };
    const transform = calculate3DTransform(camera);
    expect(transform).toContain('rotateX(15deg)');
    expect(transform).toContain('rotateY(-45deg)');
    expect(transform).toContain('rotateZ(0deg)');
    expect(transform).toContain('scale(1.2)');
  });

  it('contains standard perspective presets matching ui.camera', () => {
    expect(PERSPECTIVE_PRESETS.length).toBeGreaterThanOrEqual(4);
    const isometric = PERSPECTIVE_PRESETS.find((p) => p.name.toLowerCase().includes('isometric'));
    expect(isometric).toBeDefined();
    expect(isometric?.rotX).toBe(30);
    expect(isometric?.rotY).toBe(45);
  });

  it('interpolates camera position between two 3D camera keyframes', () => {
    const cam1: Camera3DState = { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 };
    const cam2: Camera3DState = { rotX: 20, rotY: 40, rotZ: 10, zoom: 1.5, panX: 100, panY: 50, perspective: 1000 };

    const mid = interpolateCamera3D(cam1, cam2, 0.5);
    expect(mid.rotX).toBeCloseTo(10);
    expect(mid.rotY).toBeCloseTo(20);
    expect(mid.rotZ).toBeCloseTo(5);
    expect(mid.zoom).toBeCloseTo(1.25);
    expect(mid.panX).toBeCloseTo(50);
  });
});
