import { Camera3DState } from './camera3D';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { TransitionType, TransitionScope, MediaTimelineClip } from '../types/mediaTimeline';

export type { TransitionType, TransitionScope };

export interface TransitionEffectResult {
  camera: Camera3DState;
  opacity: number;
  gradientIntensity?: number;
}

export interface MediaTransitionState {
  active: boolean;
  type: TransitionType;
  progress: number;
  intensity: number;
  fromClipId?: string;
  toClipId?: string;
  cutTime: number;
  scope?: TransitionScope;
}

/**
 * Detects whether currentTime is inside a transition window between two adjacent media clips.
 * Returns the active transition type, progress (0 to 1), intensity, and scope ('canvas' | 'clip').
 */
export function getMediaTransitionAtTime(
  clips: MediaTimelineClip[],
  currentTime: number,
  defaultDuration: number = 0.5
): MediaTransitionState {
  if (!clips || clips.length < 2) {
    return { active: false, type: 'cut', progress: 0, intensity: 0, cutTime: 0, scope: 'canvas' };
  }

  for (let i = 1; i < clips.length; i++) {
    const prevClip = clips[i - 1];
    const currentClip = clips[i];
    const trans = currentClip.transition;

    if (!trans || trans === 'cut') continue;

    const cutTime = currentClip.startTime;
    const dur = currentClip.transitionDuration || defaultDuration;
    const halfDur = dur / 2;
    const startTime = cutTime - halfDur;
    const endTime = cutTime + halfDur;

    if (currentTime >= startTime && currentTime <= endTime) {
      const progress = Math.max(0, Math.min(1, (currentTime - startTime) / dur));
      // Symmetric smooth sine bell curve peaking at 1.0 at cutTime (progress = 0.5)
      const intensity = Math.sin(progress * Math.PI);

      return {
        active: true,
        type: trans,
        progress,
        intensity,
        fromClipId: prevClip.id,
        toClipId: currentClip.id,
        cutTime,
        scope: currentClip.transitionScope || 'canvas',
      };
    }
  }

  return { active: false, type: 'cut', progress: 0, intensity: 0, cutTime: 0 };
}

/**
 * Calculates transition transforms (Fade, Push, Zoom, Gradient) for clip enter & sequence exit
 */
export function applyClipTransitions(
  baseCamera: Camera3DState,
  clip: TimelinePositionClip,
  currentTime: number,
  transitionDuration: number = 0.4
): TransitionEffectResult {
  let camera = { ...baseCamera };
  let opacity = 1.0;
  let gradientIntensity = 0;

  const timeInClip = currentTime - clip.startTime;
  const clipDuration = clip.duration || 1.5;

  // 1. Start Transition (Enter Animation)
  if (clip.transition && clip.transition !== 'cut' && timeInClip >= 0 && timeInClip < transitionDuration) {
    const rawT = Math.max(0, Math.min(1, timeInClip / transitionDuration));
    // Smooth step easing
    const t = rawT * rawT * (3 - 2 * rawT);

    switch (clip.transition) {
      case 'fade':
        opacity = t;
        break;
      case 'push':
        camera.panX = camera.panX - (1 - t) * 220;
        break;
      case 'zoom':
        camera.zoom = camera.zoom * (0.35 + 0.65 * t);
        break;
      case 'gradient':
        // Radiant glowing flare on clip enter
        gradientIntensity = Math.max(gradientIntensity, 1 - t);
        break;
    }
  }

  // 2. Sequence Exit Transition (Exit Animation)
  if (clip.exitTransition && clip.exitTransition !== 'cut') {
    const timeUntilEnd = clipDuration - timeInClip;
    if (timeUntilEnd >= 0 && timeUntilEnd < transitionDuration) {
      const rawT = Math.max(0, Math.min(1, timeUntilEnd / transitionDuration));
      const t = rawT * rawT * (3 - 2 * rawT);

      switch (clip.exitTransition) {
        case 'fade':
          opacity = Math.min(opacity, t);
          break;
        case 'push':
          camera.panX = camera.panX + (1 - t) * 220;
          break;
        case 'zoom':
          camera.zoom = camera.zoom * (0.35 + 0.65 * t);
          break;
        case 'gradient':
          // Radiant glowing flare on sequence exit
          gradientIntensity = Math.max(gradientIntensity, 1 - t);
          break;
      }
    }
  }

  return { camera, opacity, gradientIntensity };
}

/**
 * Resize a 2-keyframe sequence set while keeping keyframes proportionally stretched
 */
export function resizeSequenceDuration(
  clips: TimelinePositionClip[],
  sequenceStartIndex: number,
  newSequenceDuration: number
): TimelinePositionClip[] {
  if (sequenceStartIndex < 0 || sequenceStartIndex >= clips.length) return clips;

  const clampedDuration = Math.max(0.6, Math.min(60, newSequenceDuration));
  const c1 = clips[sequenceStartIndex];
  const c2 = clips[sequenceStartIndex + 1];

  if (!c2) {
    // Single clip resize
    return clips.map((c, idx) => (idx === sequenceStartIndex ? { ...c, duration: clampedDuration } : c));
  }

  const oldTotal = (c1.duration || 1.5) + (c2.duration || 1.5);
  const ratio1 = (c1.duration || 1.5) / oldTotal;
  const ratio2 = (c2.duration || 1.5) / oldTotal;

  const newDur1 = Number((clampedDuration * ratio1).toFixed(2));
  const newDur2 = Number((clampedDuration * ratio2).toFixed(2));

  const updated = [...clips];
  updated[sequenceStartIndex] = {
    ...c1,
    duration: newDur1,
  };
  updated[sequenceStartIndex + 1] = {
    ...c2,
    startTime: c1.startTime + newDur1,
    duration: newDur2,
  };

  // Shift any subsequent clips
  let currentStart = updated[sequenceStartIndex + 1].startTime + newDur2;
  for (let i = sequenceStartIndex + 2; i < updated.length; i++) {
    updated[i] = {
      ...updated[i],
      startTime: currentStart,
    };
    currentStart += updated[i].duration || 1.5;
  }

  return updated;
}

