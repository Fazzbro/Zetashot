import { Size } from './transformMath';

export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type ResolutionScale = 1 | 2 | 3 | 4;

export interface ExportOptions {
  format: ExportFormat;
  scale: ResolutionScale;
  quality: number; // 0.1 .. 1.0
  transparent: boolean;
  filenameTemplate?: string;
  customDimensions?: Size;
}

export function calculateExportDimensions(
  baseSize: Size,
  scale: ResolutionScale = 1,
  customDimensions?: Size
): Size {
  const targetBase = customDimensions || baseSize;
  return {
    width: Math.round(targetBase.width * scale),
    height: Math.round(targetBase.height * scale),
  };
}

export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

export function generateExportFilename(
  projectName: string,
  format: ExportFormat,
  scale: ResolutionScale = 1
): string {
  const cleanName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const dateStr = new Date().toISOString().split('T')[0];
  const scaleStr = scale > 1 ? `${scale}x` : '1x';

  return `openshot-${cleanName || 'capture'}-${scaleStr}-${dateStr}.${format}`;
}
