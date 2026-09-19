import { describe, it, expect } from 'vitest';
import { getBlockTransitionGrid, getBlockTileStates } from './transitionMath';
import { synthesizeTransitionAudioWaveform } from './soundEffects';

describe('blockTransition tests', () => {
  it('generates a valid 10x6 deterministic block grid', () => {
    const grid = getBlockTransitionGrid(10, 6);
    expect(grid).toHaveLength(60);

    // Verify grid dimensions and bounds
    grid.forEach((tile) => {
      expect(tile.col).toBeGreaterThanOrEqual(0);
      expect(tile.col).toBeLessThan(10);
      expect(tile.row).toBeGreaterThanOrEqual(0);
      expect(tile.row).toBeLessThan(6);
      expect(tile.widthPct).toBeCloseTo(10, 2);
      expect(tile.heightPct).toBeCloseTo(100 / 6, 2);
      expect(tile.delay).toBeGreaterThanOrEqual(0);
      expect(tile.delay).toBeLessThanOrEqual(1);
    });

    // Verify that NO tiles contain typography text or text-tag
    const typographyTiles = grid.filter((t) => t.tagText || t.type === 'text-tag');
    expect(typographyTiles).toHaveLength(0);

    // Verify accent tile is properly present without typography text
    const accentTile = grid.find((t) => t.type === 'accent');
    expect(accentTile).toBeDefined();
    expect(accentTile?.tagText).toBeUndefined();
  });

  it('correctly activates and deactivates tiles across transition progress', () => {
    const grid = getBlockTransitionGrid(10, 6);

    // At progress 0: no tiles visible
    const states0 = getBlockTileStates(grid, 0);
    expect(states0.filter((s) => s.visible)).toHaveLength(0);

    // At progress 0.25: some tiles active
    const states25 = getBlockTileStates(grid, 0.25);
    const visibleCount25 = states25.filter((s) => s.visible).length;
    expect(visibleCount25).toBeGreaterThan(0);
    expect(visibleCount25).toBeLessThan(60);

    // At progress 0.5 (peak cut point): high density of tiles covering scene
    const states50 = getBlockTileStates(grid, 0.5);
    const visibleCount50 = states50.filter((s) => s.visible).length;
    expect(visibleCount50).toBeGreaterThanOrEqual(visibleCount25);

    // At progress 1.0: no tiles visible
    const states100 = getBlockTileStates(grid, 1.0);
    expect(states100.filter((s) => s.visible)).toHaveLength(0);
  });

  it('synthesizes non-empty audio waveforms for blocks auto SFX and leaves gradient silent', () => {
    const gradAudio = synthesizeTransitionAudioWaveform('gradient', 44100, 0.5);
    expect(gradAudio.length).toBe(22050);
    const maxGrad = Math.max(...Array.from(gradAudio).map(Math.abs));
    expect(maxGrad).toBe(0);

    const blockAudio = synthesizeTransitionAudioWaveform('blocks', 44100, 0.5);
    expect(blockAudio.length).toBe(22050);
    const maxBlock = Math.max(...Array.from(blockAudio).map(Math.abs));
    expect(maxBlock).toBeGreaterThan(0.05);
  });
});
