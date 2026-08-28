export interface AspectRatioDimensions {
  width: number;
  height: number;
}

export const ASPECT_RATIOS = ['16:9', '4:3', '1:1', '9:16', '21:9'] as const;
export type AspectRatioType = (typeof ASPECT_RATIOS)[number] | string;

export function getMockupDimensions(aspectRatio: AspectRatioType): AspectRatioDimensions {
  switch (aspectRatio) {
    case '16:9':
      return { width: 720, height: 405 };
    case '4:3':
      return { width: 640, height: 480 };
    case '1:1':
      return { width: 500, height: 500 };
    case '9:16':
      return { width: 340, height: 604 };
    case '21:9':
      return { width: 800, height: 343 };
    default:
      return { width: 720, height: 405 };
  }
}

export function getAspectRatioCss(aspectRatio: AspectRatioType): string {
  switch (aspectRatio) {
    case '16:9':
      return '16 / 9';
    case '4:3':
      return '4 / 3';
    case '1:1':
      return '1 / 1';
    case '9:16':
      return '9 / 16';
    case '21:9':
      return '21 / 9';
    default:
      return '16 / 9';
  }
}

export function getStageDimensions(
  aspectRatio: AspectRatioType,
  baseWidth: number = 1920,
  baseHeight: number = 1080
): AspectRatioDimensions {
  switch (aspectRatio) {
    case '16:9':
      return { width: baseWidth, height: baseHeight };
    case '4:3':
      return { width: Math.round((baseHeight * 4) / 3), height: baseHeight };
    case '1:1':
      return { width: baseHeight, height: baseHeight };
    case '9:16':
      return { width: Math.round((baseWidth * 9) / 16), height: baseWidth };
    case '21:9':
      return { width: Math.round((baseHeight * 21) / 9), height: baseHeight };
    default:
      return { width: baseWidth, height: baseHeight };
  }
}

export interface DrawCoords {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function calculateObjectFitCover(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number
): DrawCoords {
  const srcRatio = sourceWidth / sourceHeight;
  const dstRatio = destWidth / destHeight;

  let finalWidth = sourceWidth;
  let finalHeight = sourceHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (srcRatio > dstRatio) {
    // Source is wider than destination
    finalWidth = sourceHeight * dstRatio;
    offsetX = (sourceWidth - finalWidth) / 2;
  } else {
    // Source is taller than destination
    finalHeight = sourceWidth / dstRatio;
    offsetY = (sourceHeight - finalHeight) / 2;
  }

  return {
    sx: offsetX,
    sy: offsetY,
    sw: finalWidth,
    sh: finalHeight,
    dx: 0,
    dy: 0,
    dw: destWidth,
    dh: destHeight,
  };
}
