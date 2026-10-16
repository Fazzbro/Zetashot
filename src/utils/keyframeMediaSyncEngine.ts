import { TimelinePositionClip } from '../components/VideoTimeline';
import {
  MediaTimelineClip,
  sequenceClipsContiguously,
  calculateMediaSequenceDuration,
} from '../types/mediaTimeline';
import { Camera3DState } from './camera3D';

/**
 * Calculates the compensated video playback speed multiplier based on natural duration and composed/target duration.
 * Clamped between 0.1x and 8.0x.
 */
export function calculatePlaybackRate(naturalDuration: number, targetDuration: number): number {
  if (!naturalDuration || naturalDuration <= 0 || !targetDuration || targetDuration <= 0) {
    return 1.0;
  }
  const raw = naturalDuration / targetDuration;
  return Math.max(0.1, Math.min(8.0, Number(raw.toFixed(2))));
}

/**
 * Synchronously scales media clips to match a target keyframe duration.
 * Updates clip durations proportionally and assigns compensated playback speed.
 */
export function syncMediaClipsToKeyframeDuration(
  mediaClips: MediaTimelineClip[],
  targetDuration: number,
  naturalVideoDuration?: number
): MediaTimelineClip[] {
  if (!mediaClips || mediaClips.length === 0 || targetDuration <= 0) {
    return mediaClips;
  }

  const clampedTarget = Math.max(0.4, Number(targetDuration.toFixed(2)));

  if (mediaClips.length === 1) {
    const single = mediaClips[0];
    const naturalDur = naturalVideoDuration || single.sourceDuration || single.duration;
    const computedSpeed = calculatePlaybackRate(naturalDur, clampedTarget);
    return [
      {
        ...single,
        startTime: 0,
        duration: clampedTarget,
        speed: computedSpeed,
        sourceDuration: naturalDur,
      },
    ];
  }

  // When multiple media clips exist, we do NOT proportionally distort them.
  // Each clip in a multi-clip sequence preserves its dedicated, independent duration.
  // Rescaling all clips proportionally leads to non-uniform distortion across combos.
  return mediaClips;
}

/**
 * Synchronously scales a keyframe sequence block to match a target media clip duration.
 * Adjusts each sub-clip duration proportionally and shifts downstream clips accordingly.
 */
export function syncKeyframeSequenceToDuration(
  clips: TimelinePositionClip[],
  groupStartIndex: number,
  subCount: number,
  targetDuration: number
): TimelinePositionClip[] {
  if (!clips || clips.length === 0 || groupStartIndex < 0 || subCount <= 0) {
    return clips;
  }

  const clampedTarget = Math.max(subCount * 0.25, Number(targetDuration.toFixed(2)));
  const updated = clips.map((c) => ({ ...c }));
  const initialStart = updated[groupStartIndex]?.startTime ?? 0;

  if (subCount === 1) {
    const oldDur = updated[groupStartIndex].duration || 1.5;
    const delta = clampedTarget - oldDur;
    updated[groupStartIndex].duration = clampedTarget;

    // Shift downstream
    for (let k = groupStartIndex + 1; k < updated.length; k++) {
      updated[k].startTime = Math.max(0, Number((updated[k].startTime + delta).toFixed(2)));
    }
    return updated;
  }

  const subClips = updated.slice(groupStartIndex, groupStartIndex + subCount);
  const origDurs = subClips.map((c) => (typeof c.duration === 'number' ? c.duration : 1.5));
  const sumOrigDur = origDurs.reduce((a, b) => a + b, 0);

  const rawDurs = origDurs.map((d) => {
    if (d === 0) return 0;
    const ratio = sumOrigDur > 0 ? d / sumOrigDur : 1 / subCount;
    return clampedTarget * ratio;
  });

  const newDurs = rawDurs.map((d) => (d === 0 ? 0 : Math.max(0.1, Number(d.toFixed(2)))));
  const currentSum = Number(newDurs.reduce((a, b) => a + b, 0).toFixed(2));
  const drift = Number((clampedTarget - currentSum).toFixed(2));

  if (drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < newDurs.length; i++) {
      if (newDurs[i] > newDurs[maxIdx]) maxIdx = i;
    }
    newDurs[maxIdx] = Math.max(0.1, Number((newDurs[maxIdx] + drift).toFixed(2)));
  }

  const oldTotalSeqDuration = Number(sumOrigDur.toFixed(2));
  const durationDelta = Number((clampedTarget - oldTotalSeqDuration).toFixed(2));

  let accStart = initialStart;
  for (let s = 0; s < subCount; s++) {
    const clipIdx = groupStartIndex + s;
    if (!updated[clipIdx]) continue;
    updated[clipIdx].startTime = Number(accStart.toFixed(2));
    updated[clipIdx].duration = newDurs[s];
    accStart += newDurs[s];
  }

  // Shift downstream clips
  for (let k = groupStartIndex + subCount; k < updated.length; k++) {
    updated[k].startTime = Math.max(0, Number((updated[k].startTime + durationDelta).toFixed(2)));
  }

  return updated;
}

