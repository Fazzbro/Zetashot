import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { BackgroundConfig } from './gradientUtils';
import type { TimelinePositionClip } from '../components/VideoTimeline';
import type { Model3DTransform } from '../types/model3D';
import type { TextLayerOverlay } from '../types/textLayer';

export interface ZetashotSharedProject {
  version: string;
  title?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  background?: BackgroundConfig;
  cameraClips?: TimelinePositionClip[];
  deviceMockup?: string;
  model3DTransform?: Model3DTransform;
  textLayers?: TextLayerOverlay[];
  duration?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | '3d';
  mediaName?: string;
  autoExport?: boolean;
}

/**
 * Encodes a Zetashot project state into a compact, URL-safe base64 parameter string.
 */
export function encodeProjectToUrl(payload: ZetashotSharedProject): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const u8 = strToU8(jsonStr);
    const compressed = deflateSync(u8, { level: 9 });
    let binary = '';
    const len = compressed.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    // Base64url encoding (replace + with -, / with _, trim =)
    if (typeof btoa === 'function') {
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
      return Buffer.from(binary, 'binary').toString('base64url');
    }
  } catch (err) {
    console.warn('[Zetashot] Failed to encode project to URL:', err);
    return '';
  }
}

/**
 * Decodes a URL parameter string back into a Zetashot project state.
 */
export function decodeProjectFromUrl(encoded: string): ZetashotSharedProject | null {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    let binary = '';
    if (typeof atob === 'function') {
      binary = atob(base64);
    } else {
      binary = Buffer.from(base64, 'base64').toString('binary');
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decompressed = inflateSync(bytes);
    const jsonStr = strFromU8(decompressed);
    return JSON.parse(jsonStr) as ZetashotSharedProject;
  } catch (err) {
    console.warn('[Zetashot] Failed to decode project from URL:', err);
    return null;
  }
}
