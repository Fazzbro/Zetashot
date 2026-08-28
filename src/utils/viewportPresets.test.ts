import { describe, it, expect } from 'vitest';
import {
  VIEWPORT_PRESETS,
  findPresetByDimensions,
  getPresetsByCategory,
} from './viewportPresets';

describe('viewportPresets', () => {
  it('contains comprehensive desktop, tablet, and mobile presets', () => {
    expect(VIEWPORT_PRESETS.length).toBeGreaterThan(10);
    const desktopPresets = getPresetsByCategory('desktop');
    expect(desktopPresets.length).toBeGreaterThanOrEqual(5);

    const mobilePresets = getPresetsByCategory('mobile');
    expect(mobilePresets.length).toBeGreaterThanOrEqual(4);
  });

  it('finds preset matching width and height', () => {
    const preset = findPresetByDimensions(1920, 1080);
    expect(preset).toBeDefined();
    expect(preset?.id).toBe('desktop-1080p');
    expect(preset?.name).toContain('1920 × 1080');
  });

  it('returns undefined for non-standard custom dimensions', () => {
    const preset = findPresetByDimensions(1234, 567);
    expect(preset).toBeUndefined();
  });
});
