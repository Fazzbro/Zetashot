import { describe, it, expect } from 'vitest';
import { PRESET_BACKGROUND_IMAGES } from './BackgroundSelectorPill';

describe('BackgroundSelectorPill Presets', () => {
  it('contains the 5 user-provided background image presets', () => {
    expect(PRESET_BACKGROUND_IMAGES).toHaveLength(5);
  });

  it('has valid names, unique ids, and proper public paths for all presets', () => {
    const ids = new Set<string>();
    PRESET_BACKGROUND_IMAGES.forEach((preset) => {
      expect(preset.id).toBeTruthy();
      expect(ids.has(preset.id)).toBe(false);
      ids.add(preset.id);

      expect(preset.name).toBeTruthy();
      expect(preset.url).toMatch(/^\/backgrounds\/bg-[a-z-]+\.(jpg|png)$/);
    });
  });

  it('includes specific expected gallery presets with optimal framing defaults', () => {
    const presetIds = PRESET_BACKGROUND_IMAGES.map((p) => p.id);
    expect(presetIds).toContain('hills');
    expect(presetIds).toContain('sunflowers');
    expect(presetIds).toContain('purple-wave');
    expect(presetIds).toContain('tulips');
    expect(presetIds).toContain('clouds');

    // Sunflowers has floral details along the bottom and should default to bottom alignment
    const sunflowers = PRESET_BACKGROUND_IMAGES.find((p) => p.id === 'sunflowers');
    expect(sunflowers?.position?.y).toBe(100);

    // Other presets default to center
    const hills = PRESET_BACKGROUND_IMAGES.find((p) => p.id === 'hills');
    expect(hills?.position?.y).toBe(50);
  });
});
