import { describe, it, expect } from 'vitest';
import {
  BackgroundConfig,
  generateBackgroundCss,
  hexToRgba,
  PRESET_GRADIENTS,
} from './gradientUtils';

describe('gradientUtils', () => {
  describe('hexToRgba', () => {
    it('converts 6-digit hex to rgba', () => {
      expect(hexToRgba('#ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
      expect(hexToRgba('#00ff00', 0.5)).toBe('rgba(0, 255, 0, 0.5)');
      expect(hexToRgba('#0000ff', 0)).toBe('rgba(0, 0, 255, 0)');
    });
  });

  describe('generateBackgroundCss', () => {
    it('generates solid color CSS', () => {
      const config: BackgroundConfig = {
        type: 'solid',
        color: '#1a1a2e',
        opacity: 1,
      };
      expect(generateBackgroundCss(config)).toBe('#1a1a2e');
    });

    it('generates linear gradient CSS', () => {
      const config: BackgroundConfig = {
        type: 'gradient',
        gradientType: 'linear',
        angle: 135,
        stops: [
          { color: '#6366f1', position: 0 },
          { color: '#a855f7', position: 100 },
        ],
        opacity: 1,
      };
      expect(generateBackgroundCss(config)).toBe(
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
      );
    });

    it('generates transparent CSS', () => {
      const config: BackgroundConfig = {
        type: 'transparent',
      };
      expect(generateBackgroundCss(config)).toBe('transparent');
    });
  });

  describe('PRESET_GRADIENTS', () => {
    it('contains curated modern gradient palettes', () => {
      expect(PRESET_GRADIENTS.length).toBeGreaterThan(5);
      expect(PRESET_GRADIENTS[0].name).toBeDefined();
      expect(PRESET_GRADIENTS[0].stops.length).toBeGreaterThanOrEqual(2);
    });
  });
});
