export interface ViewportPreset {
  id: string;
  name: string;
  category: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  width: number;
  height: number;
  scale: number;
  icon?: string;
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  // Desktop
  { id: 'desktop-4k', name: 'Desktop 4K (3840 × 2160)', category: 'desktop', width: 3840, height: 2160, scale: 2 },
  { id: 'desktop-1440p', name: 'Desktop QHD (2560 × 1440)', category: 'desktop', width: 2560, height: 1440, scale: 1.5 },
  { id: 'desktop-1080p', name: 'Desktop Full HD (1920 × 1080)', category: 'desktop', width: 1920, height: 1080, scale: 1 },
  { id: 'desktop-standard', name: 'Desktop Standard (1280 × 800)', category: 'desktop', width: 1280, height: 800, scale: 1 },
  { id: 'desktop-compact', name: 'Desktop Compact (1024 × 768)', category: 'desktop', width: 1024, height: 768, scale: 1 },

  // Laptop
  { id: 'macbook-16', name: 'MacBook Pro 16" (1728 × 1117)', category: 'laptop', width: 1728, height: 1117, scale: 2 },
  { id: 'macbook-14', name: 'MacBook Pro 14" (1512 × 982)', category: 'laptop', width: 1512, height: 982, scale: 2 },
  { id: 'macbook-air', name: 'MacBook Air 13" (1440 × 900)', category: 'laptop', width: 1440, height: 900, scale: 2 },
  { id: 'laptop-hd', name: 'Standard Laptop (1366 × 768)', category: 'laptop', width: 1366, height: 768, scale: 1 },

  // Tablet
  { id: 'ipad-pro-13', name: 'iPad Pro 12.9" (1024 × 1366)', category: 'tablet', width: 1024, height: 1366, scale: 2 },
  { id: 'ipad-air', name: 'iPad Air (820 × 1180)', category: 'tablet', width: 820, height: 1180, scale: 2 },
  { id: 'ipad-mini', name: 'iPad Mini (744 × 1133)', category: 'tablet', width: 744, height: 1133, scale: 2 },
  { id: 'tablet-landscape', name: 'Tablet Landscape (1024 × 768)', category: 'tablet', width: 1024, height: 768, scale: 2 },

  // Mobile
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max (430 × 932)', category: 'mobile', width: 430, height: 932, scale: 3 },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro (393 × 852)', category: 'mobile', width: 393, height: 852, scale: 3 },
  { id: 'iphone-14-15', name: 'iPhone 15 / 14 (390 × 844)', category: 'mobile', width: 390, height: 844, scale: 3 },
  { id: 'iphone-se', name: 'iPhone SE (375 × 667)', category: 'mobile', width: 375, height: 667, scale: 2 },
  { id: 'pixel-9-pro', name: 'Google Pixel 9 Pro (412 × 915)', category: 'mobile', width: 412, height: 915, scale: 2.75 },
  { id: 'galaxy-s24', name: 'Samsung Galaxy S24 (360 × 780)', category: 'mobile', width: 360, height: 780, scale: 3 },
];

export function findPresetByDimensions(width: number, height: number): ViewportPreset | undefined {
  return VIEWPORT_PRESETS.find((p) => p.width === width && p.height === height);
}

export function getPresetsByCategory(category: ViewportPreset['category']): ViewportPreset[] {
  return VIEWPORT_PRESETS.filter((p) => p.category === category);
}
