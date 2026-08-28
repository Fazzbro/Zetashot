export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface SnapResult {
  snappedPosition: Point;
  snappedX: boolean;
  snappedY: boolean;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4.0;

/**
 * Clamps zoom factor between 25% (0.25) and 400% (4.0).
 */
export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Calculates new pan position such that the point under the cursor remains unchanged.
 */
export function calculateZoomAroundPoint(
  currentZoom: number,
  newZoom: number,
  cursor: Point,
  pan: Point
): Point {
  const worldX = (cursor.x - pan.x) / currentZoom;
  const worldY = (cursor.y - pan.y) / currentZoom;

  return {
    x: cursor.x - worldX * newZoom,
    y: cursor.y - worldY * newZoom,
  };
}

/**
 * Snaps position to canvas center and edges if within threshold.
 */
export function snapToGuides(
  position: Point,
  objectSize: Size,
  canvasSize: Size,
  threshold: number = 8
): SnapResult {
  const centerX = (canvasSize.width - objectSize.width) / 2;
  const centerY = (canvasSize.height - objectSize.height) / 2;

  let snappedX = false;
  let snappedY = false;
  const result: Point = { ...position };

  // Snap X to center
  if (Math.abs(position.x - centerX) <= threshold) {
    result.x = centerX;
    snappedX = true;
  }

  // Snap Y to center
  if (Math.abs(position.y - centerY) <= threshold) {
    result.y = centerY;
    snappedY = true;
  }

  return {
    snappedPosition: result,
    snappedX,
    snappedY,
  };
}

/**
 * Calculates greatest common divisor for aspect ratio simplification.
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculates clean simplified aspect ratio string (e.g. 16:9, 4:3, 1:1, 16:10).
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '1:1';

  // Common close matches
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.01) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.01) return '9:16';
  if (Math.abs(ratio - 16 / 10) < 0.01) return '16:10';
  if (Math.abs(ratio - 4 / 3) < 0.01) return '4:3';
  if (Math.abs(ratio - 3 / 2) < 0.01) return '3:2';
  if (Math.abs(ratio - 1) < 0.01) return '1:1';

  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width) / divisor}:${Math.round(height) / divisor}`;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function formatDimensions(width: number, height: number, scale: number = 1): string {
  const scaledW = Math.round(width * scale);
  const scaledH = Math.round(height * scale);
  if (scale === 1) {
    return `${width} × ${height}`;
  }
  return `${width} × ${height} @${scale}x (${scaledW}×${scaledH})`;
}
