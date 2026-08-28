export interface ColorStop {
  color: string;
  position: number; // 0 .. 100
}

export type GradientType = 'linear' | 'radial' | 'conic' | 'mesh';

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'transparent';
  color?: string; // for solid
  gradientType?: GradientType;
  angle?: number; // 0 .. 360 for linear
  stops?: ColorStop[];
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageBlur?: number;
  opacity?: number;
  position?: { x: number; y: number };
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const cleanHex = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${alpha})`;
}

export function generateBackgroundCss(config: BackgroundConfig): string {
  if (!config) return 'transparent';

  switch (config.type) {
    case 'solid':
      return config.color || '#0f172a';

    case 'gradient': {
      const angle = config.angle ?? 135;
      const stops = config.stops && config.stops.length > 0
        ? config.stops.map((s) => `${s.color} ${s.position}%`).join(', ')
        : '#6366f1 0%, #ec4899 100%';

      if (config.gradientType === 'radial') {
        return `radial-gradient(circle at center, ${stops})`;
      }
      if (config.gradientType === 'conic') {
        return `conic-gradient(from ${angle}deg, ${stops})`;
      }
      return `linear-gradient(${angle}deg, ${stops})`;
    }

    case 'image':
      return config.imageUrl ? `url("${config.imageUrl}")` : 'transparent';

    case 'transparent':
    default:
      return 'transparent';
  }
}

export interface PresetGradient {
  name: string;
  angle: number;
  stops: ColorStop[];
}

export const PRESET_GRADIENTS: PresetGradient[] = [
  {
    name: 'Cosmic Violet',
    angle: 135,
    stops: [
      { color: '#4f46e5', position: 0 },
      { color: '#7c3aed', position: 50 },
      { color: '#db2777', position: 100 },
    ],
  },
  {
    name: 'Neon Horizon',
    angle: 120,
    stops: [
      { color: '#06b6d4', position: 0 },
      { color: '#3b82f6', position: 50 },
      { color: '#9333ea', position: 100 },
    ],
  },
  {
    name: 'Sunset Glow',
    angle: 45,
    stops: [
      { color: '#f43f5e', position: 0 },
      { color: '#fb923c', position: 50 },
      { color: '#facc15', position: 100 },
    ],
  },
  {
    name: 'Emerald Aurora',
    angle: 160,
    stops: [
      { color: '#059669', position: 0 },
      { color: '#10b981', position: 50 },
      { color: '#06b6d4', position: 100 },
    ],
  },
  {
    name: 'Obsidian Velvet',
    angle: 180,
    stops: [
      { color: '#1e1b4b', position: 0 },
      { color: '#0f172a', position: 60 },
      { color: '#020617', position: 100 },
    ],
  },
  {
    name: 'Cyberpunk Rose',
    angle: 135,
    stops: [
      { color: '#e11d48', position: 0 },
      { color: '#8b5cf6', position: 100 },
    ],
  },
  {
    name: 'Deep Oceanic',
    angle: 150,
    stops: [
      { color: '#0f172a', position: 0 },
      { color: '#1e3a8a', position: 50 },
      { color: '#0284c7', position: 100 },
    ],
  },
];
