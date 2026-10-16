import { Camera3DState } from '../utils/camera3D';
import { BackgroundConfig } from '../utils/gradientUtils';
import { TimelinePositionClip } from '../components/VideoTimeline';
import { getMockupDimensions, getStageDimensions, calculateObjectFitCover } from '../utils/aspectRatioHelper';
import { interpolateCameraSpline } from '../utils/splineInterpolation';
import { WebGL3DRenderer } from './webgl3DRenderer';
import { isCropActive, calculateCroppedDimensions } from '../utils/cropMath';
import {
  encodeFrameSequenceToMP4,
  transcodeWebMToMP4,
  transcodeToSeekableWebM,
  fastMuxAudioVideoMP4,
} from './ffmpegTranscoder';
import {
  calculateTimelineDuration,
  validateExportParameters,
  validateExportedBlob,
} from '../utils/timelineDurationEngine';
import { TextLayerOverlay } from '../types/textLayer';
import { drawTextLayersOnCanvas, preloadTextFonts } from '../utils/textLayer';
import { MediaTimelineClip, getActiveMediaClipAtTime } from '../types/mediaTimeline';
import { getMediaTransitionAtTime, drawBlockTransitionCanvas } from '../utils/transitionMath';
import { AudioTrackItem } from '../types/audioTrack';
import {
  mixAudioTracksToAudioBuffer,
  mixAudioTracksToWavBlob,
  audioBufferToWavBlob,
} from '../utils/audioTrackHelper';
import {
  isWebCodecsSupported,
  isAudioEncoderSupported,
  getSupportedVideoCodec,
  WebCodecsMP4Session,
} from './webcodecsExporter';
import { FBX3DRenderer } from './fbx3DRenderer';
import { interpolateModel3DTransform } from '../utils/model3DInterpolation';
import { DEFAULT_MODEL_3D_TRANSFORM, Model3DTextureConfig } from '../types/model3D';