export function getNextKeyframeIndex(clips: TimelinePositionClip[]): number {
  let maxPNum = 0;
  (clips || []).forEach((c) => {
    const match = c.name?.match(/^P(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxPNum) maxPNum = num;
    }
  });
  return maxPNum + 1;
}

/**
 * Generates a fresh 2-keyframe position block for a newly uploaded/added media clip
 * without altering or extending any existing keyframes.
 */
export function generateKeyframesForNewMediaClip(
  prevClips: TimelinePositionClip[],
  clipStartTime: number,
  clipDuration: number,
  defaultCamera: Camera3DState,
  mediaClipId?: string
): TimelinePositionClip[] {
  const nextIdx = getNextKeyframeIndex(prevClips);
  const dur = Math.max(0.5, Number(clipDuration.toFixed(2)));
  const halfDur = Number((dur / 2).toFixed(2));
  const remDur = Number((dur - halfDur).toFixed(2));
  const p1Num = nextIdx;
  const p2Num = nextIdx + 1;
  const p1Name = `P${p1Num < 10 ? '0' + p1Num : p1Num}`;
  const p2Name = `P${p2Num < 10 ? '0' + p2Num : p2Num}`;
  const newBlockId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newClips: TimelinePositionClip[] = [
    {
      id: `clip_${Date.now()}_${p1Name}`,
      name: p1Name,
      startTime: Number(clipStartTime.toFixed(2)),
      duration: halfDur,
      color: 'yellow',
      camera: { ...defaultCamera },
      transition: 'cut',
      blockId: newBlockId,
      mediaClipId,
    },
    {
      id: `clip_${Date.now()}_${p2Name}`,
      name: p2Name,
      startTime: Number((clipStartTime + halfDur).toFixed(2)),
      duration: remDur,
      color: 'yellow',
      camera: { ...defaultCamera },
      transition: 'cut',
      blockId: newBlockId,
      mediaClipId,
    },
  ];

  return [...(prevClips || []), ...newClips];
}

/**
 * Synchronously scales the keyframes corresponding to a specific media clip
 * when that clip's duration is changed, and shifts downstream keyframes accordingly.
 * Keyframes for upstream clips remain completely untouched.
 */
