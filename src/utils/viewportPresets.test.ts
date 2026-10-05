import { describe, it, expect } from 'vitest';
import {
  VIEWPORT_PRESETS,
  findPresetByDimensions,
  getPresetsByCategory,
  isMobileDeviceViewport,
  getDefaultTimelineDuration,
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

  it('determines mobile device viewport based on <= 768px threshold', () => {
    expect(isMobileDeviceViewport(320)).toBe(true);
    expect(isMobileDeviceViewport(360)).toBe(true);
    expect(isMobileDeviceViewport(390)).toBe(true);
    expect(isMobileDeviceViewport(412)).toBe(true);
    expect(isMobileDeviceViewport(768)).toBe(true);

    expect(isMobileDeviceViewport(769)).toBe(false);
    expect(isMobileDeviceViewport(1024)).toBe(false);
    expect(isMobileDeviceViewport(1440)).toBe(false);
    expect(isMobileDeviceViewport(1920)).toBe(false);
  });

  it('sets default timeline duration to 10s on mobile devices and 12s on desktop', () => {
    // Mobile phones and narrow screens (<= 768px): 10.0 seconds
    expect(getDefaultTimelineDuration(320)).toBe(10.0);
    expect(getDefaultTimelineDuration(360)).toBe(10.0);
    expect(getDefaultTimelineDuration(390)).toBe(10.0);
    expect(getDefaultTimelineDuration(412)).toBe(10.0);
    expect(getDefaultTimelineDuration(768)).toBe(10.0);

    // Desktop and larger displays (> 768px): 12.0 seconds
    expect(getDefaultTimelineDuration(769)).toBe(12.0);
    expect(getDefaultTimelineDuration(1024)).toBe(12.0);
    expect(getDefaultTimelineDuration(1280)).toBe(12.0);
    expect(getDefaultTimelineDuration(1920)).toBe(12.0);
  });
});