export interface VideoExportOptions {
  mediaName?: string;
  projectName?: string;
  mediaType: 'image' | 'video' | 'demo' | '3d' | 'blank';
  mediaElement?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null;
  mediaUrl?: string;
  modelTextures?: Model3DTextureConfig;
  mediaClips?: MediaTimelineClip[];
  audioTracks?: AudioTrackItem[];
  audioBlob?: Blob | null;
  audioVolume?: number;
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
  textLayers?: TextLayerOverlay[];
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

export function getCameraAtTime(clips: TimelinePositionClip[], time: number, mediaClips?: MediaTimelineClip[]): Camera3DState {
  return interpolateCameraSpline(clips, time, mediaClips);
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
    const isContain = bg.imageFit === 'contain';
    const scale = bg.imageScale ?? 1.0;
    const posX = (bg.position?.x ?? 50) / 100;
    const posY = (bg.position?.y ?? 50) / 100;

    if (isContain) {
      let dw = width;
      let dh = height;
      if (srcRatio > dstRatio) {
        dh = width / srcRatio;
      } else {
        dw = height * srcRatio;
      }
      dw *= scale;
      dh *= scale;
      const dx = (width - dw) * posX;
      const dy = (height - dh) * posY;
      ctx.drawImage(bgImgElem, 0, 0, bgImgElem.naturalWidth, bgImgElem.naturalHeight, dx, dy, dw, dh);
    } else {
      let sw = bgImgElem.naturalWidth;
      let sh = bgImgElem.naturalHeight;

      if (srcRatio > dstRatio) {
        sw = bgImgElem.naturalHeight * dstRatio;
      } else {
        sh = bgImgElem.naturalWidth / dstRatio;
      }

      const effectiveScale = Math.max(0.2, scale);
      sw = Math.min(bgImgElem.naturalWidth, sw / effectiveScale);
      sh = Math.min(bgImgElem.naturalHeight, sh / effectiveScale);

      const maxSx = Math.max(0, bgImgElem.naturalWidth - sw);
      const maxSy = Math.max(0, bgImgElem.naturalHeight - sh);
      const sx = maxSx * posX;
      const sy = maxSy * posY;

      ctx.drawImage(bgImgElem, sx, sy, sw, sh, 0, 0, width, height);
    }
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
  // Support selectable 24, 30, and 60 FPS
  const fps = options.fps && [24, 30, 60].includes(options.fps)
    ? options.fps
    : (options.fps ? Math.max(24, Math.round(options.fps)) : 30);
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

  // Preload and ensure text fonts are loaded before offscreen canvas rendering
  if (options.textLayers && options.textLayers.length > 0) {
    try {
      await preloadTextFonts(options.textLayers);
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (e) {
      console.warn('[Export Engine] Error preloading text fonts:', e);
    }
  }

  // Preload background images (global and per-clip backgrounds)
  const bgImagesMap = new Map<string, HTMLImageElement>();
  const bgUrlsToPreload = new Set<string>();
  if (options.background?.type === 'image' && options.background.imageUrl) {
    bgUrlsToPreload.add(options.background.imageUrl);
  }
  if (options.mediaClips) {
    for (const c of options.mediaClips) {
      if (c.background?.type === 'image' && c.background.imageUrl) {
        bgUrlsToPreload.add(c.background.imageUrl);
      }
    }
  }
  for (const url of bgUrlsToPreload) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
    bgImagesMap.set(url, img);
  }

  // 3. Composite Output Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context not supported');

  // 4. WebGL 3D Perspective Renderer with zero-crash fallback
  let webglRenderer: WebGL3DRenderer;
  try {
    webglRenderer = new WebGL3DRenderer(width, height);
  } catch (err) {
    console.warn('[Export Engine] WebGL3DRenderer initial creation error, recovering gracefully:', err);
    webglRenderer = new WebGL3DRenderer(width, height);
  }

  // 5. 2D Frame Content Offscreen Canvas with proportional unscaled cropping
  const aspectDims = getMockupDimensions(options.aspectRatio || '16:9');
  const baseScale = height / 540;
  const rawCrop = options.crop || options.cropRect;
  const isCropped = isCropActive(rawCrop);
  const crop = rawCrop || { x: 0, y: 0, width: 100, height: 100 };
  const baseFrameW = Math.round(aspectDims.width * baseScale);
  const baseFrameH = Math.round(aspectDims.height * baseScale);
  const croppedDims = calculateCroppedDimensions(aspectDims, crop);
  const frameW = Math.round(croppedDims.width * baseScale);
  const frameH = Math.round(croppedDims.height * baseScale);
  const cornerRadius = Math.round((options.borderRadius || 20) * baseScale);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = frameW;
  frameCanvas.height = frameH;
  const frameCtx = frameCanvas.getContext('2d');
  if (!frameCtx) throw new Error('Offscreen 2D context not supported');

  // 6. Resolve source DOM element (video or image) and preload multi-clip elements if provided
  const imageElem = (options.mediaElement as HTMLImageElement) || (document.getElementById('mockup-image-player') as HTMLImageElement | null);
  const mediaClipElements = new Map<string, HTMLImageElement | HTMLVideoElement>();

  let fbxRenderer: FBX3DRenderer | null = null;
  const has3DClip = options.mediaType === '3d' || (options.mediaClips && options.mediaClips.some((c) => c.type === '3d'));
  if (has3DClip) {
    fbxRenderer = new FBX3DRenderer();
    const clip3D = options.mediaClips?.find((c) => c.type === '3d');
    const modelUrl = clip3D?.url || options.mediaUrl;
    if (modelUrl && modelUrl !== 'default-3d') {
      try {
        await fbxRenderer.loadFBX(modelUrl);
      } catch (err) {
        console.warn('[videoExportEngine] Failed to load FBX for export:', err);
      }
    }
    const texConfig = clip3D?.modelTextures || options.modelTextures;
    if (texConfig) {
      if (texConfig.diffuseUrl) {
        try {
          await fbxRenderer.loadTexture(texConfig.diffuseUrl, 'diffuse', texConfig.diffuseName, texConfig);
        } catch (err) {
          console.warn('[videoExportEngine] Failed to load diffuse texture for export:', err);
        }
      }
      if (texConfig.normalUrl) {
        try {
          await fbxRenderer.loadTexture(texConfig.normalUrl, 'normal', texConfig.normalName, texConfig);
        } catch (err) {
          console.warn('[videoExportEngine] Failed to load normal texture for export:', err);
        }
      }
      if (texConfig.roughnessUrl) {
        try {
          await fbxRenderer.loadTexture(texConfig.roughnessUrl, 'roughness', texConfig.roughnessName, texConfig);
        } catch (err) {
          console.warn('[videoExportEngine] Failed to load roughness texture for export:', err);
        }
      }
      if (texConfig.colorTint) {
        fbxRenderer.applyColorTint(texConfig.colorTint);
      }
    }
  }

  if (options.mediaClips && options.mediaClips.length > 0) {
    for (const c of options.mediaClips) {
      if (c.type === 'video') {
        const v = document.createElement('video');
        v.crossOrigin = 'anonymous';
        v.src = c.url;
        v.muted = true;
        v.preload = 'auto';
        await new Promise<void>((resolve) => {
          v.onloadeddata = () => resolve();
          v.onerror = () => resolve();
          setTimeout(resolve, 800);
        });
        mediaClipElements.set(c.id, v);
      } else if (c.type === '3d') {
        // Handled via fbxRenderer
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = c.url;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 800);
        });
        mediaClipElements.set(c.id, img);
      }
    }
  }

  // 7. Prepare Audio (Background music, sound effects, transition whoosh/ticks)
  let exportAudioBlob: Blob | null = options.audioBlob || null;
  let exportAudioBuffer: AudioBuffer | null = null;
  const exportAudioVolume = options.audioVolume ?? 1.0;

  const hasTransitions = (options.mediaClips || []).some(
    (c) => c.transition === 'gradient' || c.transition === 'blocks'
  );
  if (!exportAudioBlob && ((options.audioTracks && options.audioTracks.length > 0) || hasTransitions)) {
    try {
      exportAudioBuffer = await mixAudioTracksToAudioBuffer(
        options.audioTracks || [],
        totalDuration,
        options.mediaClips || []
      );
      if (exportAudioBuffer) {
        exportAudioBlob = audioBufferToWavBlob(exportAudioBuffer);
      }
    } catch (err) {
      console.warn('[Export Engine] Audio mixing failed, proceeding with silent audio:', err);
    }
  }

  // 8. Hardware-Accelerated WebCodecs Initialization (MP4 target)
  let webCodecsSession: WebCodecsMP4Session | null = null;
  let webCodecsAudioHandled = false;

  if (targetFormat === 'mp4' && isWebCodecsSupported()) {
    try {
      const supportedCodec = await getSupportedVideoCodec(width, height, fps);
      if (supportedCodec) {
        const audioSupported = exportAudioBuffer ? await isAudioEncoderSupported(exportAudioBuffer.sampleRate) : false;
        webCodecsSession = new WebCodecsMP4Session(
          {
            width,
            height,
            fps,
            audioBuffer: exportAudioBuffer,
          },
          audioSupported,
          supportedCodec
        );
        webCodecsAudioHandled = audioSupported;
        console.log(`[Export Engine] Initialized WebCodecs GPU encoder (codec: ${supportedCodec}, AAC audio: ${audioSupported})`);
      } else {
        console.log('[Export Engine] No compatible WebCodecs H.264 profile found on this GPU, using FFmpeg WASM.');
      }
    } catch (wcErr) {
      console.warn('[Export Engine] WebCodecs session init failed, falling back to FFmpeg WASM:', wcErr);
      webCodecsSession = null;
    }
  }

  const frameBlobs: Blob[] = [];

  // 9. Deterministic Frame-by-Frame Rendering Loop
  try {
    const frameDelta = 1 / fps;

    for (let f = 0; f < totalFrames; f++) {
      const time = Math.min(totalDuration, f * frameDelta);
      const mediaTrans = getMediaTransitionAtTime(options.mediaClips || [], time);

      // Determine active media element and type (multi-clip vs single media)
      let activeElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null = null;
      let activeType: 'video' | 'image' | 'demo' | '3d' | 'blank' = options.mediaType;

      if (options.mediaClips && options.mediaClips.length > 0) {
        const currentClip = getActiveMediaClipAtTime(options.mediaClips, time);
        if (currentClip) {
          activeType = currentClip.type;
          activeElement = mediaClipElements.get(currentClip.id) || null;
          if (activeElement && activeType === 'video') {
            const vid = activeElement as HTMLVideoElement;
            const clipSpeed = currentClip.speed || 1.0;
            const localTime = Math.max(0, (time - currentClip.startTime) * clipSpeed + (currentClip.sourceStartTime || 0));
            const safeVidTime = (vid.duration && isFinite(vid.duration) && vid.duration > 0)
              ? Math.min(vid.duration - 0.03, localTime)
              : localTime;
            await seekVideoAccurate(vid, safeVidTime);
          }
        }
      } else {
        activeType = options.mediaType;
        if (activeType === 'video') {
          activeElement = videoElem;
          if (videoElem) {
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
        } else {
          activeElement = imageElem;
        }
      }

      // Canonical camera evaluation matching preview 1:1 with Catmull-Rom continuous trajectory
      const camera = interpolateCameraSpline(options.clips, time, options.mediaClips);

      // --- A. Draw 2D Frame Content (Chassis, Rounded Clip, Media, Blur) ---
      frameCtx.clearRect(0, 0, frameW, frameH);
      frameCtx.save();

      // Rounded rectangle clipping path
      frameCtx.beginPath();
      frameCtx.roundRect(0, 0, frameW, frameH, cornerRadius);
      frameCtx.clip();

      // Background chassis fill
      if (activeType !== '3d') {
        frameCtx.fillStyle = '#0f172a';
        frameCtx.fillRect(0, 0, frameW, frameH);
      }

      // Media rendering with object-fit: cover & cropping
      if (activeElement && activeType === 'video') {
        const vid = activeElement as HTMLVideoElement;
        const vidW = vid.videoWidth || baseFrameW;
        const vidH = vid.videoHeight || baseFrameH;
        const coords = calculateObjectFitCover(vidW, vidH, baseFrameW, baseFrameH);

        if (isCropped) {
          const cropX = (crop.x / 100) * coords.sw + coords.sx;
          const cropY = (crop.y / 100) * coords.sh + coords.sy;
          const cropW = (crop.width / 100) * coords.sw;
          const cropH = (crop.height / 100) * coords.sh;
          frameCtx.drawImage(vid, cropX, cropY, cropW, cropH, 0, 0, frameW, frameH);
        } else {
          frameCtx.drawImage(
            vid,
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
      } else if (activeElement && activeType === 'image') {
        const img = activeElement as HTMLImageElement;
        if (img && img.complete && img.naturalWidth > 0) {
          const imgW = img.naturalWidth;
          const imgH = img.naturalHeight;
          const coords = calculateObjectFitCover(imgW, imgH, baseFrameW, baseFrameH);

          if (isCropped) {
            const cropX = (crop.x / 100) * coords.sw + coords.sx;
            const cropY = (crop.y / 100) * coords.sh + coords.sy;
            const cropW = (crop.width / 100) * coords.sw;
            const cropH = (crop.height / 100) * coords.sh;
            try {
              frameCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, frameW, frameH);
            } catch (e) {
              console.warn('[Export Engine] Non-fatal image crop draw error:', e);
            }
          } else {
            try {
              frameCtx.drawImage(
                img,
                coords.sx,
                coords.sy,
                coords.sw,
                coords.sh,
                0,
                0,
                frameW,
                frameH
              );
            } catch (e) {
              console.warn('[Export Engine] Non-fatal image draw error:', e);
            }
          }
        }
      } else if (activeType === '3d') {
        if (fbxRenderer) {
          const mClip = getActiveMediaClipAtTime(options.mediaClips || [], time);
          const currentTransform = interpolateModel3DTransform(
            mClip?.modelKeyframes,
            time,
            mClip?.modelTransform || DEFAULT_MODEL_3D_TRANSFORM
          );
          const modelCanvas = fbxRenderer.render(frameW, frameH, currentTransform, time);
          frameCtx.drawImage(modelCanvas, 0, 0, frameW, frameH);
        } else {
          const canvasElem = (options.mediaElement as HTMLCanvasElement) || (document.getElementById('mockup-3d-model-canvas') as HTMLCanvasElement | null);
          if (canvasElem && canvasElem.width > 0) {
            frameCtx.drawImage(canvasElem, 0, 0, frameW, frameH);
          }
        }
      } else if (activeType === 'blank') {
        frameCtx.fillStyle = '#090d16';
        frameCtx.fillRect(0, 0, frameW, frameH);
      } else {
        frameCtx.fillStyle = '#0f172a';
        frameCtx.fillRect(0, 0, frameW, frameH);
        frameCtx.fillStyle = '#ffffff';
        frameCtx.font = `bold ${Math.round(28 * baseScale)}px system-ui, sans-serif`;
        frameCtx.textAlign = 'center';
        frameCtx.textBaseline = 'middle';
        frameCtx.fillText('UI Camera Mockup', frameW / 2, frameH / 2);
      }

      const isClipScope = mediaTrans.scope === 'clip';

      // Composite warm radiant gradient flare over media during transition (Clip Scope)
      if (isClipScope && mediaTrans.active && mediaTrans.type === 'gradient' && mediaTrans.intensity > 0.001) {
        frameCtx.save();
        frameCtx.globalCompositeOperation = 'screen';
        const transIntensity = mediaTrans.intensity;

        const radGrad = frameCtx.createRadialGradient(
          frameW * 0.5, frameH * 0.6, 0,
          frameW * 0.5, frameH * 0.6, frameW * 0.75
        );
        radGrad.addColorStop(0, `rgba(255, 200, 80, ${0.95 * transIntensity})`);
        radGrad.addColorStop(0.35, `rgba(255, 125, 45, ${0.9 * transIntensity})`);
        radGrad.addColorStop(0.7, `rgba(255, 65, 80, ${0.75 * transIntensity})`);
        radGrad.addColorStop(1, `rgba(255, 150, 40, ${0.45 * transIntensity})`);
        frameCtx.fillStyle = radGrad;
        frameCtx.fillRect(0, 0, frameW, frameH);

        const linGrad = frameCtx.createLinearGradient(0, 0, frameW, frameH);
        linGrad.addColorStop(0, `rgba(255, 140, 40, ${0.8 * transIntensity})`);
        linGrad.addColorStop(1, `rgba(255, 90, 110, ${0.7 * transIntensity})`);
        frameCtx.fillStyle = linGrad;
        frameCtx.fillRect(0, 0, frameW, frameH);
        frameCtx.restore();
      }

      // Composite block-by-block mosaic grid during blocks transition (Clip Scope)
      if (isClipScope && mediaTrans.active && mediaTrans.type === 'blocks' && mediaTrans.progress > 0 && mediaTrans.progress < 1) {
        drawBlockTransitionCanvas(frameCtx, frameW, frameH, mediaTrans.progress, baseScale);
      }

      // --- High-End SaaS Black Border Frame & Glass Sheen Overlay ---
      // Matches the live preview's .frame-scene:
      // 1) Sleek dark bezel rim with corner radius
      // 2) Crisp 1px inner specular highlight border
      // 3) Inset depth shadow
      // 4) Diagonal physical glass reflection
      if (activeType !== '3d') {
        frameCtx.save();
        
        // Outer chassis border
        frameCtx.beginPath();
        frameCtx.roundRect(0.5, 0.5, frameW - 1, frameH - 1, cornerRadius);
        frameCtx.lineWidth = Math.max(1, Math.round(1.5 * baseScale));
        frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        frameCtx.stroke();

        // Deep dark border rim
        frameCtx.beginPath();
        frameCtx.roundRect(1.5, 1.5, frameW - 3, frameH - 3, Math.max(0, cornerRadius - 1));
        frameCtx.lineWidth = Math.max(1, Math.round(1.0 * baseScale));
        frameCtx.strokeStyle = 'rgba(0, 0, 0, 0.50)';
        frameCtx.stroke();

        // Inset bevel highlight & shadow
        frameCtx.beginPath();
        frameCtx.roundRect(2.5, 2.5, frameW - 5, frameH - 5, Math.max(0, cornerRadius - 2));
        frameCtx.lineWidth = Math.max(1, Math.round(1.0 * baseScale));
        frameCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        frameCtx.stroke();

        // Subtle diagonal glass reflection (matching .frame-scene::after)
        const glassGrad = frameCtx.createLinearGradient(0, 0, frameW, frameH);
        glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
        glassGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.03)');
        glassGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.0)');
        glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
        frameCtx.fillStyle = glassGrad;
        frameCtx.fill();

        frameCtx.restore();
      }

      frameCtx.restore();

      // --- B. Render 3D Perspective & Depth-of-Field Bokeh with WebGL on GPU ---
      const focusPoint = (options.cropRect || options.crop)
        ? { x: ((options.cropRect || options.crop)!.x / 100) + ((options.cropRect || options.crop)!.width / 200), y: ((options.cropRect || options.crop)!.y / 100) + ((options.cropRect || options.crop)!.height / 200) }
        : { x: 0.5, y: 0.5 };
      webglRenderer.render(frameCanvas, frameW, frameH, camera, baseScale, 1.0, options.blurAmount || 0, focusPoint, cornerRadius);

      // --- C. Composite onto Main Export Canvas ---
      const activeClip = options.mediaClips && options.mediaClips.length > 0
        ? getActiveMediaClipAtTime(options.mediaClips, time)
        : null;
      const currentBg = activeClip?.background || options.background || { type: 'solid', color: '#ffffff' };
      const currentBgImg = currentBg.type === 'image' && currentBg.imageUrl
        ? bgImagesMap.get(currentBg.imageUrl) || null
        : null;

      drawBackground(ctx, currentBg, width, height, currentBgImg);

      // Drop shadow and 3D frame passes (Skipped entirely when activeType is 'blank' so only pure background renders)
      if (activeType !== 'blank') {
        if (options.shadowDepth !== 'none') {
          ctx.save();
          const shadowBlur = (options.shadowDepth === 'small' ? 20 : options.shadowDepth === 'medium' ? 35 : 55) * (baseScale * 0.8);
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = shadowBlur;
          const offX = -camera.rotY * 1.5 * baseScale;
          const offY = (25 + camera.rotX * 1.5) * baseScale;
          const FAR_OFFSET = 10000;
          ctx.shadowOffsetX = offX + FAR_OFFSET;
          ctx.shadowOffsetY = offY;
          ctx.drawImage(webglRenderer.getCanvas(), -FAR_OFFSET, 0);
          ctx.restore();
        }

        // Main 3D frame pass: single crisp render with zero corner-radius ghosting
        ctx.drawImage(webglRenderer.getCanvas(), 0, 0);
      }

      const isCanvasScope = (mediaTrans.scope || 'canvas') === 'canvas';

      // Full Canvas Scope Transitions (covers full export canvas including stage and background)
      if (isCanvasScope && mediaTrans.active) {
        if (mediaTrans.type === 'gradient' && mediaTrans.intensity > 0.001) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const linGrad = ctx.createLinearGradient(0, 0, width, height);
          linGrad.addColorStop(0, `rgba(255, 140, 40, ${0.85 * mediaTrans.intensity})`);
          linGrad.addColorStop(0.5, `rgba(255, 235, 160, ${0.95 * mediaTrans.intensity})`);
          linGrad.addColorStop(1, `rgba(255, 90, 110, ${0.75 * mediaTrans.intensity})`);
          ctx.fillStyle = linGrad;
          ctx.fillRect(0, 0, width, height);

          const radGrad = ctx.createRadialGradient(
            width * 0.5, height * 0.5, width * 0.1,
            width * 0.5, height * 0.5, width * 0.7
          );
          radGrad.addColorStop(0, `rgba(255, 255, 255, ${0.75 * mediaTrans.intensity})`);
          radGrad.addColorStop(0.35, `rgba(255, 180, 60, ${0.65 * mediaTrans.intensity})`);
          radGrad.addColorStop(0.7, `rgba(255, 90, 110, ${0.45 * mediaTrans.intensity})`);
          radGrad.addColorStop(1, 'rgba(255, 90, 110, 0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        } else if (mediaTrans.type === 'blocks' && mediaTrans.progress > 0 && mediaTrans.progress < 1) {
          drawBlockTransitionCanvas(ctx, width, height, mediaTrans.progress, baseScale * 1.5);
        }
      } else if (!isCanvasScope && mediaTrans.active && mediaTrans.type === 'gradient' && mediaTrans.intensity > 0.05) {
        // Ambient warm lighting spill around device frame during clip-scoped gradient transition
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const ambientGrad = ctx.createRadialGradient(
          width * 0.5, height * 0.5, width * 0.15,
          width * 0.5, height * 0.5, width * 0.65
        );
        ambientGrad.addColorStop(0, `rgba(255, 130, 40, ${0.35 * mediaTrans.intensity})`);
        ambientGrad.addColorStop(0.6, `rgba(255, 80, 50, ${0.15 * mediaTrans.intensity})`);
        ambientGrad.addColorStop(1, 'rgba(255, 80, 50, 0)');
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // Text Overlays Pass (rendered with in/out animations at current frame sample time)
      if (options.textLayers && options.textLayers.length > 0) {
        drawTextLayersOnCanvas(ctx, options.textLayers, time, width, height);
      }

      if (webCodecsSession) {
        try {
          await webCodecsSession.addFrame(canvas, f);
          if (options.onProgress) {
            options.onProgress(Math.round(((f + 1) / totalFrames) * 90));
          }
        } catch (addFrameErr) {
          console.warn(`[Export Engine] WebCodecs addFrame failed at frame ${f}, falling back to frame collection:`, addFrameErr);
          webCodecsSession.destroy();
          webCodecsSession = null;
          const frameBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
          });
          frameBlobs.push(frameBlob);
        }
      } else {
        // Collect frames for FFmpeg WASM fallback
        const frameBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
        });
        frameBlobs.push(frameBlob);

        // Report progress (Phase 1: 0 - 65%)
        if (options.onProgress) {
          options.onProgress(Math.round(((f + 1) / totalFrames) * 65));
        }
      }
    }
  } finally {
    webglRenderer.destroy();
  }

  // 10. Container Finalization & Encoding
  let finalBlob: Blob | null = null;
  const timestamp = Date.now();
  const sanitizedName = rawMediaName.trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').replace(/\.[^/.]+$/, '');
  let filename = `openshot-${sanitizedName}-${timestamp}.${targetFormat}`;

  if (webCodecsSession) {
    try {
      if (options.onProgress) options.onProgress(92);
      let mp4Blob = await webCodecsSession.finalize();

      // If audio was present but AudioEncoder was not supported natively, fast mux audio with FFmpeg -c:v copy
      if (exportAudioBlob && !webCodecsAudioHandled) {
        if (options.onProgress) options.onProgress(95);
        mp4Blob = await fastMuxAudioVideoMP4(mp4Blob, exportAudioBlob, totalDuration, (p: number) => {
          if (options.onProgress) options.onProgress(95 + Math.round(p * 0.04));
        });
      }

      if (options.onProgress) options.onProgress(99);
      finalBlob = mp4Blob;
      filename = `openshot-${sanitizedName}-${timestamp}.mp4`;
    } catch (wcFinalizeErr) {
      console.warn('[Export Engine] WebCodecs finalize failed, falling back to FFmpeg sequence encoder:', wcFinalizeErr);
      webCodecsSession.destroy();
      webCodecsSession = null;
    }
  }

  // Fallback path: FFmpeg WASM ultra-fast sequence encoding
  if (!finalBlob) {
    if (targetFormat === 'mp4') {
      finalBlob = await encodeFrameSequenceToMP4(
        frameBlobs,
        fps,
        totalDuration,
        (p: number) => {
          if (options.onProgress) options.onProgress(65 + Math.round(p * 0.33));
        },
        exportAudioBlob,
        exportAudioVolume
      );
      filename = `openshot-${sanitizedName}-${timestamp}.mp4`;
    } else {
      // WebM fallback path
      const tempMp4 = await encodeFrameSequenceToMP4(
        frameBlobs,
        fps,
        totalDuration,
        (p: number) => {
          if (options.onProgress) options.onProgress(65 + Math.round(p * 0.25));
        },
        exportAudioBlob,
        exportAudioVolume
      );
      finalBlob = await transcodeToSeekableWebM(tempMp4, totalDuration, (p: number) => {
        if (options.onProgress) options.onProgress(90 + Math.round(p * 0.09));
      });
      filename = `openshot-${sanitizedName}-${timestamp}.webm`;
    }
  }

  // 11. Post-Export Validation Pass
  await validateExportedBlob(finalBlob, targetFormat, totalDuration);

  if (fbxRenderer) {
    try {
      fbxRenderer.dispose();
    } catch {}
  }

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