export function syncKeyframesForResizedMediaClip(
  clips: TimelinePositionClip[],
  mediaClips: MediaTimelineClip[],
  resizedClipIdx: number,
  newClipDuration: number
): TimelinePositionClip[] {
  if (!clips || clips.length === 0 || !mediaClips || resizedClipIdx < 0 || resizedClipIdx >= mediaClips.length) {
    return clips;
  }

  // If there is only 1 media clip, scale all keyframes
  if (mediaClips.length === 1) {
    return syncKeyframeSequenceToDuration(clips, 0, clips.length, newClipDuration);
  }

  const targetMediaClip = mediaClips[resizedClipIdx];
  const clipStart = targetMediaClip.startTime;
  const clipOldDuration = targetMediaClip.duration;
  const clipEnd = clipStart + clipOldDuration;

  let groupStartIndex = -1;
  let subCount = 0;

  // 1. If keyframes have mediaClipId, match directly by mediaClipId
  const targetId = targetMediaClip.id;
  const matchedById: number[] = [];
  clips.forEach((c, idx) => {
    if (c.mediaClipId === targetId) {
      matchedById.push(idx);
    }
  });

  if (matchedById.length > 0) {
    groupStartIndex = matchedById[0];
    subCount = matchedById.length;
    return syncKeyframeSequenceToDuration(clips, groupStartIndex, subCount, newClipDuration);
  }

  // 2. Otherwise match by time window
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const isTerminalAnchor = Math.abs(c.startTime - clipEnd) <= 0.05 && c.duration === 0;
    const isWithinClip = c.startTime >= clipStart - 0.05 && c.startTime < clipEnd - 0.05;
    if (isWithinClip || isTerminalAnchor) {
      if (groupStartIndex === -1) {
        groupStartIndex = i;
      }
      subCount++;
    }
  }

  // Fallback: If no keyframe matched by time window, match by proportional index
  if (groupStartIndex === -1 || subCount === 0) {
    const approxPerClip = Math.max(1, Math.floor(clips.length / mediaClips.length));
    groupStartIndex = Math.min(clips.length - 1, resizedClipIdx * approxPerClip);
    subCount = Math.min(clips.length - groupStartIndex, approxPerClip);
  }

  return syncKeyframeSequenceToDuration(clips, groupStartIndex, subCount, newClipDuration);
}



/**
 * Splits keyframes belonging to a media clip when that clip is cut at cutTime.
 * - Keyframes before cutTime retain firstMediaClipId and block_${firstMediaClipId}.
 * - Keyframes after cutTime are assigned secondMediaClipId and block_${secondMediaClipId}.
 * - Any keyframe straddling cutTime is split at cutTime into two contiguous keyframes.
 * - Keyframes belonging to other media clips are preserved unchanged.
 */
export function splitKeyframesAtTime(
  clips: TimelinePositionClip[],
  cutTime: number,
  firstMediaClipId: string,
  secondMediaClipId: string
): TimelinePositionClip[] {
  if (!clips || clips.length === 0) return clips;

  const firstBlockId = `block_${firstMediaClipId}`;
  const secondBlockId = `block_${secondMediaClipId}`;
  const result: TimelinePositionClip[] = [];

  let nextPNum = getNextKeyframeIndex(clips);

  for (const c of clips) {
    // Check if keyframe belongs to target media clip or is in the cut region
    const isTarget = c.mediaClipId === firstMediaClipId || (!c.mediaClipId && c.startTime <= cutTime + 0.05);

    if (!isTarget) {
      result.push(c);
      continue;
    }

    const start = c.startTime;
    const dur = typeof c.duration === 'number' ? c.duration : 1.5;
    const end = Number((start + dur).toFixed(2));

    if (end <= cutTime + 0.001) {
      // Entirely before cut
      result.push({
        ...c,
        mediaClipId: firstMediaClipId,
        blockId: c.blockId || firstBlockId,
      });
    } else if (start >= cutTime - 0.001) {
      // Entirely after cut
      result.push({
        ...c,
        mediaClipId: secondMediaClipId,
        blockId: secondBlockId,
      });
    } else {
      // Straddles cutTime -> split into two contiguous keyframes
      const dur1 = Number((cutTime - start).toFixed(2));
      const dur2 = Number((end - cutTime).toFixed(2));

      const p2Name = `P${nextPNum < 10 ? '0' + nextPNum : nextPNum}`;
      nextPNum++;

      // First half
      result.push({
        ...c,
        duration: dur1,
        mediaClipId: firstMediaClipId,
        blockId: c.blockId || firstBlockId,
      });

      // Second half
      result.push({
        ...c,
        id: `${c.id}_part_${Date.now()}`,
        name: p2Name,
        startTime: Number(cutTime.toFixed(2)),
        duration: dur2,
        mediaClipId: secondMediaClipId,
        blockId: secondBlockId,
        transition: 'cut',
      });
    }
  }

  return result.sort((a, b) => a.startTime - b.startTime);
}

