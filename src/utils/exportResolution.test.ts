import { describe, it, expect } from 'vitest';
import {
  calculateExportDimensions,
  generateExportFilename,
  getMimeType,
  ExportFormat,
} from './exportResolution';

describe('exportResolution', () => {
  describe('calculateExportDimensions', () => {
    it('calculates 1x, 2x, 3x, 4x dimensions accurately', () => {
      const base = { width: 1200, height: 800 };
      expect(calculateExportDimensions(base, 1)).toEqual({ width: 1200, height: 800 });
      expect(calculateExportDimensions(base, 2)).toEqual({ width: 2400, height: 1600 });
      expect(calculateExportDimensions(base, 3)).toEqual({ width: 3600, height: 2400 });
      expect(calculateExportDimensions(base, 4)).toEqual({ width: 4800, height: 3200 });
    });

    it('handles custom dimensions override when specified', () => {
      const base = { width: 1200, height: 800 };
      const custom = { width: 1920, height: 1080 };
      expect(calculateExportDimensions(base, 1, custom)).toEqual({ width: 1920, height: 1080 });
      expect(calculateExportDimensions(base, 2, custom)).toEqual({ width: 3840, height: 2160 });
    });
  });

  describe('generateExportFilename', () => {
    it('generates clean timestamped filename with format extension', () => {
      const name = generateExportFilename('My Awesome Page', 'png', 2);
      expect(name).toMatch(/^openshot-my-awesome-page-2x-\d{4}-\d{2}-\d{2}\.png$/);
    });

    it('sanitizes special characters in project title', () => {
      const name = generateExportFilename('Test / Slash & Specials!?', 'webp', 1);
      expect(name).toMatch(/^openshot-test-slash-specials-.*\.webp$/);
    });
  });

  describe('getMimeType', () => {
    it('returns appropriate MIME types', () => {
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('jpeg')).toBe('image/jpeg');
      expect(getMimeType('webp')).toBe('image/webp');
    });
  });
});
