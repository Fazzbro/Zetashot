import { Camera3DState } from '../utils/camera3D';
import { BackgroundConfig } from '../utils/gradientUtils';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { getMockupDimensions, getStageDimensions, calculateObjectFitCover } from '../utils/aspectRatioHelper';
import { interpolateCameraSpline } from '../utils/splineInterpolation';
import { WebGL3DRenderer } from './webgl3DRenderer';
import {
  encodeFrameSequenceToMP4,
  transcodeWebMToMP4,
  transcodeToSeekableWebM,
} from './ffmpegTranscoder';
import {
  calculateTimelineDuration,
  validateExportParameters,
  validateExportedBlob,
} from '../utils/timelineDurationEngine';

export interface VideoExportOptions {
  mediaName?: string;
  projectName?: string;
  mediaType: 'image' | 'video' | 'demo';
  mediaElement?: HTMLVideoElement | HTMLImageElement | null;
  format?: 'webm' | 'mp4' | string;
  fps?: number;
  width?: number;
  height?: number;
  totalDuration?: number;
  mediaDuration?: number;
  clips: TimelinePositionClip[];
  background: BackgroundConfig;
  aspectRatio: string;
  shadowDepth: 'none' | 'small' | 'medium' | 'large';
  borderRadius: number;
  blurAmount: number;
  crop?: { x: number; y: number; width: number; height: number };
  cropRect?: { x: number; y: number; width: number; height: number };
  onProgress?: (progress: number) => void;
}

export interface VideoExportResult {
  url: string;
  dataUrl?: string;
  blob: Blob;
  format: string;
  duration: number;
  size: number;
  filename: string;
}

export function getCameraAtTime(clips: TimelinePositionClip[], time: number): Camera3DState {
  return interpolateCameraSpline(clips, time);
}

/**
 * Robustly seeks an HTMLVideoElement to targetTime and awaits presentation frame decoding.
 */
