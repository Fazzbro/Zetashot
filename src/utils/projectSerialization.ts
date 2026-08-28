import { BackgroundConfig } from './gradientUtils';
import { KeyframePoint } from './easing';
import { Size } from './transformMath';

export type DeviceMockupType =
  | 'mac-safari'
  | 'mac-chrome'
  | 'windows-fluent'
  | 'macbook-pro'
  | 'studio-display'
  | 'ipad-pro'
  | 'iphone-pro'
  | 'frameless';

export interface DeviceMockupConfig {
  type: DeviceMockupType;
  title: string;
  url: string;
  theme: 'dark' | 'light';
  showTrafficLights: boolean;
  showUrlBar: boolean;
  showTabs: boolean;
  bezelWidth: number;
}

export interface VisualEffectsConfig {
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  borderOpacity: number;
  shadowBlur: number;
  shadowSpread: number;
  shadowColor: string;
  shadowOpacity: number;
  shadowOffsetY: number;
  glowBlur: number;
  glowColor: string;
  glowOpacity: number;
  brightness: number; // 0 .. 200%
  contrast: number; // 0 .. 200%
  saturation: number; // 0 .. 200%
  pageBlur: number; // px
  bgBlur: number; // px
  opacity: number; // 0 .. 100%
}

export interface CursorConfig {
  mode: 'hidden' | 'normal' | 'large' | 'highlighted';
  size: number;
  highlightRadius: number;
  highlightColor: string;
  clickRipple: boolean;
  clickColor: string;
  clickDuration: number;
  cursorTrail: boolean;
  opacity: number;
}

export interface TimelineConfig {
  duration: number; // milliseconds
  fps: 24 | 30 | 60;
  keyframes: KeyframePoint[];
}

export interface ProjectState {
  version: string;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  viewport: Size & { scale: number; preset: string };
  canvas: {
    padding: number;
    zoom: number;
    pan: { x: number; y: number };
    rotation: number;
    crop?: { x: number; y: number; width: number; height: number };
    locked: boolean;
  };
  deviceMockup: DeviceMockupConfig;
  background: BackgroundConfig;
  effects: VisualEffectsConfig;
  cursor: CursorConfig;
  timeline: TimelineConfig;
  content: {
    type: 'url' | 'image' | 'video' | 'html';
    url: string;
    imageData?: string; // base64 or object URL
  };
}

export function createDefaultProject(name: string = 'Untitled Project'): ProjectState {
  const now = Date.now();
  return {
    version: '1.0.0',
    id: `proj_${now}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    createdAt: now,
    updatedAt: now,
    viewport: {
      width: 1440,
      height: 900,
      scale: 1,
      preset: 'Desktop (1440 × 900)',
    },
    canvas: {
      padding: 64,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      rotation: 0,
      locked: false,
    },
    deviceMockup: {
      type: 'mac-safari',
      title: 'OpenShot UI Camera — Professional Web Camera',
      url: 'https://ui.camera',
      theme: 'dark',
      showTrafficLights: true,
      showUrlBar: true,
      showTabs: true,
      bezelWidth: 0,
    },
    background: {
      type: 'gradient',
      gradientType: 'linear',
      angle: 135,
      stops: [
        { color: '#4f46e5', position: 0 },
        { color: '#7c3aed', position: 50 },
        { color: '#db2777', position: 100 },
      ],
      opacity: 1,
    },
    effects: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#ffffff',
      borderOpacity: 0.12,
      shadowBlur: 48,
      shadowSpread: 0,
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowOffsetY: 24,
      glowBlur: 0,
      glowColor: '#6366f1',
      glowOpacity: 0.4,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      pageBlur: 0,
      bgBlur: 0,
      opacity: 100,
    },
    cursor: {
      mode: 'highlighted',
      size: 24,
      highlightRadius: 36,
      highlightColor: '#f59e0b',
      clickRipple: true,
      clickColor: '#ef4444',
      clickDuration: 400,
      cursorTrail: false,
      opacity: 0.9,
    },
    timeline: {
      duration: 4000,
      fps: 60,
      keyframes: [
        { id: 'kf-start', time: 0, x: 0, y: 0, zoom: 1.0, rotation: 0, easing: 'easeInOut' },
        { id: 'kf-end', time: 4000, x: 0, y: 0, zoom: 1.0, rotation: 0, easing: 'easeInOut' },
      ],
    },
    content: {
      type: 'url',
      url: 'https://ui.camera',
    },
  };
}

export function serializeProjectToJson(project: ProjectState): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProjectFromJson(jsonStr: string): ProjectState {
  try {
    const parsed = JSON.parse(jsonStr);
    const fallback = createDefaultProject('Imported Project');

    return {
      ...fallback,
      ...parsed,
      viewport: { ...fallback.viewport, ...(parsed.viewport || {}) },
      canvas: { ...fallback.canvas, ...(parsed.canvas || {}) },
      deviceMockup: { ...fallback.deviceMockup, ...(parsed.deviceMockup || {}) },
      background: { ...fallback.background, ...(parsed.background || {}) },
      effects: { ...fallback.effects, ...(parsed.effects || {}) },
      cursor: { ...fallback.cursor, ...(parsed.cursor || {}) },
      timeline: { ...fallback.timeline, ...(parsed.timeline || {}) },
      content: { ...fallback.content, ...(parsed.content || {}) },
      updatedAt: Date.now(),
    };
  } catch (e) {
    console.warn('Failed to parse project JSON, returning fallback default:', e);
    return createDefaultProject('Sanitized Project');
  }
}
