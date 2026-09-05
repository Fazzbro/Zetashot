import { ExportOptions, calculateExportDimensions, getMimeType, generateExportFilename } from '../utils/exportResolution';
import { BackgroundConfig } from '../utils/gradientUtils';
import { Camera3DState } from '../utils/camera3D';
import { AspectRatioType, getMockupDimensions, getStageDimensions, calculateObjectFitCover } from '../utils/aspectRatioHelper';
import { WebGL3DRenderer } from './webgl3DRenderer';

export interface CaptureResult {
  blob: Blob;
  dataUrl: string;
  filename: string;
  width: number;
  height: number;
  scale: number;
  format: string;
}

export interface PhotoMockupOptions {
  width?: number;
  height?: number;
  scale?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  background: BackgroundConfig;
  camera: Camera3DState;
  aspectRatio?: AspectRatioType;
  borderRadius?: number;
  blurAmount?: number;
  shadowDepth?: 'none' | 'small' | 'medium' | 'large';
  mediaElement?: HTMLVideoElement | HTMLImageElement | null;
  mediaType?: 'video' | 'image' | 'demo';
  cropRect?: { x: number; y: number; width: number; height: number };
  projectName?: string;
  stageElement?: HTMLElement | null;
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

export class CaptureEngine {
  /**
   * Deterministically captures a high-resolution Photo Mockup via hardware-accelerated WebGL.
   * Free from SVG foreignObject security taint and browser canvas permission issues.
   */
  static async capturePhotoMockup(options: PhotoMockupOptions): Promise<CaptureResult> {
    const stageDims = getStageDimensions(options.aspectRatio || '16:9', 1920, 1080);
    const width = options.width || stageDims.width;
    const height = options.height || stageDims.height;
    const format = options.format || 'png';
    const quality = options.quality || 1.0;
    const projectName = options.projectName || 'photo_mockup';

    // 1. Output Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: options.background.type === 'transparent' });
    if (!ctx) throw new Error('Canvas 2D context not supported');

    // 2. Preload background image if configured
    let bgImgElem: HTMLImageElement | null = null;
    if (options.background.type === 'image' && options.background.imageUrl) {
      bgImgElem = new Image();
      bgImgElem.crossOrigin = 'anonymous';
      bgImgElem.src = options.background.imageUrl;
      await new Promise<void>((resolve) => {
        bgImgElem!.onload = () => resolve();
        bgImgElem!.onerror = () => resolve();
      });
    }

    // 3. WebGL 3D Perspective Renderer
    const webglRenderer = new WebGL3DRenderer(width, height);

    // 4. Offscreen 2D Frame Content Canvas
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

    // 5. Draw Frame Content
    frameCtx.clearRect(0, 0, frameW, frameH);
    frameCtx.save();

    frameCtx.beginPath();
    frameCtx.roundRect(0, 0, frameW, frameH, cornerRadius);
    frameCtx.clip();

    frameCtx.fillStyle = '#0f172a';
    frameCtx.fillRect(0, 0, frameW, frameH);

    const videoElem = (options.mediaElement as HTMLVideoElement) || (document.getElementById('mockup-video-player') as HTMLVideoElement | null);
    const imageElem = (options.mediaElement as HTMLImageElement) || (document.getElementById('mockup-image-player') as HTMLImageElement | null);

    const crop = options.cropRect || { x: 0, y: 0, width: 100, height: 100 };
    const isCropped = crop.width < 100 || crop.height < 100 || crop.x > 0 || crop.y > 0;

    if (videoElem && options.mediaType === 'video' && videoElem.videoWidth > 0) {
      const vidW = videoElem.videoWidth;
      const vidH = videoElem.videoHeight;
      const coords = calculateObjectFitCover(vidW, vidH, frameW, frameH);

      if (isCropped) {
        const cropX = (crop.x / 100) * coords.sw + coords.sx;
        const cropY = (crop.y / 100) * coords.sh + coords.sy;
        const cropW = (crop.width / 100) * coords.sw;
        const cropH = (crop.height / 100) * coords.sh;
        frameCtx.drawImage(videoElem, cropX, cropY, cropW, cropH, 0, 0, frameW, frameH);
      } else {
        frameCtx.drawImage(videoElem, coords.sx, coords.sy, coords.sw, coords.sh, 0, 0, frameW, frameH);
      }
    } else if (imageElem && (options.mediaType === 'image' || options.mediaType === 'demo') && (imageElem.naturalWidth > 0 || imageElem.width > 0)) {
      const imgW = imageElem.naturalWidth || imageElem.width || frameW;
      const imgH = imageElem.naturalHeight || imageElem.height || frameH;
      const coords = calculateObjectFitCover(imgW, imgH, frameW, frameH);

      if (isCropped) {
        const cropX = (crop.x / 100) * coords.sw + coords.sx;
        const cropY = (crop.y / 100) * coords.sh + coords.sy;
        const cropW = (crop.width / 100) * coords.sw;
        const cropH = (crop.height / 100) * coords.sh;
        frameCtx.drawImage(imageElem, cropX, cropY, cropW, cropH, 0, 0, frameW, frameH);
      } else {
        frameCtx.drawImage(imageElem, coords.sx, coords.sy, coords.sw, coords.sh, 0, 0, frameW, frameH);
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

    frameCtx.restore();

    // 6. WebGL 3D Perspective & Depth-of-Field Bokeh Render on GPU
    const focusPoint = options.cropRect
      ? { x: (options.cropRect.x / 100) + (options.cropRect.width / 200), y: (options.cropRect.y / 100) + (options.cropRect.height / 200) }
      : { x: 0.5, y: 0.5 };
    webglRenderer.render(frameCanvas, frameW, frameH, options.camera, baseScale, 1.0, options.blurAmount || 0, focusPoint, cornerRadius);

    // 7. Composite onto Main Canvas
    drawBackground(ctx, options.background || { type: 'solid', color: '#ffffff' }, width, height, bgImgElem);

    // Drop shadow pass: isolated offscreen cast so only the blurred shadow lands on (0,0) without double-drawing the frame
    const shadowDepth = options.shadowDepth || 'medium';
    if (shadowDepth !== 'none') {
      ctx.save();
      const shadowBlur = (shadowDepth === 'small' ? 20 : shadowDepth === 'medium' ? 35 : 55) * (baseScale * 0.8);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = shadowBlur;
      const offX = -options.camera.rotY * 1.5 * baseScale;
      const offY = (25 + options.camera.rotX * 1.5) * baseScale;
      const FAR_OFFSET = 10000;
      ctx.shadowOffsetX = offX + FAR_OFFSET;
      ctx.shadowOffsetY = offY;
      ctx.drawImage(webglRenderer.getCanvas(), -FAR_OFFSET, 0);
      ctx.restore();
    }

    // Main 3D frame pass: single crisp render with zero corner-radius ghosting
    ctx.drawImage(webglRenderer.getCanvas(), 0, 0);

    // 8. Convert to Blob
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob failed'));
        },
        mimeType,
        quality
      );
    });