export interface DeleteMediaClipResult {
  updatedClips: TimelinePositionClip[];
  updatedMediaClips: MediaTimelineClip[];
  newTotalDuration: number;
  newMediaDuration: number;
  deletedKeyframeIds: string[];
}

/**
 * Cleanly removes a media clip from the sequence, completely deletes all keyframes
 * attached or lingered to that media clip, and dynamically shifts downstream keyframes
 * and media clips to preserve frame-accurate, contiguous timeline synchronization.
 */
export function deleteMediaClipAndSyncKeyframes(
  clips: TimelinePositionClip[],
  mediaClips: MediaTimelineClip[],
  clipIdToDelete: string,
  defaultCamera?: Camera3DState
): DeleteMediaClipResult {
  if (!mediaClips || mediaClips.length === 0) {
    return {
      updatedClips: clips || [],
      updatedMediaClips: mediaClips || [],
      newTotalDuration: 3.0,
      newMediaDuration: 3.0,
      deletedKeyframeIds: [],
    };
  }

  const targetIndex = mediaClips.findIndex((c) => c.id === clipIdToDelete);
  if (targetIndex === -1) {
    const curDur = calculateMediaSequenceDuration(mediaClips);
    return {
      updatedClips: clips || [],
      updatedMediaClips: mediaClips,
      newTotalDuration: curDur,
      newMediaDuration: curDur,
      deletedKeyframeIds: [],
    };
  }

  const targetClip = mediaClips[targetIndex];
  const targetStartTime = targetClip.startTime;
  const targetDuration = targetClip.duration;
  const targetEndTime = targetStartTime + targetDuration;

  const remainingMediaClips = mediaClips.filter((c) => c.id !== clipIdToDelete);

  // Fallback camera
  const fallbackCam = defaultCamera || {
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    zoom: 0.85,
    panX: 0,
    panY: 0,
    perspective: 1000,
  };

  // If the last remaining media clip was deleted, reset to a healthy default media clip
  if (remainingMediaClips.length === 0) {
    const fallbackMediaClip: MediaTimelineClip = {
      id: 'clip_init',
      mediaId: 'default-screen-image',
      name: 'Codex Dashboard',
      type: 'image',
      url: '/default-codex-image.png',
      startTime: 0,
      duration: 3.0,
    };
    const fallbackKeyframes: TimelinePositionClip[] = [
      {
        id: 'P01',
        name: 'P01',
        startTime: 0,
        duration: 1.5,
        color: 'yellow',
        camera: { ...fallbackCam },
        transition: 'cut',
        blockId: 'block_init',
        mediaClipId: 'clip_init',
      },
      {
        id: 'P02',
        name: 'P02',
        startTime: 1.5,
        duration: 1.5,
        color: 'yellow',
        camera: { ...fallbackCam },
        transition: 'cut',
        blockId: 'block_init',
        mediaClipId: 'clip_init',
      },
    ];
    return {
      updatedClips: fallbackKeyframes,
      updatedMediaClips: [fallbackMediaClip],
      newTotalDuration: 3.0,
      newMediaDuration: 3.0,
      deletedKeyframeIds: (clips || []).map((c) => c.id),
    };
  }

  // Resequence remaining media clips contiguously
  const resequencedMediaClips = sequenceClipsContiguously(remainingMediaClips);
  const newMediaDuration = calculateMediaSequenceDuration(resequencedMediaClips);

  // Filter out keyframes lingering on the deleted clip
  const deletedKeyframeIds: string[] = [];
  const remainingKeyframes: TimelinePositionClip[] = [];

  for (const kf of clips || []) {
    const isDirectlyLinked = kf.mediaClipId === clipIdToDelete;
    const fallsInDeletedWindow =
      !kf.mediaClipId &&
      kf.startTime >= targetStartTime - 0.05 &&
      kf.startTime < targetEndTime - 0.05;

    if (isDirectlyLinked || fallsInDeletedWindow) {
      deletedKeyframeIds.push(kf.id);
    } else {
      remainingKeyframes.push(kf);
    }
  }

  // Shift downstream keyframes left by targetDuration
  let shiftedKeyframes = remainingKeyframes.map((kf) => {
    // If the keyframe was positioned at or after the deleted clip's time range, shift it left
    if (kf.startTime >= targetEndTime - 0.05) {
      return {
        ...kf,
        startTime: Math.max(0, Number((kf.startTime - targetDuration).toFixed(2))),
      };
    }
    return { ...kf };
  });

  // If all keyframes were deleted, generate fresh keyframes for the first remaining clip
  if (shiftedKeyframes.length === 0) {
    const firstClip = resequencedMediaClips[0];
    const dur = firstClip.duration;
    const halfDur = Number((dur / 2).toFixed(2));
    const remDur = Number((dur - halfDur).toFixed(2));
    shiftedKeyframes = [
      {
        id: `clip_${Date.now()}_P01`,
        name: 'P01',
        startTime: 0,
        duration: halfDur,
        color: 'yellow',
        camera: { ...fallbackCam },
        transition: 'cut',
        blockId: `block_${firstClip.id}`,
        mediaClipId: firstClip.id,
      },
      {
        id: `clip_${Date.now()}_P02`,
        name: 'P02',
        startTime: halfDur,
        duration: remDur,
        color: 'yellow',
        camera: { ...fallbackCam },
        transition: 'cut',
        blockId: `block_${firstClip.id}`,
        mediaClipId: firstClip.id,
      },
    ];
  }

  // Sort remaining keyframes contiguously by startTime ascending
  shiftedKeyframes.sort((a, b) => a.startTime - b.startTime);

  // Cleanly re-index keyframe names: P01, P02, P03...
  const reindexedKeyframes = shiftedKeyframes.map((kf, idx) => {
    const num = idx + 1;
    const newName = `P${num < 10 ? '0' + num : num}`;
    return {
      ...kf,
      name: newName,
    };
  });

  return {
    updatedClips: reindexedKeyframes,
    updatedMediaClips: resequencedMediaClips,
    newTotalDuration: newMediaDuration,
    newMediaDuration,
    deletedKeyframeIds,
  };
}