export interface BlockTile {
  col: number;
  row: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  type: 'solid-white' | 'glass-light' | 'glass-dark' | 'accent' | 'text-tag';
  tagText?: string;
  delay: number; // 0 to 1
}

export interface BlockTileState {
  tile: BlockTile;
  visible: boolean;
  opacity: number;
}

const cachedBlockGrids = new Map<string, BlockTile[]>();

/**
 * Generates a deterministic grid of blocks for the block-by-block mosaic transition
 * (solid white tiles, frosted translucent blocks, sleek dark blocks, and accent shapes),
 * without any unwanted typography text overlays.
 */
export function getBlockTransitionGrid(cols = 10, rows = 6): BlockTile[] {
  const cacheKey = `${cols}x${rows}`;
  const existing = cachedBlockGrids.get(cacheKey);
  if (existing && existing.length === cols * rows) {
    return existing;
  }

  const grid: BlockTile[] = [];
  const widthPct = 100 / cols;
  const heightPct = 100 / rows;

  const accentCol = Math.min(cols - 1, Math.max(0, Math.floor(cols * 0.15)));
  const accentRow = Math.min(rows - 1, Math.max(0, Math.floor(rows * 0.55)));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hash = (((c * 73 + r * 37 + 19) * 31) % 1000) / 1000;
      const spatial = (c / (cols - 1)) * 0.6 + (r / (rows - 1)) * 0.4;
      const delay = Math.max(0, Math.min(1, 0.65 * spatial + 0.35 * hash));

      let type: BlockTile['type'] = 'glass-light';

      if (c === accentCol && r === accentRow) {
        type = 'accent'; // Subtle pink accent tile
      } else if (hash < 0.42) {
        type = 'solid-white';
      } else if (hash < 0.72) {
        type = 'glass-light';
      } else {
        type = 'glass-dark';
      }

      grid.push({
        col: c,
        row: r,
        xPct: c * widthPct,
        yPct: r * heightPct,
        widthPct,
        heightPct,
        type,
        delay,
      });
    }
  }

  cachedBlockGrids.set(cacheKey, grid);
  return grid;
}

/**
 * Computes the visibility and opacity for every tile in the block grid at the given transition progress (0.0 to 1.0).
 */
export function getBlockTileStates(grid: BlockTile[], progress: number): BlockTileState[] {
  if (progress <= 0 || progress >= 1) {
    return grid.map((tile) => ({ tile, visible: false, opacity: 0 }));
  }

  return grid.map((tile) => {
    if (progress < 0.5) {
      // Enter phase: tiles cascade in and cover the screen
      const t = progress / 0.5; // 0 to 1
      const threshold = tile.delay * 0.75;
      if (t < threshold) {
        return { tile, visible: false, opacity: 0 };
      }
      const localP = Math.min(1, (t - threshold) / 0.25);
      const opacity = Math.sin(localP * Math.PI * 0.5);
      return { tile, visible: opacity > 0.01, opacity };
    } else {
      // Exit phase: tiles cascade out revealing incoming clip
      const t = (progress - 0.5) / 0.5; // 0 to 1
      const threshold = tile.delay * 0.75;
      if (t < threshold) {
        return { tile, visible: true, opacity: 1 };
      }
      const localP = Math.min(1, (t - threshold) / 0.25);
      const opacity = 1 - Math.sin(localP * Math.PI * 0.5);
      return { tile, visible: opacity > 0.01, opacity };
    }
  });
}

/**
 * Renders the block-by-block mosaic grid transition onto any 2D canvas context.
 * Used identically across both live preview stage overlay and offline video export.
 */
export function drawBlockTransitionCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  scale: number = 1.0
): void {
  if (progress <= 0 || progress >= 1) return;

  const cols = width >= height ? 10 : 6;
  const rows = width >= height ? 6 : 10;
  const grid = getBlockTransitionGrid(cols, rows);
  const tileStates = getBlockTileStates(grid, progress);

  for (const s of tileStates) {
    if (!s.visible || s.opacity <= 0.001) continue;
    const tile = s.tile;
    const tx = (tile.xPct / 100) * width;
    const ty = (tile.yPct / 100) * height;
    const tw = (tile.widthPct / 100) * width;
    const th = (tile.heightPct / 100) * height;

    ctx.save();
    ctx.globalAlpha = s.opacity;

    if (tile.type === 'solid-white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
    } else if (tile.type === 'glass-light') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
    } else if (tile.type === 'glass-dark' || tile.type === 'text-tag') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
    } else if (tile.type === 'accent') {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.88)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(tx, ty, tw, th, [0, 16 * scale, 0, 0]);
      } else {
        ctx.rect(tx, ty, tw, th);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
}