    let dataUrl = '';
    try {
      dataUrl = canvas.toDataURL(mimeType, quality);
    } catch {
      dataUrl = URL.createObjectURL(blob);
    }

    const cleanName = (projectName || 'photo').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filename = `${cleanName}_mockup.${format}`;

    webglRenderer.destroy();

    return {
      blob,
      dataUrl,
      filename,
      width,
      height,
      scale: 1,
      format,
    };
  }

  /**
   * Renders a DOM element into Canvas (legacy fallback).
   */
  static async captureComposedCanvas(
    sourceElement: HTMLElement,
    options: ExportOptions,
    projectName: string = 'capture'
  ): Promise<CaptureResult> {
    const rect = sourceElement.getBoundingClientRect();
    const width = options.customDimensions?.width || rect.width || 1200;
    const height = options.customDimensions?.height || rect.height || 800;
    const scale = options.scale || 1;

    const exportDims = calculateExportDimensions({ width, height }, scale);
    const canvas = document.createElement('canvas');
    canvas.width = exportDims.width;
    canvas.height = exportDims.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to obtain 2D rendering context');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);

    if (!options.transparent && options.format !== 'png') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    const mimeType = getMimeType(options.format);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob returned null'));
        },
        mimeType,
        options.quality || 0.95
      );
    });

    const dataUrl = canvas.toDataURL(mimeType, options.quality || 0.95);
    const filename = options.filenameTemplate || generateExportFilename(projectName, options.format, scale);

    return {
      blob,
      dataUrl,
      filename,
      width: exportDims.width,
      height: exportDims.height,
      scale,
      format: options.format,
    };
  }

  /**
   * Triggers download of a Blob file in the browser with guaranteed filename, correct MIME type, and extension.
   */
  static downloadFile(blob: Blob, filename: string): void {
    let cleanFilename = filename.trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
    if (!/\.(mp4|webm|png|jpg|jpeg|json)$/i.test(cleanFilename)) {
      const ext = blob.type.includes('mp4')
        ? '.mp4'
        : blob.type.includes('webm')
        ? '.webm'
        : blob.type.includes('json')
        ? '.json'
        : '.png';
      cleanFilename += ext;
    }

    const mimeType =
      blob.type ||
      (cleanFilename.endsWith('.mp4')
        ? 'video/mp4'
        : cleanFilename.endsWith('.webm')
        ? 'video/webm'
        : cleanFilename.endsWith('.json')
        ? 'application/json'
        : 'image/png');

    let fileObj: Blob;
    try {
      fileObj = new File([blob], cleanFilename, { type: mimeType, lastModified: Date.now() });
    } catch {
      fileObj = new Blob([blob], { type: mimeType });
    }

    const url = URL.createObjectURL(fileObj);
    const link = document.createElement('a');
    link.style.position = 'fixed';
    link.style.top = '-9999px';
    link.style.left = '-9999px';
    link.style.width = '1px';
    link.style.height = '1px';
    link.style.opacity = '0';
    link.href = url;
    link.setAttribute('download', cleanFilename);
    link.download = cleanFilename;
    link.rel = 'noopener';
    document.body.appendChild(link);

    try {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch {
      link.click();
    }

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 60000);
  }

  /**
   * Copies an image Blob to the system clipboard.
   */
  static async copyToClipboard(blob: Blob): Promise<boolean> {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        return false;
      }

      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise((res) => { img.onload = res; img.src = url; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b || blob), 'image/png'));
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
      return true;
    } catch (e) {
      console.warn('Clipboard write skipped:', e);
      return false;
    }
  }
}
