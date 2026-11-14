import type { TimelinePositionClip } from '../components/VideoTimeline';
import type { MediaTimelineClip } from '../types/mediaTimeline';
import type { Camera3DState } from './camera3D';
import type { TextLayerOverlay } from '../types/textLayer';
import type { BackgroundConfig } from './gradientUtils';
import type { AudioTrackItem } from '../types/audioTrack';
import type { InterestRegion } from './interestRegionEngine';
import type { MediaItem } from '../components/MediaLibraryModal';
import type { Model3DTransform, Model3DKeyframe, Model3DTextureConfig } from '../types/model3D';

export interface StudioHistorySnapshot {
  clips: TimelinePositionClip[];
  mediaClips: MediaTimelineClip[];
  camera: Camera3DState;
  textLayers: TextLayerOverlay[];
  background: BackgroundConfig;
  aspectRatio: string;
  shadowDepth: 'none' | 'small' | 'medium' | 'large';
  borderRadius: number;
  blurAmount: number;
  audioTracks: AudioTrackItem[];
  interestRegions: InterestRegion[];
  activeMedia: MediaItem;
  selectedClipId: string;
  selectedMediaClipId: string | null;
  selectedTextLayerId: string | null;
  model3DTransform?: Model3DTransform;
  model3DKeyframes?: Model3DKeyframe[];
  model3DTextures?: Model3DTextureConfig;
}

export const MAX_HISTORY_LIMIT = 5;

export interface HistoryState {
  past: StudioHistorySnapshot[];
  present: StudioHistorySnapshot;
  future: StudioHistorySnapshot[];
}

/**
 * Deep clones a history snapshot.
 */
export function cloneSnapshot(snapshot: StudioHistorySnapshot): StudioHistorySnapshot {
  return JSON.parse(JSON.stringify(snapshot));
}

/**
 * Creates an initial HistoryState.
 */
export function createHistoryState(initialSnapshot: StudioHistorySnapshot): HistoryState {
  return {
    past: [],
    present: cloneSnapshot(initialSnapshot),
    future: [],
  };
}

/**
 * Pushes a new snapshot into history.
 * If the new snapshot is identical to present, returns the existing state unchanged.
 * Trims past history to at most maxLimit (default 5).
 * Clears future redo stack.
 */
export function recordAction(
  history: HistoryState,
  newSnapshot: StudioHistorySnapshot,
  maxLimit: number = MAX_HISTORY_LIMIT
): HistoryState {
  const currentStr = JSON.stringify(history.present);
  const newStr = JSON.stringify(newSnapshot);

  if (currentStr === newStr) {
    return history;
  }

  const nextPast = [...history.past, cloneSnapshot(history.present)];
  const trimmedPast = nextPast.length > maxLimit ? nextPast.slice(nextPast.length - maxLimit) : nextPast;

  return {
    past: trimmedPast,
    present: cloneSnapshot(newSnapshot),
    future: [],
  };
}

/**
 * Undoes the last action up to the last 5 recorded states.
 * Moves present to future and pops from past into present.
 */
export function undoAction(history: HistoryState): { nextState: HistoryState; restoredSnapshot: StudioHistorySnapshot } | null {
  if (history.past.length === 0) {
    return null;
  }

  const newPast = [...history.past];
  const previousSnapshot = newPast.pop()!;
  const newFuture = [cloneSnapshot(history.present), ...history.future];

  const nextState: HistoryState = {
    past: newPast,
    present: cloneSnapshot(previousSnapshot),
    future: newFuture,
  };

  return {
    nextState,
    restoredSnapshot: cloneSnapshot(previousSnapshot),
  };
}

/**
 * Redoes the previously undone action.
 * Moves present to past and shifts from future into present.
 */
export function redoAction(
  history: HistoryState,
  maxLimit: number = MAX_HISTORY_LIMIT
): { nextState: HistoryState; restoredSnapshot: StudioHistorySnapshot } | null {
  if (history.future.length === 0) {
    return null;
  }

  const newFuture = [...history.future];
  const nextSnapshot = newFuture.shift()!;
  const nextPast = [...history.past, cloneSnapshot(history.present)];
  const trimmedPast = nextPast.length > maxLimit ? nextPast.slice(nextPast.length - maxLimit) : nextPast;

  const nextState: HistoryState = {
    past: trimmedPast,
    present: cloneSnapshot(nextSnapshot),
    future: newFuture,
  };

  return {
    nextState,
    restoredSnapshot: cloneSnapshot(nextSnapshot),
  };
}
