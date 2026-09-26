import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FBX3DRenderer } from './fbx3DRenderer';
import { DEFAULT_MODEL_3D_TRANSFORM } from '../types/model3D';

describe('FBX3DRenderer Textures', () => {
  let renderer: FBX3DRenderer;

  beforeEach(() => {
    renderer = new FBX3DRenderer();
  });

  afterEach(() => {
    renderer.dispose();
  });

  it('initializes with default procedural model and empty texture config', () => {
    expect(renderer).toBeDefined();
    const config = renderer.getTextureConfig();
    expect(config.flipY).toBe(true);
    expect(config.repeatX).toBe(1);
    expect(config.repeatY).toBe(1);
    expect(config.diffuseUrl).toBeUndefined();
  });

  it('renders a canvas without errors using default transforms', () => {
    const canvas = renderer.render(960, 540, DEFAULT_MODEL_3D_TRANSFORM, 0);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(540);
  });

  it('applies a direct diffuse texture to model meshes and updates texture config', () => {
    const testTexture = new THREE.Texture();
    renderer.applyDirectTexture(testTexture, 'diffuse', 'wood_albedo.png');

    const config = renderer.getTextureConfig();
    expect(config.diffuseName).toBe('wood_albedo.png');
    expect(testTexture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(testTexture.flipY).toBe(true);
  });

  it('applies normal and roughness textures correctly', () => {
    const normalTex = new THREE.Texture();
    const roughnessTex = new THREE.Texture();

    renderer.applyDirectTexture(normalTex, 'normal', 'wood_normal.png');
    renderer.applyDirectTexture(roughnessTex, 'roughness', 'wood_roughness.png');

    const config = renderer.getTextureConfig();
    expect(config.normalName).toBe('wood_normal.png');
    expect(config.roughnessName).toBe('wood_roughness.png');
    expect(normalTex.colorSpace).toBe(THREE.NoColorSpace);
  });

  it('updates texture tiling repeat and flipY parameters', () => {
    const testTexture = new THREE.Texture();
    renderer.applyDirectTexture(testTexture, 'diffuse', 'pattern.png');

    renderer.updateTextureConfig({
      flipY: false,
      repeatX: 3,
      repeatY: 3,
    });

    const config = renderer.getTextureConfig();
    expect(config.flipY).toBe(false);
    expect(config.repeatX).toBe(3);
    expect(config.repeatY).toBe(3);
    expect(testTexture.flipY).toBe(false);
    expect(testTexture.repeat.x).toBe(3);
    expect(testTexture.repeat.y).toBe(3);
  });

  it('removes a specific texture map cleanly', () => {
    const testTexture = new THREE.Texture();
    renderer.applyDirectTexture(testTexture, 'diffuse', 'metal.png');
    expect(renderer.getTextureConfig().diffuseName).toBe('metal.png');

    renderer.removeTexture('diffuse');
    const updatedConfig = renderer.getTextureConfig();
    expect(updatedConfig.diffuseName).toBeUndefined();
    expect(updatedConfig.diffuseUrl).toBeUndefined();
  });

  it('clears all textures and resets to default configuration', () => {
    renderer.applyDirectTexture(new THREE.Texture(), 'diffuse', 'diff.png');
    renderer.applyDirectTexture(new THREE.Texture(), 'normal', 'norm.png');
    renderer.clearAllTextures();

    const config = renderer.getTextureConfig();
    expect(config.diffuseName).toBeUndefined();
    expect(config.normalName).toBeUndefined();
    expect(config.repeatX).toBe(1);
  });

  it('applies color tint overrides to materials', () => {
    renderer.applyColorTint('#3b82f6');
    const config = renderer.getTextureConfig();
    expect(config.colorTint).toBe('#3b82f6');
  });

  it('loads texture with fallback in headless test environment without throwing', async () => {
    await expect(
      renderer.loadTexture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'diffuse', 'pixel.png')
    ).resolves.not.toThrow();

    const config = renderer.getTextureConfig();
    expect(config.diffuseName).toBe('pixel.png');
  });
});