async function seekVideoAccurate(video: HTMLVideoElement, targetTime: number): Promise<void> {
  if (Math.abs(video.currentTime - targetTime) < 0.005) {
    return;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(timer);
      resolve();
    };

    const onSeeked = () => {
      if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
        (video as any).requestVideoFrameCallback(() => finish());
      } else {
        finish();
      }
    };

    const timer = setTimeout(finish, 300);
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = targetTime;
  });
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  width: number,
  height: number,
  bgImgElem?: HTMLImageElement | null
) {
  if (bg.type === 'image' && bgImgElem && bgImgElem.complete && bgImgElem.naturalWidth > 0) {
    const srcRatio = bgImgElem.naturalWidth / bgImgElem.naturalHeight;
    const dstRatio = width / height;
    let sw = bgImgElem.naturalWidth;
    let sh = bgImgElem.naturalHeight;
    let sx = 0;
    let sy = 0;

    if (srcRatio > dstRatio) {
      sw = bgImgElem.naturalHeight * dstRatio;
      sx = (bgImgElem.naturalWidth - sw) / 2;
    } else {
      sh = bgImgElem.naturalWidth / dstRatio;
      sy = (bgImgElem.naturalHeight - sh) / 2;
    }
    ctx.drawImage(bgImgElem, sx, sy, sw, sh, 0, 0, width, height);
  } else if ((bg.type as string) === 'solid' || (bg.type as string) === 'color') {
    ctx.fillStyle = (bg as any).color || (bg as any).value || '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if ((bg as any).stops && (bg as any).stops.length > 0) {
      (bg as any).stops.forEach((s: any) => grad.addColorStop(s.position / 100, s.color));
    } else {
      grad.addColorStop(0, (bg as any).color1 || '#1e293b');
      grad.addColorStop(1, (bg as any).color2 || '#0f172a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === 'transparent') {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Silky-smooth 60 FPS deterministic video export engine.
 * Direct frame sequence rendering into FFmpeg for 100% fluid, glitch-free cinematic motion.
 */
export async function exportMockupVideo(options: VideoExportOptions): Promise<VideoExportResult> {
  // Default to 60 FPS for ultra-fluid cinematic playback matching preview
  const fps = Math.max(30, options.fps || 60);
  const stageDims = getStageDimensions(options.aspectRatio || '16:9', 1920, 1080);
  const width = options.width && options.width !== 1920 ? options.width : stageDims.width;
  const height = options.height && options.height !== 1080 ? options.height : stageDims.height;
  const targetFormat = (options.format || 'mp4').toLowerCase();

  const videoElem = (options.mediaElement as HTMLVideoElement) || (document.getElementById('mockup-video-player') as HTMLVideoElement | null);
  const detectedVideoDuration = (options.mediaType === 'video' && videoElem && videoElem.duration && isFinite(videoElem.duration) && videoElem.duration > 0)
    ? Number(videoElem.duration.toFixed(2))
    : undefined;

  // 1. Single Source of Truth for Timeline Duration
  const totalDuration = options.totalDuration && options.totalDuration > 0
    ? options.totalDuration
    : calculateTimelineDuration(options.clips, options.mediaDuration || detectedVideoDuration);

  // 2. Pre-Export Validation
  validateExportParameters({
    duration: totalDuration,
    fps,
    width,
    height,
    clips: options.clips,
  });

  const totalFrames = Math.max(1, Math.round(totalDuration * fps));
  const rawMediaName = options.projectName || options.mediaName || 'mockup';

  console.log(`[Export Engine] Starting 60fps deterministic export: ${totalFrames} frames @ ${fps}fps (${totalDuration}s), format: ${targetFormat}`);

  // Preload background image if any
  let bgImgElem: HTMLImageElement | null = null;
  if (options.background?.type === 'image' && options.background.imageUrl) {
    bgImgElem = new Image();
    bgImgElem.crossOrigin = 'anonymous';
    bgImgElem.src = options.background.imageUrl;
    await new Promise<void>((resolve) => {
      bgImgElem!.onload = () => resolve();
      bgImgElem!.onerror = () => resolve();
    });
  }

  // 3. Composite Output Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context not supported');

  // 4. WebGL 3D Perspective Renderer
  const webglRenderer = new WebGL3DRenderer(width, height);

  // 5. 2D Frame Content Offscreen Canvas
  const aspectDims = getMockupDimensions(options.aspectRatio || '16:9');
  const baseScale = height / 540;
  const frameW = Math.round(aspectDims.width * baseScale);
  const frameH = Math.round(aspectDims.height * baseScale);
  const cornerRadius = Math.round((options.borderRadius || 20) * baseScale);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = frameW;
  frameCanvas.height = frameH;
  const frameCtx = frameCanvas.getContext('2d');
  if (!frameCtx) throw new Error('Offscreen 2D context not supported');

  // 6. Resolve source DOM element (video or image)
  const imageElem = (options.mediaElement as HTMLImageElement) || (document.getElementById('mockup-image-player') as HTMLImageElement | null);

  const rawCrop = options.crop || options.cropRect;
  const isCropped =
    rawCrop &&
    (rawCrop.width < 100 || rawCrop.height < 100 || rawCrop.x > 0 || rawCrop.y > 0);
  const crop = rawCrop || { x: 0, y: 0, width: 100, height: 100 };

  const frameBlobs: Blob[] = [];

  // 7. Deterministic Frame-by-Frame Rendering Loop
  try {
    const frameDelta = 1 / fps;

    for (let f = 0; f < totalFrames; f++) {
      const time = Math.min(totalDuration, f * frameDelta);

      // Sync video media frame with time-warp across mediaDuration
      if (videoElem && options.mediaType === 'video') {
        const naturalVidDuration = (videoElem.duration && isFinite(videoElem.duration) && videoElem.duration > 0)
          ? videoElem.duration
          : (options.mediaDuration || totalDuration);
        const medDuration = (options.mediaDuration && options.mediaDuration > 0) ? options.mediaDuration : totalDuration;
        const progressRatio = medDuration > 0 ? Math.min(1.0, time / medDuration) : 0;
        const targetVidTime = Math.min(
          naturalVidDuration > 0.05 ? naturalVidDuration - 0.03 : naturalVidDuration,
          progressRatio * naturalVidDuration
        );
        await seekVideoAccurate(videoElem, targetVidTime);
      }

      // Canonical camera evaluation matching preview 1:1 with Catmull-Rom continuous trajectory
      const camera = interpolateCameraSpline(options.clips, time);

      // --- A. Draw 2D Frame Content (Chassis, Rounded Clip, Media, Blur) ---
      frameCtx.clearRect(0, 0, frameW, frameH);
      frameCtx.save();

      // Rounded rectangle clipping path
      frameCtx.beginPath();
      frameCtx.roundRect(0, 0, frameW, frameH, cornerRadius);
      frameCtx.clip();

      // Background chassis fill
      frameCtx.fillStyle = '#0f172a';
      frameCtx.fillRect(0, 0, frameW, frameH);

      // Media rendering with object-fit: cover & cropping
      if (videoElem && options.mediaType === 'video') {
        const vidW = videoElem.videoWidth || frameW;
        const vidH = videoElem.videoHeight || frameH;
        const coords = calculateObjectFitCover(vidW, vidH, frameW, frameH);

        if (isCropped) {
          const cropX = (crop.x / 100) * coords.sw + coords.sx;
          const cropY = (crop.y / 100) * coords.sh + coords.sy;
          const cropW = (crop.width / 100) * coords.sw;
          const cropH = (crop.height / 100) * coords.sh;
          frameCtx.drawImage(videoElem, cropX, cropY, cropW, cropH, 0, 0, frameW, frameH);
        } else {
          frameCtx.drawImage(
            videoElem,
            coords.sx,
            coords.sy,
            coords.sw,
            coords.sh,
            0,
            0,
            frameW,
            frameH
          );
        }
      } else if (imageElem && options.mediaType === 'image') {
        const imgW = imageElem.naturalWidth || frameW;
        const imgH = imageElem.naturalHeight || frameH;
        const coords = calculateObjectFitCover(imgW, imgH, frameW, frameH);

        if (isCropped) {
          const cropX = (crop.x / 100) * coords.sw + coords.sx;
          const cropY = (crop.y / 100) * coords.sh + coords.sy;
          const cropW = (crop.width / 100) * coords.sw;
          const cropH = (crop.height / 100) * coords.sh;
          frameCtx.drawImage(imageElem, cropX, cropY, cropW, cropH, 0, 0, frameW, frameH);
        } else {
          frameCtx.drawImage(
            imageElem,
            coords.sx,
            coords.sy,
            coords.sw,
            coords.sh,
            0,
            0,
            frameW,
            frameH
          );
        }
      } else {
        frameCtx.fillStyle = '#0f172a';
        frameCtx.fillRect(0, 0, frameW, frameH);
        frameCtx.fillStyle = '#ffffff';
        frameCtx.font = `bold ${Math.round(28 * baseScale)}px system-ui, sans-serif`;
        frameCtx.textAlign = 'center';
        frameCtx.textBaseline = 'middle';
        frameCtx.fillText('UI Camera Mockup', frameW / 2, frameH / 2);
      }

      // Edge tilt-shift blur
      if (options.blurAmount && options.blurAmount > 0) {
        const grad = frameCtx.createRadialGradient(
          frameW / 2,
          frameH / 2,
          Math.min(frameW, frameH) * 0.25,
          frameW / 2,
          frameH / 2,
          Math.max(frameW, frameH) * 0.55
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(15, 23, 42, ${Math.min(0.85, (options.blurAmount / 30) * 0.7)})`);
        frameCtx.fillStyle = grad;
        frameCtx.fillRect(0, 0, frameW, frameH);
      }

      frameCtx.restore();

      // --- B. Render 3D Perspective with WebGL ---
      webglRenderer.render(frameCanvas, frameW, frameH, camera, baseScale, 1.0);

      // --- C. Composite onto Main Export Canvas ---
      drawBackground(ctx, options.background || { type: 'solid', color: '#ffffff' }, width, height, bgImgElem);

      // Drop shadow pass
      if (options.shadowDepth !== 'none') {
        ctx.save();
        const shadowBlur = (options.shadowDepth === 'small' ? 20 : options.shadowDepth === 'medium' ? 35 : 55) * (baseScale * 0.8);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = -camera.rotY * 1.5 * baseScale;
        ctx.shadowOffsetY = (25 + camera.rotX * 1.5) * baseScale;
        ctx.drawImage(webglRenderer.getCanvas(), 0, 0);
        ctx.restore();
      }

      // Main 3D frame pass
      ctx.drawImage(webglRenderer.getCanvas(), 0, 0);

      // Capture frame Blob with ultra-high fidelity to prevent edge crawling
      const frameBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.98);
      });
      frameBlobs.push(frameBlob);

      // Report progress (Phase 1: 0 - 65%)
      if (options.onProgress) {
        options.onProgress(Math.round(((f + 1) / totalFrames) * 65));
      }
    }
  } finally {
    webglRenderer.destroy();
  }

  // 8. Direct Frame Sequence Encoding via FFmpeg (Zero Jitter, Zero Dropped Frames)
  let finalBlob: Blob;
  let filename: string;
  const timestamp = Date.now();
  const sanitizedName = rawMediaName.trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').replace(/\.[^/.]+$/, '');

  if (targetFormat === 'mp4') {
    if (options.onProgress) options.onProgress(68);
    finalBlob = await encodeFrameSequenceToMP4(frameBlobs, fps, totalDuration, (p: number) => {
      if (options.onProgress) options.onProgress(65 + Math.round(p * 0.33));
    });
    filename = `openshot-${sanitizedName}-${timestamp}.mp4`;
  } else {
    // WebM fallback path
    if (options.onProgress) options.onProgress(68);
    const tempMp4 = await encodeFrameSequenceToMP4(frameBlobs, fps, totalDuration, (p: number) => {
      if (options.onProgress) options.onProgress(65 + Math.round(p * 0.25));
    });
    finalBlob = await transcodeToSeekableWebM(tempMp4, totalDuration, (p: number) => {
      if (options.onProgress) options.onProgress(90 + Math.round(p * 0.1));
    });
    filename = `openshot-${sanitizedName}-${timestamp}.webm`;
  }

  // 9. Post-Export Validation Pass
  await validateExportedBlob(finalBlob, targetFormat, totalDuration);

  const url = URL.createObjectURL(finalBlob);

  return {
    url,
    dataUrl: url,
    blob: finalBlob,
    format: targetFormat,
    duration: totalDuration,
    size: finalBlob.size,
    filename,
  };
}
