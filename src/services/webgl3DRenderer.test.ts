import { describe, it, expect } from 'vitest';
import { WebGL3DRenderer } from './webgl3DRenderer';

describe('WebGL3DRenderer Resilient Context & 2D Fallback Engine', () => {
  it('instantiates cleanly without throwing in environments without native WebGL', () => {
    expect(() => {
      const renderer = new WebGL3DRenderer(960, 540);
      expect(renderer.getCanvas()).toBeDefined();
      expect(renderer.getCanvas().width).toBe(960);
      expect(renderer.getCanvas().height).toBe(540);
      renderer.destroy();
    }).not.toThrow();
  });

  it('renders a source frame without throwing error during export loop', () => {
    const renderer = new WebGL3DRenderer(640, 360);
    const dummySource = document.createElement('canvas');
    dummySource.width = 480;
    dummySource.height = 270;

    const camera = {
      rotX: 18,
      rotY: -24,
      rotZ: 6,
      zoom: 1.25,
      panX: -10,
      panY: 8,
      perspective: 850,
    };

    expect(() => {
      renderer.render(
        dummySource,
        480,
        270,
        camera,
        1.0,
        0.95,
        15.0,
        { x: 0.5, y: 0.5 },
        16
      );
    }).not.toThrow();

    renderer.destroy();
  });

  it('safely handles multiple destroy calls without throwing', () => {
    const renderer = new WebGL3DRenderer(320, 180);
    expect(() => {
      renderer.destroy();
      renderer.destroy();
    }).not.toThrow();
  });
});
