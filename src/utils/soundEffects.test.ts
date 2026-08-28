import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playGearSound, playShutterSound, setSoundEnabled, isSoundEnabled } from './soundEffects';

describe('soundEffects', () => {
  beforeEach(() => {
    setSoundEnabled(true);
  });

  it('can enable and disable sound effects', () => {
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('plays gear sound without throwing error when audio context is unavailable or mock', () => {
    expect(() => playGearSound()).not.toThrow();
    expect(() => playGearSound(0.5)).not.toThrow();
  });

  it('plays shutter sound without throwing error', () => {
    expect(() => playShutterSound()).not.toThrow();
  });
});
