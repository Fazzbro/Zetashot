export interface CropRect {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number; // percentage 0..100
  height: number; // percentage 0..100
}

/**
 * Checks if the given crop rect represents an active crop (less than full 100% frame).
 */
export function isCropActive(crop?: CropRect | null): boolean {
  if (!crop) return false;
  return crop.width < 99.9 || crop.height < 99.9 || crop.x > 0.1 || crop.y > 0.1;
}

/**
 * Calculates the exact output container dimensions for a cropped media input.
 * When cropped, dimensions shrink to the cropped area instead of scaling up to full base size.
 */
export function calculateCroppedDimensions(
  baseDims: { width: number; height: number },
  crop?: CropRect | null
): { width: number; height: number } {
  if (!isCropActive(crop)) {
    return {
      width: Math.round(baseDims.width),
      height: Math.round(baseDims.height),
    };
  }
  const c = crop!;
  const clampedW = Math.max(1, Math.min(100, c.width));
  const clampedH = Math.max(1, Math.min(100, c.height));
  return {
    width: Math.round(baseDims.width * (clampedW / 100)),
    height: Math.round(baseDims.height * (clampedH / 100)),
  };
}

/**
 * Calculates the top-left offset translation (px) required to position the full media element
 * inside an overflow-hidden container sized to the cropped dimensions without scaling.
 */
export function calculateMediaCropOffset(
  baseDims: { width: number; height: number },
  crop?: CropRect | null,
  scale: number = 1.0
): { offsetX: number; offsetY: number } {
  if (!isCropActive(crop)) {
    return { offsetX: 0, offsetY: 0 };
  }
  const c = crop!;
  return {
    offsetX: Math.round((c.x / 100) * baseDims.width * scale),
    offsetY: Math.round((c.y / 100) * baseDims.height * scale),
  };
}
