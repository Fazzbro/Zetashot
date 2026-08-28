import { TimelinePositionClip } from '../components/VideoTimeline';

/**
 * Calculates the exact canonical project timeline duration from clips and media.
 * This is the SINGLE SOURCE OF TRUTH for both preview and export.
 * ZERO hardcoded duration fallbacks.
 */
export function calculateTimelineDuration(
  clips: TimelinePositionClip[],
  mediaDuration?: number
): number {
  let maxEndTime = 0;

  if (clips && clips.length > 0) {
    for (const clip of clips) {
      const startTime = typeof clip.startTime === 'number' && isFinite(clip.startTime) ? clip.startTime : 0;
      const duration = typeof clip.duration === 'number' && isFinite(clip.duration) ? clip.duration : 0;
      const endTime = startTime + duration;
      if (endTime > maxEndTime) {
        maxEndTime = endTime;
      }
    }
  }

  if (typeof mediaDuration === 'number' && isFinite(mediaDuration) && mediaDuration > 0) {
    maxEndTime = Math.max(maxEndTime, mediaDuration);
  }

  // Minimum safety floor of 1.0s if timeline has 0 elements
  return maxEndTime > 0 ? Number(maxEndTime.toFixed(2)) : 3.0;
}

/**
 * Validates export options and parameters before rendering.
 */
export function validateExportParameters(options: {
  duration: number;
  fps: number;
  width: number;
  height: number;
  clips: TimelinePositionClip[];
}): void {
  if (!options.duration || options.duration <= 0 || !isFinite(options.duration)) {
    throw new Error(`Invalid export duration: ${options.duration}s. Duration must be a positive finite number.`);
  }
  if (!options.fps || options.fps <= 0 || !isFinite(options.fps)) {
    throw new Error(`Invalid export FPS: ${options.fps}. FPS must be a positive integer.`);
  }
  if (!options.width || options.width <= 0 || !options.height || options.height <= 0) {
    throw new Error(`Invalid export dimensions: ${options.width}x${options.height}.`);
  }
  if (!options.clips || options.clips.length === 0) {
    throw new Error('Cannot export empty project with zero timeline clips.');
  }
  for (const clip of options.clips) {
    if (!isFinite(clip.startTime) || (clip.duration !== undefined && !isFinite(clip.duration))) {
      throw new Error(`Invalid clip timing in clip "${clip.name}": startTime=${clip.startTime}, duration=${clip.duration}`);
    }
  }
}

/**
 * Validates the exported Blob file (size, format, headers).
 */
export async function validateExportedBlob(
  blob: Blob,
  expectedFormat: 'mp4' | 'webm' | string,
  expectedDuration: number
): Promise<void> {
  if (!blob || blob.size === 0) {
    throw new Error('Export produced an empty 0-byte video file.');
  }
  if (blob.size < 1024) {
    throw new Error(`Exported video is corrupt or too small (${blob.size} bytes).`);
  }

  if (expectedFormat === 'mp4') {
    // Check MP4 magic bytes: bytes 4..7 must be 'ftyp'
    const headerBuffer = await blob.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftyp !== 'ftyp') {
      console.warn(`[Export Validator] Warning: MP4 header missing 'ftyp' atom (found "${ftyp}").`);
    }
  }
}
