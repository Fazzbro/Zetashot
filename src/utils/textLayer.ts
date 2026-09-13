import { TextLayerOverlay, TextLayerInterpolation, TextFontFamily } from '../types/textLayer';

export function createDefaultTextLayer(startTime: number = 0): TextLayerOverlay {
  return {
    id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: 'Your Heading Here',
    startTime: Math.max(0, Number(startTime.toFixed(2))),
    duration: 3.0,
    x: 50, // center (percentage)
    y: 18, // top-center (percentage)
    fontSize: 48, // px at 1920x1080 stage
    fontFamily: 'SF Pro Display',
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    shadow: false,
    inAnimation: 'pop',
    inDuration: 0.35,
    outAnimation: 'fade',
    outDuration: 0.35,
  };
}

/**
 * Standard smooth cubic hermite easing (smoothstep).
 */
export function smoothStep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Computes live animated properties (opacity, translation, scale) for a text layer at currentTime.
 */
export function getTextLayerInterpolation(
  layer: TextLayerOverlay,
  currentTime: number
): TextLayerInterpolation {
  const { startTime, duration, inAnimation, inDuration = 0.35, outAnimation, outDuration = 0.35 } = layer;
  const endTime = startTime + duration;

  // Not in active time range
  if (currentTime < startTime || currentTime > endTime) {
    return {
      visible: false,
      opacity: 0,
      translateY: 0,
      scale: 1,
    };
  }

  // Clamped in/out duration so they don't exceed half the total duration
  const effectiveInDur = Math.max(0.01, Math.min(inDuration, duration / 2));
  const effectiveOutDur = Math.max(0.01, Math.min(outDuration, duration / 2));

  // 1. In-Animation phase
  if (currentTime < startTime + effectiveInDur) {
    const rawProgress = (currentTime - startTime) / effectiveInDur;
    const progress = smoothStep(rawProgress);

    switch (inAnimation) {
      case 'none':
        return { visible: true, opacity: 1, translateY: 0, scale: 1 };
      case 'fade':
        return { visible: true, opacity: progress, translateY: 0, scale: 1 };
      case 'slide-up':
        return { visible: true, opacity: progress, translateY: (1 - progress) * 28, scale: 1 };
      case 'slide-down':
        return { visible: true, opacity: progress, translateY: -(1 - progress) * 28, scale: 1 };
      case 'pop':
        return { visible: true, opacity: progress, translateY: 0, scale: 0.75 + progress * 0.25 };
      default:
        return { visible: true, opacity: progress, translateY: 0, scale: 1 };
    }
  }

  // 2. Out-Animation phase
  if (currentTime > endTime - effectiveOutDur) {
    const rawRemaining = (endTime - currentTime) / effectiveOutDur; // 1 down to 0
    const progress = smoothStep(rawRemaining);

    switch (outAnimation) {
      case 'none':
        return { visible: true, opacity: 1, translateY: 0, scale: 1 };
      case 'fade':
        return { visible: true, opacity: progress, translateY: 0, scale: 1 };
      case 'slide-up':
        return { visible: true, opacity: progress, translateY: -(1 - progress) * 28, scale: 1 };
      case 'slide-down':
        return { visible: true, opacity: progress, translateY: (1 - progress) * 28, scale: 1 };
      case 'pop':
        return { visible: true, opacity: progress, translateY: 0, scale: 0.75 + progress * 0.25 };
      default:
        return { visible: true, opacity: progress, translateY: 0, scale: 1 };
    }
  }

  // 3. Steady State
  return {
    visible: true,
    opacity: 1,
    translateY: 0,
    scale: 1,
  };
}

/**
 * Returns the CSS font-family stack for standard rendering.
 */
export function getFontFamilyCss(family: TextFontFamily): string {
  switch (family) {
    case 'SF Pro Display':
      return `'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    case 'Helvetica':
      return `'Helvetica', 'Helvetica Neue', Arial, sans-serif`;
    case 'Poppins':
      return `'Poppins', sans-serif`;
    default:
      return `system-ui, -apple-system, sans-serif`;
  }
}

/**
 * Returns font-family name for Canvas 2D ctx.font.
 */
export function getFontFamilyCanvas(family: TextFontFamily): string {
  switch (family) {
    case 'SF Pro Display':
      return `'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif`;
    case 'Helvetica':
      return `'Helvetica', 'Helvetica Neue', Arial, sans-serif`;
    case 'Poppins':
      return `'Poppins', sans-serif`;
    default:
      return `sans-serif`;
  }
}

/**
 * Preloads all custom web fonts into the browser font cache so Canvas and stage render genuine typefaces immediately.
 */
export async function preloadTextFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.allSettled([
      document.fonts.load("400 32px 'SF Pro Display'"),
      document.fonts.load("700 32px 'SF Pro Display'"),
      document.fonts.load("400 32px 'Helvetica'"),
      document.fonts.load("700 32px 'Helvetica'"),
      document.fonts.load("400 32px 'Helvetica Neue'"),
      document.fonts.load("700 32px 'Helvetica Neue'"),
      document.fonts.load("400 32px 'Poppins'"),
      document.fonts.load("700 32px 'Poppins'"),
    ]);
  } catch {}
}

if (typeof window !== 'undefined') {
  preloadTextFonts();
}

/**
 * Draws active text layers onto an HTML5 2D canvas at a specific time.
 */
export function drawTextLayersOnCanvas(
  ctx: CanvasRenderingContext2D,
  layers: TextLayerOverlay[],
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!layers || layers.length === 0) return;

  const scale = canvasWidth / 1920;

  for (const layer of layers) {
    const anim = getTextLayerInterpolation(layer, currentTime);
    if (!anim.visible || anim.opacity <= 0.001) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity));

    const posX = (layer.x / 100) * canvasWidth;
    const posY = (layer.y / 100) * canvasHeight + anim.translateY * scale;

    ctx.translate(posX, posY);
    if (anim.scale !== 1) {
      ctx.scale(anim.scale, anim.scale);
    }

    const fontSizePx = Math.max(12, Math.round(layer.fontSize * scale));
    const fontWeight = layer.fontWeight || '700';
    const fontCanvas = getFontFamilyCanvas(layer.fontFamily);

    ctx.font = `${fontWeight} ${fontSizePx}px ${fontCanvas}`;
    ctx.textAlign = layer.textAlign || 'center';
    ctx.textBaseline = 'middle';

    const lines = layer.text.split('\n');
    const lineHeight = fontSizePx * 1.25;
    const totalTextHeight = lines.length * lineHeight;

    // Drop shadow: only if layer.shadow is explicitly enabled (no shadow by default)
    if (layer.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = Math.round(6 * scale);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(2 * scale);
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Render Text Lines
    ctx.fillStyle = layer.color || '#ffffff';
    const startY = -(totalTextHeight / 2) + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, startY + i * lineHeight);
    }

    ctx.restore();
  }
}
