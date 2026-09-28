import { describe, it, expect } from 'vitest';
import { CAMERA_PRESET_ITEMS, buildCameraClipsFromPreset } from './cameraPresets';

describe('cameraPresets', () => {
  it('exposes dedicated SaaS feature spotlight and clean workflow presets', () => {
    const ids = CAMERA_PRESET_ITEMS.map((item) => item.id);
    expect(ids).toContain('saas_feature_spotlight');
    expect(ids).toContain('saas_workflow_walkthrough');
    expect(ids).toContain('linear_clean_elevation');
    expect(ids).toContain('apple_keynote_presentation');
    expect(ids).toContain('feature_comparison_glide');
    expect(ids).toContain('executive_kpi_reveal');
  });

  it('builds saas_feature_spotlight keyframes with near-zero tilt for maximum text legibility', () => {
    const clips = buildCameraClipsFromPreset('saas_feature_spotlight', 4.0);
    expect(clips.length).toBe(4);

    // Beat 1: Context establishing
    expect(clips[0].camera.rotX).toBe(2);
    expect(clips[0].camera.rotY).toBe(0);
    expect(clips[0].camera.rotZ).toBe(0);
    expect(clips[0].camera.zoom).toBe(0.95);

    // Beat 2: Feature deep dive (high zoom, minimal tilt for legibility)
    expect(clips[1].camera.zoom).toBeGreaterThanOrEqual(1.5);
    expect(Math.abs(clips[1].camera.rotX)).toBeLessThanOrEqual(3);
    expect(Math.abs(clips[1].camera.rotY)).toBeLessThanOrEqual(3);
    expect(clips[1].camera.rotZ).toBe(0); // Zero Dutch roll!

    // Beat 3: Feature dwell & micro-glide
    expect(clips[2].camera.zoom).toBeGreaterThanOrEqual(1.5);
    expect(clips[2].camera.rotZ).toBe(0);

    // Beat 4: Upright hero lock
    expect(clips[3].camera.rotX).toBe(0);
    expect(clips[3].camera.rotY).toBe(0);
    expect(clips[3].camera.rotZ).toBe(0);
    expect(clips[3].camera.panX).toBe(0);
    expect(clips[3].camera.panY).toBe(0);
  });

  it('builds saas_workflow_walkthrough with 3 sequential guided steps', () => {
    const clips = buildCameraClipsFromPreset('saas_workflow_walkthrough', 4.0);
    expect(clips.length).toBe(4);

    // Step 1: Sidebar / trigger (panned left)
    expect(clips[0].camera.panX).toBeLessThan(0);
    expect(clips[0].camera.rotZ).toBe(0);

    // Step 2: Main canvas (centered action)
    expect(clips[1].camera.panX).toBe(0);
    expect(clips[1].camera.zoom).toBeGreaterThanOrEqual(1.4);

    // Step 3: Result / output (panned right)
    expect(clips[2].camera.panX).toBeGreaterThan(0);

    // Step 4: Hero lock
    expect(clips[3].camera.rotX).toBe(0);
    expect(clips[3].camera.rotY).toBe(0);
  });

  it('builds apple_keynote_presentation with strictly 0 rotation throughout', () => {
    const clips = buildCameraClipsFromPreset('apple_keynote_presentation', 4.0);
    expect(clips.length).toBe(4);
    clips.forEach((clip) => {
      expect(clip.camera.rotX).toBe(0);
      expect(clip.camera.rotY).toBe(0);
      expect(clip.camera.rotZ).toBe(0);
    });
    // Verifies optical push
    expect(clips[1].camera.zoom).toBeGreaterThan(clips[0].camera.zoom);
  });

  it('defaults to saas_feature_spotlight when an unknown preset is passed', () => {
    const clips = buildCameraClipsFromPreset('unknown_preset_test', 4.0);
    expect(clips.length).toBe(4);
    expect(clips[1].camera.zoom).toBe(1.52);
    expect(clips[1].camera.rotZ).toBe(0);
  });
});