/**
 * Synchronizes text layers after a media clip is deleted:
 * - Drops text layers strictly enclosed inside the deleted clip's time range.
 * - Shifts downstream text layers left by the deleted clip's duration.
 * - Clamps any straddling text layers to the new total duration.
 */
export function syncTextLayersAfterMediaClipDeletion(
  textLayers: any[],
  deletedStart: number,
  deletedDuration: number
): any[] {
  if (!textLayers || textLayers.length === 0) return [];
  const deletedEnd = deletedStart + deletedDuration;
  const result: any[] = [];

  for (const layer of textLayers) {
    const start = layer.startTime ?? 0;
    const dur = layer.duration ?? 3.0;
    const end = start + dur;

    // Completely within deleted segment -> prune
    if (start >= deletedStart - 0.05 && end <= deletedEnd + 0.05) {
      continue;
    }

    // Downstream of deleted segment -> shift left
    if (start >= deletedEnd - 0.05) {
      result.push({
        ...layer,
        startTime: Math.max(0, Number((start - deletedDuration).toFixed(2))),
      });
      continue;
    }

    // Straddles or upstream:
    if (end > deletedStart && end <= deletedEnd) {
      // Ends within deleted segment -> shorten to deletedStart
      const newDur = Math.max(0.5, Number((deletedStart - start).toFixed(2)));
      result.push({
        ...layer,
        duration: newDur,
      });
    } else {
      result.push({ ...layer });
    }
  }

  return result;
}
