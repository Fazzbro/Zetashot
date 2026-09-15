import { TextLayerOverlay, TextLayerInterpolation, TextFontFamily, TextAnimationType } from '../types/textLayer';
import { initializeSavedCustomFonts } from './customFontHelper';

export function createDefaultTextLayer(startTime: number = 0): TextLayerOverlay {
  return {
    id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: 'Your Heading Here',
    startTime: Math.max(0, Number(startTime.toFixed(2))),
    duration: 3.0,
    x: 50, // center (percentage)
    y: 18, // top-center (percentage)
    fontSize: 48, // px at 1920x1080 stage
    fontFamily: 'Sora',
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 0.95,
    letterSpacing: 0,
    shadow: false,
    inAnimation: 'pop',
    inDuration: 0.35,
    outAnimation: 'fade',
    outDuration: 0.35,
    animationScope: 'word',
  };
}

/**
 * Splits a multi-line text layer into separate independent text layers,
 * preserving individual visual positions and styling without hierarchy constraints.
 */
export function splitTextLayerLines(layer: TextLayerOverlay, stageHeight = 1080): TextLayerOverlay[] {
  const rawLines = layer.text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (rawLines.length <= 1) return [layer];

  const currentLineHeight = layer.lineHeight ?? 0.95;
  const lineSpacingPct = ((layer.fontSize * currentLineHeight) / stageHeight) * 100;
  const midIdx = (rawLines.length - 1) / 2;

  return rawLines.map((lineStr, idx) => ({
    ...layer,
    id: `text_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    text: lineStr,
    y: Math.max(0, Math.min(100, Number((layer.y + (idx - midIdx) * lineSpacingPct).toFixed(1)))),
  }));
}

/**
 * Standard smooth cubic hermite easing (smoothstep).
 */
export function smoothStep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

export const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Deterministically scrambles a string based on progress (0..1) and seed.
 */
export function getScrambledString(text: string, progress: number, seed: number = 42): string {
  if (progress >= 1.0) return text;
  if (progress <= 0.0) {
    return text.replace(/[^\s\n\t]/g, (_, offset) => {
      const idx = Math.abs(seed * 31 + offset * 17) % SCRAMBLE_GLYPHS.length;
      return SCRAMBLE_GLYPHS[idx];
    });
  }

  let result = '';
  const total = text.length;
  for (let i = 0; i < total; i++) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      result += ch;
      continue;
    }
    const charThreshold = (i + 1) / (total + 1);
    if (progress >= charThreshold) {
      result += ch;
    } else {
      const frame = Math.floor(progress * 24);
      const code = Math.abs(seed * 9301 + (i + 1) * 49297 + frame * 233280) % SCRAMBLE_GLYPHS.length;
      result += SCRAMBLE_GLYPHS[code];
    }
  }
  return result;
}

/**
 * Calculates staggered progress for token index out of totalTokens (0..1).
 */
export function getStaggeredProgress(
  overallProgress: number,
  tokenIndex: number,
  totalTokens: number
): number {
  if (totalTokens <= 1) return overallProgress;
  const tokenSpan = 0.55; // each token spends 55% of the total phase animating
  const startWindow = 1.0 - tokenSpan;
  const tokenStart = (tokenIndex / (totalTokens - 1)) * startWindow;
  const tokenEnd = tokenStart + tokenSpan;

  if (overallProgress <= tokenStart) return 0;
  if (overallProgress >= tokenEnd) return 1;
  return smoothStep((overallProgress - tokenStart) / tokenSpan);
}

/**
 * Computes live animated properties for an individual token based on Motion-Primitives presets.
 */
export function getTokenInterpolation(
  animType: TextAnimationType,
  progress: number,
  phase: 'in' | 'out' | 'steady' | 'hidden'
): {
  opacity: number;
  translateY: number;
  scale: number;
  blur: number;
  rotateX: number;
  scrambleProgress: number;
} {
  if (phase === 'steady') {
    return { opacity: 1, translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };
  }
  if (phase === 'hidden') {
    return { opacity: 0, translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 0 };
  }

  const p = progress;
  const isOut = phase === 'out';

  switch (animType) {
    case 'none':
      return { opacity: 1, translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };

    case 'fade':
      return { opacity: p, translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };

    case 'fade-in-blur': {
      const y = isOut ? -(1 - p) * 20 : (1 - p) * 20;
      return { opacity: p, translateY: y, scale: 1, blur: (1 - p) * 12, rotateX: 0, scrambleProgress: 1 };
    }

    case 'blur':
      return { opacity: p, translateY: 0, scale: 1, blur: (1 - p) * 16, rotateX: 0, scrambleProgress: 1 };

    case 'blur-sm':
      return { opacity: p, translateY: 0, scale: 1, blur: (1 - p) * 6, rotateX: 0, scrambleProgress: 1 };

    case 'scale':
      return { opacity: p, translateY: 0, scale: 0.6 + p * 0.4, blur: 0, rotateX: 0, scrambleProgress: 1 };

    case 'slide':
    case 'slide-up': {
      const y = isOut ? -(1 - p) * 28 : (1 - p) * 28;
      return { opacity: p, translateY: y, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };
    }

    case 'slide-down': {
      const y = isOut ? (1 - p) * 28 : -(1 - p) * 28;
      return { opacity: p, translateY: y, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };
    }

    case 'pop':
      return { opacity: p, translateY: 0, scale: 0.75 + p * 0.25, blur: 0, rotateX: 0, scrambleProgress: 1 };

    case 'scramble':
      return { opacity: Math.min(1, p * 1.5), translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: p };

    case 'shimmer':
      return { opacity: p, translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };

    case 'roll': {
      const rot = isOut ? -(1 - p) * 90 : (1 - p) * 90;
      const y = isOut ? -(1 - p) * 16 : (1 - p) * 16;
      return { opacity: p, translateY: y, scale: 1, blur: 0, rotateX: rot, scrambleProgress: 1 };
    }

    default:
      return { opacity: p, translateY: 0, scale: 1, blur: 0, rotateX: 0, scrambleProgress: 1 };
  }
}

/**
 * Computes live animated properties (opacity, translation, scale, blur, rotateX) for a text layer at currentTime.
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
      blur: 0,
      rotateX: 0,
      scrambleProgress: 0,
      phase: 'hidden',
    };
  }

  // Clamped in/out duration so they don't exceed half the total duration
  const effectiveInDur = Math.max(0.01, Math.min(inDuration, duration / 2));
  const effectiveOutDur = Math.max(0.01, Math.min(outDuration, duration / 2));

  // 1. In-Animation phase
  if (currentTime < startTime + effectiveInDur) {
    const rawProgress = (currentTime - startTime) / effectiveInDur;
    const progress = smoothStep(rawProgress);
    const token = getTokenInterpolation(inAnimation, progress, 'in');

    return {
      visible: true,
      opacity: token.opacity,
      translateY: token.translateY,
      scale: token.scale,
      blur: token.blur,
      rotateX: token.rotateX,
      scrambleProgress: token.scrambleProgress,
      shimmerOffset: progress * 100,
      phase: 'in',
    };
  }

  // 2. Out-Animation phase
  if (currentTime > endTime - effectiveOutDur) {
    const rawRemaining = (endTime - currentTime) / effectiveOutDur; // 1 down to 0
    const progress = smoothStep(rawRemaining);
    const token = getTokenInterpolation(outAnimation, progress, 'out');

    return {
      visible: true,
      opacity: token.opacity,
      translateY: token.translateY,
      scale: token.scale,
      blur: token.blur,
      rotateX: token.rotateX,
      scrambleProgress: token.scrambleProgress,
      shimmerOffset: (1 - progress) * 100,
      phase: 'out',
    };
  }

  // 3. Steady State
  const steadyTime = currentTime - startTime;
  return {
    visible: true,
    opacity: 1,
    translateY: 0,
    scale: 1,
    blur: 0,
    rotateX: 0,
    scrambleProgress: 1,
    shimmerOffset: (steadyTime * 60) % 200,
    phase: 'steady',
  };
}

/**
 * Returns the CSS font-family stack for standard rendering.
 */
export function getFontFamilyCss(family: TextFontFamily): string {
  switch (family) {
    case 'Sora':
      return `'Sora', sans-serif`;
    case 'SF Pro Display':
      return `'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    case 'Helvetica':
      return `'Helvetica', 'Helvetica Neue', Arial, sans-serif`;
    case 'Poppins':
      return `'Poppins', sans-serif`;
    default:
      return `'${family}', -apple-system, BlinkMacSystemFont, sans-serif`;
  }
}

/**
 * Returns font-family name for Canvas 2D ctx.font.
 */
export function getFontFamilyCanvas(family: TextFontFamily): string {
  switch (family) {
    case 'Sora':
      return `'Sora', sans-serif`;
    case 'SF Pro Display':
      return `'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif`;
    case 'Helvetica':
      return `'Helvetica', 'Helvetica Neue', Arial, sans-serif`;
    case 'Poppins':
      return `'Poppins', sans-serif`;
    default:
      return `'${family}', sans-serif`;
  }
}

/**
 * Preloads all custom web fonts into the browser font cache so Canvas and stage render genuine typefaces immediately.
 */
export async function preloadTextFonts(layers?: TextLayerOverlay[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    const promises: Promise<any>[] = [
      // Sora (all weights 100 to 800)
      document.fonts.load("100 32px 'Sora'"),
      document.fonts.load("200 32px 'Sora'"),
      document.fonts.load("300 32px 'Sora'"),
      document.fonts.load("400 32px 'Sora'"),
      document.fonts.load("500 32px 'Sora'"),
      document.fonts.load("600 32px 'Sora'"),
      document.fonts.load("700 32px 'Sora'"),
      document.fonts.load("800 32px 'Sora'"),
      // Built-in classics
      document.fonts.load("400 32px 'SF Pro Display'"),
      document.fonts.load("700 32px 'SF Pro Display'"),
      document.fonts.load("400 32px 'Helvetica'"),
      document.fonts.load("700 32px 'Helvetica'"),
      document.fonts.load("400 32px 'Helvetica Neue'"),
      document.fonts.load("700 32px 'Helvetica Neue'"),
      document.fonts.load("400 32px 'Poppins'"),
      document.fonts.load("700 32px 'Poppins'"),
    ];

    if (layers && layers.length > 0) {
      for (const layer of layers) {
        const weight = layer.fontWeight || '700';
        const family = layer.fontFamily || 'Sora';
        promises.push(document.fonts.load(`${weight} 48px '${family}'`));
      }
    }

    await Promise.allSettled(promises);
  } catch {}

  // Restore saved custom uploaded fonts
  try {
    await initializeSavedCustomFonts();
  } catch {}
}

if (typeof window !== 'undefined') {
  preloadTextFonts();
}

/**
 * Draws active text layers onto an HTML5 2D canvas at a specific time with full motion-primitives effects.
 */
export function drawTextLayersOnCanvas(
  ctx: CanvasRenderingContext2D,
  layers: TextLayerOverlay[],
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!layers || layers.length === 0) return;

  // Canonical base scale matching App.tsx stageScale (reference height = 540)
  const scale = canvasHeight / 540;

  for (const layer of layers) {
    const anim = getTextLayerInterpolation(layer, currentTime);
    if (!anim.visible) continue;

    const isAnimating = anim.phase === 'in' || anim.phase === 'out';
    const activeAnimType = anim.phase === 'out' ? layer.outAnimation : layer.inAnimation;
    const scope = layer.animationScope || 'word';

    const fontSizePx = Math.max(12, Math.round(layer.fontSize * scale));
    const fontWeight = layer.fontWeight || '700';
    const fontCanvas = getFontFamilyCanvas(layer.fontFamily);

    ctx.save();

    // Layer-level anchor position
    const posX = (layer.x / 100) * canvasWidth;
    const globalTranslateY = isAnimating && scope === 'all' ? anim.translateY * scale : 0;
    const posY = (layer.y / 100) * canvasHeight + globalTranslateY;

    ctx.translate(posX, posY);

    if (isAnimating && scope === 'all') {
      if (anim.scale !== 1) {
        ctx.scale(anim.scale, anim.scale);
      }
      if (anim.rotateX && Math.abs(anim.rotateX) > 0.1) {
        const rad = (anim.rotateX * Math.PI) / 180;
        ctx.transform(1, 0, 0, Math.max(0.01, Math.cos(rad)), 0, 0);
      }
      if (anim.blur && anim.blur > 0.5 && 'filter' in ctx) {
        try {
          ctx.filter = `blur(${Math.max(1, Math.round(anim.blur * scale))}px)`;
        } catch {}
      }
    }

    ctx.font = `${fontWeight} ${fontSizePx}px ${fontCanvas}`;
    if ('letterSpacing' in ctx && typeof layer.letterSpacing === 'number') {
      try {
        (ctx as unknown as { letterSpacing: string }).letterSpacing = `${layer.letterSpacing * scale}px`;
      } catch {}
    }
    ctx.textBaseline = 'middle';

    const lineMultiplier = layer.lineHeight ?? 0.95;
    const lineHeight = fontSizePx * lineMultiplier;
    const rawLines = layer.text.split('\n');
    const totalTextHeight = rawLines.length * lineHeight;

    // Drop shadow (if enabled)
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

    const baseColor = layer.color || '#000000';
    const align = layer.textAlign || 'center';

    // Stagger phase progress
    const effectiveInDur = Math.max(0.01, Math.min(layer.inDuration || 0.35, layer.duration / 2));
    const effectiveOutDur = Math.max(0.01, Math.min(layer.outDuration || 0.35, layer.duration / 2));
    const phaseProgress = anim.phase === 'in'
      ? Math.max(0, Math.min(1, (currentTime - layer.startTime) / effectiveInDur))
      : anim.phase === 'out'
      ? Math.max(0, Math.min(1, (layer.startTime + layer.duration - currentTime) / effectiveOutDur))
      : 1.0;

    // Total tokens count for staggering
    let totalTokens = 1;
    if (scope === 'char') {
      totalTokens = Math.max(1, layer.text.replace(/\s/g, '').length);
    } else if (scope === 'word') {
      totalTokens = Math.max(1, layer.text.trim().split(/\s+/).filter(Boolean).length);
    } else if (scope === 'line') {
      totalTokens = Math.max(1, rawLines.length);
    }

    // Measure line widths for alignment calculation
    const lineWidths = rawLines.map((l) => ctx.measureText(l).width);
    const maxLineWidth = Math.max(1, ...lineWidths);

    const isShimmer = layer.inAnimation === 'shimmer' || layer.outAnimation === 'shimmer';
    let shimmerGrad: CanvasGradient | null = null;
    if (isShimmer && anim.shimmerOffset !== undefined) {
      try {
        const sweepPos = -maxLineWidth / 2 + maxLineWidth * ((anim.shimmerOffset % 100) / 100);
        const bandWidth = Math.max(40, maxLineWidth * 0.3);
        shimmerGrad = ctx.createLinearGradient(sweepPos - bandWidth, 0, sweepPos + bandWidth, 0);
        shimmerGrad.addColorStop(0, baseColor);
        shimmerGrad.addColorStop(0.5, '#ffffff');
        shimmerGrad.addColorStop(1, baseColor);
      } catch {}
    }

    const startY = -(totalTextHeight / 2) + lineHeight / 2;
    let tokenCounter = 0;

    for (let lIdx = 0; lIdx < rawLines.length; lIdx++) {
      const line = rawLines[lIdx];
      const lineY = startY + lIdx * lineHeight;
      const lineWidth = lineWidths[lIdx];

      let lineStartX = 0;
      if (align === 'center') {
        lineStartX = -lineWidth / 2;
      } else if (align === 'left') {
        lineStartX = -maxLineWidth / 2;
      } else if (align === 'right') {
        lineStartX = maxLineWidth / 2 - lineWidth;
      }

      // Case A: Whole layer animation or steady state
      if (!isAnimating || scope === 'all') {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity));
        ctx.fillStyle = shimmerGrad || baseColor;
        ctx.textAlign = 'left';

        const isScramble = isAnimating && activeAnimType === 'scramble' && anim.scrambleProgress !== undefined && anim.scrambleProgress < 1;
        const lineText = isScramble ? getScrambledString(line, anim.scrambleProgress!) : line;

        ctx.fillText(lineText, lineStartX, lineY);
        ctx.restore();
        continue;
      }

      // Case B: Line-by-line staggered animation
      if (scope === 'line') {
        const lineProg = getStaggeredProgress(phaseProgress, lIdx, totalTokens);
        const tokenAnim = getTokenInterpolation(activeAnimType, lineProg, anim.phase);
        if (tokenAnim.opacity <= 0.001) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, tokenAnim.opacity));
        ctx.fillStyle = shimmerGrad || baseColor;

        const isLineScramble = activeAnimType === 'scramble' && tokenAnim.scrambleProgress < 1;
        const lineText = isLineScramble ? getScrambledString(line, tokenAnim.scrambleProgress, lIdx + 1) : line;

        const centerX = lineStartX + lineWidth / 2;
        const centerY = lineY + tokenAnim.translateY * scale;
        ctx.translate(centerX, centerY);

        if (tokenAnim.scale !== 1) {
          ctx.scale(tokenAnim.scale, tokenAnim.scale);
        }
        if (tokenAnim.rotateX && Math.abs(tokenAnim.rotateX) > 0.1) {
          const rad = (tokenAnim.rotateX * Math.PI) / 180;
          ctx.transform(1, 0, 0, Math.max(0.01, Math.cos(rad)), 0, 0);
        }
        if (tokenAnim.blur && tokenAnim.blur > 0.5 && 'filter' in ctx) {
          try {
            ctx.filter = `blur(${Math.max(1, Math.round(tokenAnim.blur * scale))}px)`;
          } catch {}
        }

        ctx.textAlign = 'center';
        ctx.fillText(lineText, 0, 0);
        ctx.restore();
        continue;
      }

      // Case C: Word or Character granularity
      const rawTokens = scope === 'char'
        ? line.split('')
        : line.split(/(\s+)/);

      let curX = lineStartX;

      for (let t = 0; t < rawTokens.length; t++) {
        const token = rawTokens[t];
        if (!token) continue;

        // Spaces advance without animation
        if (/^\s+$/.test(token)) {
          curX += ctx.measureText(token).width;
          continue;
        }

        const tIdx = tokenCounter++;
        const tokenProg = getStaggeredProgress(phaseProgress, tIdx, totalTokens);
        const tokenAnim = getTokenInterpolation(activeAnimType, tokenProg, anim.phase);

        const isScramble = activeAnimType === 'scramble' && tokenAnim.scrambleProgress < 1;
        const displayText = isScramble ? getScrambledString(token, tokenAnim.scrambleProgress, tIdx + 1) : token;
        const tokenWidth = ctx.measureText(displayText).width;

        if (tokenAnim.opacity > 0.001) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, tokenAnim.opacity));
          ctx.fillStyle = shimmerGrad || baseColor;

          const centerX = curX + tokenWidth / 2;
          const centerY = lineY + tokenAnim.translateY * scale;
          ctx.translate(centerX, centerY);

          if (tokenAnim.scale !== 1) {
            ctx.scale(tokenAnim.scale, tokenAnim.scale);
          }
          if (tokenAnim.rotateX && Math.abs(tokenAnim.rotateX) > 0.1) {
            const rad = (tokenAnim.rotateX * Math.PI) / 180;
            ctx.transform(1, 0, 0, Math.max(0.01, Math.cos(rad)), 0, 0);
          }
          if (tokenAnim.blur && tokenAnim.blur > 0.5 && 'filter' in ctx) {
            try {
              ctx.filter = `blur(${Math.max(1, Math.round(tokenAnim.blur * scale))}px)`;
            } catch {}
          }

          ctx.textAlign = 'center';
          ctx.fillText(displayText, 0, 0);
          ctx.restore();
        }

        curX += tokenWidth;
      }
    }

    ctx.restore();
  }
}
