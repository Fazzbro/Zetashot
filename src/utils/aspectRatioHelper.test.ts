import { describe, it, expect } from 'vitest';
import { getMockupDimensions, getAspectRatioCss, getStageDimensions } from './aspectRatioHelper';

describe('aspectRatioHelper', () => {
  it('returns correct dimensions for standard 16:9 aspect ratio', () => {
    const dims = getMockupDimensions('16:9');
    expect(dims.width).toBe(720);
    expect(dims.height).toBe(405);
  });

  it('returns correct dimensions for 4:3 aspect ratio', () => {
    const dims = getMockupDimensions('4:3');
    expect(dims.width).toBe(640);
    expect(dims.height).toBe(480);
  });

  it('returns correct dimensions for 1:1 square aspect ratio', () => {
    const dims = getMockupDimensions('1:1');
    expect(dims.width).toBe(500);
    expect(dims.height).toBe(500);
  });

  it('returns correct dimensions for 9:16 vertical / portrait aspect ratio', () => {
    const dims = getMockupDimensions('9:16');
    expect(dims.width).toBe(340);
    expect(dims.height).toBe(604);
  });

  it('returns correct dimensions for 21:9 ultrawide aspect ratio', () => {
    const dims = getMockupDimensions('21:9');
    expect(dims.width).toBe(800);
    expect(dims.height).toBe(343);
  });

  it('returns default 16:9 for unknown aspect ratio', () => {
    const dims = getMockupDimensions('unknown');
    expect(dims.width).toBe(720);
    expect(dims.height).toBe(405);
  });

  it('generates valid CSS aspect ratio string', () => {
    expect(getAspectRatioCss('16:9')).toBe('16 / 9');
    expect(getAspectRatioCss('4:3')).toBe('4 / 3');
    expect(getAspectRatioCss('1:1')).toBe('1 / 1');
    expect(getAspectRatioCss('9:16')).toBe('9 / 16');
    expect(getAspectRatioCss('21:9')).toBe('21 / 9');
  });

  it('calculates export stage canvas dimensions preserving aspect ratio', () => {
    const export169 = getStageDimensions('16:9', 1920, 1080);
    expect(export169.width).toBe(1920);
    expect(export169.height).toBe(1080);

    const export11 = getStageDimensions('1:1', 1920, 1080);
    expect(export11.width).toBe(1080);
    expect(export11.height).toBe(1080);

    const export916 = getStageDimensions('9:16', 1920, 1080);
    expect(export916.width).toBe(1080);
    expect(export916.height).toBe(1920);
  });
});
