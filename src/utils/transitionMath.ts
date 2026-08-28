import { Camera3DState } from './camera3D';
import { TimelinePositionClip } from '../components/VideoTimeline';

export type TransitionType = 'cut' | 'fade' | 'push' | 'zoom';

export interface TransitionEffectResult {
  camera: Camera3DState;
  opacity: number;
}

/**
 * Calculates transition transforms (Fade, Push, Zoom) for clip enter & sequence exit
 */
export function applyClipTransitions(
  baseCamera: Camera3DState,
  clip: TimelinePositionClip,
  currentTime: number,
  transitionDuration: number = 0.4
): TransitionEffectResult {
  let camera = { ...baseCamera };
  let opacity = 1.0;

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
      }
    }
  }

  return { camera, opacity };
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
