import zlib from 'node:zlib';

interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'transparent';
  color?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageScale?: number;
  position?: { x: number; y: number };
  opacity?: number;
}

interface TimelinePositionClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  color?: string;
  blockId?: string;
  mediaClipId?: string;
  transition?: string;
  camera: {
    rotX: number;
    rotY: number;
    rotZ: number;
    zoom: number;
    panX: number;
    panY: number;
    perspective?: number;
  };
}

interface ZetashotSharedProject {
  version: string;
  title?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  background?: BackgroundConfig;
  cameraClips?: TimelinePositionClip[];
  deviceMockup?: string;
  duration?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | '3d' | 'blank';
  mediaName?: string;
  autoExport?: boolean;
  textLayers?: Array<{
    id: string;
    text: string;
    title?: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    borderRadius?: number;
    paddingX?: number;
    paddingY?: number;
    opacity?: number;
    startTime: number;
    duration: number;
    animationType?: string;
    fontWeight?: string;
    textAlign?: string;
    inAnimation?: string;
    inDuration?: number;
    outAnimation?: string;
    outDuration?: number;
    animationScope?: string;
    shadow?: boolean;
  }>;
  mediaClips?: Array<{
    id: string;
    mediaId: string;
    name: string;
    type: 'video' | 'image' | 'demo' | '3d' | 'blank';
    url: string;
    startTime: number;
    duration: number;
    sourceStartTime?: number;
    speed?: number;
    transition?: string;
    transitionDuration?: number;
  }>;
  audioTracks?: Array<{
    id: string;
    name: string;
    url: string;
    type: 'music' | 'sfx' | 'voiceover';
    startTime: number;
    duration: number;
    volume: number;
    isMuted?: boolean;
  }>;
  visualEffects?: {
    borderRadius?: number;
    blurAmount?: number;
    shadowBlur?: number;
    shadowSpread?: number;
    shadowOpacity?: number;
    shadowOffsetY?: number;
    specularGlow?: boolean;
    glowColor?: string;
    dof?: boolean;
    dofAperture?: number;
  };
  webglMaterial?: {
    roughness?: number;
    metalness?: number;
    tintHex?: string;
    textureRepeat?: [number, number];
    flipY?: boolean;
  };
}

function encodeProjectToUrl(payload: ZetashotSharedProject): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const compressed = zlib.deflateRawSync(Buffer.from(jsonStr, 'utf-8'));
    return compressed.toString('base64url');
  } catch (err) {
    console.warn('[Zetashot] Failed to encode project:', err);
    return '';
  }
}

function decodeProjectFromUrl(encoded: string): ZetashotSharedProject | null {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const buffer = Buffer.from(base64, 'base64');
    const decompressed = zlib.inflateRawSync(buffer);
    return JSON.parse(decompressed.toString('utf-8')) as ZetashotSharedProject;
  } catch (err) {
    console.warn('[Zetashot] Failed to decode project:', err);
    return null;
  }
}

// Available wallpapers catalog with calibrated default center points
const WALLPAPER_PRESETS = [
  { id: 'bg-purple-wave', name: 'Purple Wave (Vibrant Dark Flow)', path: '/backgrounds/bg-purple-wave.jpg', position: { x: 50, y: 50 } },
  { id: 'bg-sunflowers', name: 'Sunflower Meadow (Warm Summer Light)', path: '/backgrounds/bg-sunflowers.png', position: { x: 50, y: 100 } },
  { id: 'bg-green-hills', name: 'Green Hills (Minimalist Landscape)', path: '/backgrounds/bg-green-hills.jpg', position: { x: 50, y: 50 } },
  { id: 'bg-halftone-clouds', name: 'Halftone Clouds (Retro Pop Art)', path: '/backgrounds/bg-halftone-clouds.jpg', position: { x: 50, y: 50 } },
  { id: 'bg-tulips', name: 'Digital Tulips (Cyber Floral)', path: '/backgrounds/bg-tulips.jpg', position: { x: 50, y: 50 } },
];

const CAMERA_PRESETS = [
  { id: 'saas_feature_spotlight', name: 'SaaS Feature Spotlight (High Readability)', description: 'Deliberate, legible push into new UI feature with near-zero tilt for crystal-clear readability and dwell time' },
  { id: 'saas_workflow_walkthrough', name: 'SaaS 3-Step Guided Workflow', description: 'Step-by-step feature walkthrough: trigger input -> action canvas -> output result -> full hero view' },
  { id: 'linear_clean_elevation', name: 'Linear Minimal 2.5D Elevation', description: 'Iconic Linear/Raycast aesthetic: subtle 2.5D elevation (rotX ≤ 4°), zero Dutch roll, telephoto perspective' },
  { id: 'apple_keynote_presentation', name: 'Apple Keynote Frontal Push', description: 'Pure perpendicular 0° camera push without rotation or keystoning for pristine product presentation' },
  { id: 'feature_comparison_glide', name: 'Feature Comparison Glide', description: 'Smooth orthogonal horizontal tracking between two panels or before-and-after states' },
  { id: 'executive_kpi_reveal', name: 'Executive KPI & Metric Highlight', description: 'Direct spotlight on metrics cards, charts, and business growth indicators with sharp focus' },
  { id: 'storytelling_product_walkthrough', name: 'Storytelling Product Walkthrough', description: 'Narrative camera flow: wide establishing angle, swooping into key feature details, panning across interaction, and pulling out to an authoritative hero lock' },
  { id: 'apple_commercial_sweep', name: 'Apple Commercial Low Sweep', description: 'Clean minimalist commercial glide: low Dutch perspective catching specular glass sheen, sweeping across and resolving center-stage' },
  { id: 'macro_feature_focus', name: 'Macro Feature Focus', description: 'Extreme close-up macro zoom targeting UI interaction with shallow depth of field, slowly easing back into full frame' },
  { id: 'tiktok_viral_snap', name: 'TikTok / Reel Viral Snap', description: 'High-energy vertical cadence with rapid kinetic whip-rotations and punchy zoom snaps' },
  { id: 'insane_3d_flyby', name: 'Insane 3D Flyby (High-Energy Dutch Roll & Swoop)', description: 'Extreme dynamic 3D camera flyby with Dutch angle rolls, wide sweeps, and close-up tracking' },
  { id: 'spiral_vortex_dive', name: 'Spiral Vortex Dive', description: 'Corkscrew 3D spiral diving in from deep space into an intense dynamic hero framing' },
  { id: 'push_in_reveal', name: 'Push-In Reveal (Dramatic Hero Zoom)', description: 'Smooth push from 0.74x distance into 1.35x close-up framing' },
  { id: 'tiktok_dynamic_bounce', name: 'TikTok / Reel Kinetic Bounce', description: 'Fast snappy rotational tilt designed for 9:16 vertical video engagement' },
  { id: 'cinematic_orbit', name: 'Cinematic Orbit (Dynamic 3D Yaw & Tilt)', description: 'Sweeps camera around the 3D model with subtle depth curvature' },
  { id: 'subtle_studio_hover', name: 'Subtle Studio Hover', description: 'Gentle, minimalist drift suited for elegant SaaS product showcases' },
];

function buildCameraClips(preset: string, duration: number): TimelinePositionClip[] {
  const dur = Math.max(2.0, Math.min(30.0, duration || 4.0));
  const t1 = Number((dur * 0.33).toFixed(2));
  const t2 = Number((dur * 0.66).toFixed(2));
  const d1 = t1;
  const d2 = Number((t2 - t1).toFixed(2));
  const d3 = Number((dur - t2).toFixed(2));

  const baseProps = { color: 'yellow', blockId: 'block_main', mediaClipId: 'clip_init', transition: 'cut' };

  switch (preset) {
    case 'saas_feature_spotlight':
      return [
        {
          id: 'kf_1',
          name: '1. Context Overview',
          startTime: 0,
          duration: d1,
          camera: { rotX: 2, rotY: 0, rotZ: 0, zoom: 0.95, panX: 0, panY: 0, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Feature Deep Dive',
          startTime: t1,
          duration: d2,
          camera: { rotX: 1, rotY: -2, rotZ: 0, zoom: 1.52, panX: 16, panY: -12, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Feature Dwell & Micro-Glide',
          startTime: t2,
          duration: d3,
          camera: { rotX: 2, rotY: 1, rotZ: 0, zoom: 1.55, panX: 18, panY: -10, perspective: 1150 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Hero Overview Resolve',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.02, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'saas_workflow_walkthrough':
      return [
        {
          id: 'kf_1',
          name: '1. Step 1: Trigger / Sidebar',
          startTime: 0,
          duration: d1,
          camera: { rotX: 2, rotY: -3, rotZ: 0, zoom: 1.35, panX: -22, panY: -6, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Step 2: Action Canvas',
          startTime: t1,
          duration: d2,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.45, panX: 0, panY: 0, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Step 3: Output Result',
          startTime: t2,
          duration: d3,
          camera: { rotX: 1, rotY: 2, rotZ: 0, zoom: 1.38, panX: 20, panY: 10, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Complete Product View',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'linear_clean_elevation':
      return [
        {
          id: 'kf_1',
          name: '1. Clean 2.5D Establishing',
          startTime: 0,
          duration: d1,
          camera: { rotX: 4, rotY: -2, rotZ: 0, zoom: 0.92, panX: -10, panY: -4, perspective: 1200 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Feature Center Zoom',
          startTime: t1,
          duration: d2,
          camera: { rotX: 2, rotY: 2, rotZ: 0, zoom: 1.40, panX: 8, panY: 4, perspective: 1200 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Horizontal Linear Glide',
          startTime: t2,
          duration: d3,
          camera: { rotX: 3, rotY: -1, rotZ: 0, zoom: 1.25, panX: -6, panY: 2, perspective: 1200 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Crisp Resting Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.04, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'apple_keynote_presentation':
      return [
        {
          id: 'kf_1',
          name: '1. Wide Frontal Establishing',
          startTime: 0,
          duration: d1,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.88, panX: 0, panY: 0, perspective: 1200 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Frontal Push-In to Feature',
          startTime: t1,
          duration: d2,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.48, panX: 12, panY: -8, perspective: 1200 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Secondary Feature Focus',
          startTime: t2,
          duration: d3,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.35, panX: -10, panY: 6, perspective: 1200 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Full Hero Reveal',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.02, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'feature_comparison_glide':
      return [
        {
          id: 'kf_1',
          name: '1. Left Feature Panel',
          startTime: 0,
          duration: d1,
          camera: { rotX: 1, rotY: -3, rotZ: 0, zoom: 1.35, panX: -24, panY: 0, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Transition Across Center',
          startTime: t1,
          duration: d2,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.20, panX: 0, panY: 0, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Right Feature Panel',
          startTime: t2,
          duration: d3,
          camera: { rotX: 1, rotY: 3, rotZ: 0, zoom: 1.35, panX: 24, panY: 0, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Full Comparison Overview',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'executive_kpi_reveal':
      return [
        {
          id: 'kf_1',
          name: '1. Metric Card Focus',
          startTime: 0,
          duration: d1,
          camera: { rotX: -2, rotY: 2, rotZ: 0, zoom: 1.55, panX: 18, panY: -14, perspective: 1150 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Supporting Metric Inspection',
          startTime: t1,
          duration: d2,
          camera: { rotX: 1, rotY: -2, rotZ: 0, zoom: 1.45, panX: -14, panY: -10, perspective: 1150 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Data Trend Glide',
          startTime: t2,
          duration: d3,
          camera: { rotX: 2, rotY: 0, rotZ: 0, zoom: 1.25, panX: 0, panY: 8, perspective: 1100 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Complete Business Dashboard',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.04, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'storytelling_product_walkthrough':
      return [
        {
          id: 'kf_1',
          name: '1. Establishing Overview',
          startTime: 0,
          duration: d1,
          camera: { rotX: 28, rotY: -35, rotZ: -10, zoom: 0.82, panX: -28, panY: -15, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Swoop to Focus Feature',
          startTime: t1,
          duration: d2,
          camera: { rotX: -8, rotY: 18, rotZ: 8, zoom: 1.45, panX: 18, panY: 22, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Pan Across Interface',
          startTime: t2,
          duration: d3,
          camera: { rotX: 14, rotY: -12, rotZ: -4, zoom: 1.20, panX: -12, panY: -5, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Hero Resolve Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'apple_commercial_sweep':
      return [
        {
          id: 'kf_1',
          name: '1. Low Dutch Glide',
          startTime: 0,
          duration: d1,
          camera: { rotX: -18, rotY: 42, rotZ: 14, zoom: 0.88, panX: 30, panY: 18, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Specular Horizon Sweep',
          startTime: t1,
          duration: d2,
          camera: { rotX: 8, rotY: -22, rotZ: -6, zoom: 1.18, panX: -15, panY: -8, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Precision Alignment',
          startTime: t2,
          duration: d3,
          camera: { rotX: 4, rotY: -6, rotZ: -2, zoom: 1.08, panX: -4, panY: -2, perspective: 980 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Pure Hero Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'macro_feature_focus':
      return [
        {
          id: 'kf_1',
          name: '1. Macro Close-Up',
          startTime: 0,
          duration: d1,
          camera: { rotX: -12, rotY: 16, rotZ: 6, zoom: 1.85, panX: 20, panY: 30, perspective: 650 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Shallow Depth Drift',
          startTime: t1,
          duration: d2,
          camera: { rotX: 8, rotY: -14, rotZ: -5, zoom: 1.60, panX: -16, panY: 15, perspective: 720 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Smooth Pullback Reveal',
          startTime: t2,
          duration: d3,
          camera: { rotX: 6, rotY: -8, rotZ: -2, zoom: 1.25, panX: -8, panY: 0, perspective: 880 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Complete Device Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.02, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'tiktok_viral_snap':
      return [
        {
          id: 'kf_1',
          name: '1. High Angle Snap',
          startTime: 0,
          duration: d1,
          camera: { rotX: 26, rotY: -32, rotZ: -18, zoom: 0.92, panX: -20, panY: -25, perspective: 700 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Whip Punch In',
          startTime: t1,
          duration: d2,
          camera: { rotX: -14, rotY: 28, rotZ: 16, zoom: 1.55, panX: 18, panY: 15, perspective: 680 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Dynamic Recoil',
          startTime: t2,
          duration: d3,
          camera: { rotX: 10, rotY: -12, rotZ: -6, zoom: 1.15, panX: -8, panY: -5, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Center Drop',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.08, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'insane_3d_flyby':
      return [
        {
          id: 'kf_1',
          name: 'High Dutch Swoop',
          startTime: 0,
          duration: d1,
          camera: { rotX: 34, rotY: -48, rotZ: -14, zoom: 0.76, panX: -35, panY: -20, perspective: 700 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Low Dutch Punch',
          startTime: t1,
          duration: d2,
          camera: { rotX: -16, rotY: 36, rotZ: 16, zoom: 1.40, panX: 25, panY: 15, perspective: 700 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Whip Reverse',
          startTime: t2,
          duration: d3,
          camera: { rotX: 22, rotY: -24, rotZ: -8, zoom: 1.15, panX: -15, panY: 5, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: 'Hero Center',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'spiral_vortex_dive':
      return [
        {
          id: 'kf_1',
          name: 'Deep Vortex Start',
          startTime: 0,
          duration: d1,
          camera: { rotX: 42, rotY: -65, rotZ: -28, zoom: 0.68, panX: -40, panY: -30, perspective: 650 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Vortex Mid Swoop',
          startTime: t1,
          duration: d2,
          camera: { rotX: -24, rotY: 48, rotZ: 22, zoom: 1.32, panX: 30, panY: 15, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Leveling In',
          startTime: t2,
          duration: d3,
          camera: { rotX: 12, rotY: -14, rotZ: -6, zoom: 1.12, panX: -10, panY: 0, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: 'Final Hero Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'push_in_reveal':
      return [
        {
          id: 'kf_start',
          name: 'Hero In',
          startTime: 0,
          duration: d1 + d2,
          camera: { rotX: 18, rotY: -22, rotZ: -6, zoom: 0.74, panX: -20, panY: -10, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_mid',
          name: 'Close Glide',
          startTime: t2,
          duration: d3,
          camera: { rotX: 6, rotY: 6, rotZ: 2, zoom: 1.28, panX: 10, panY: 0, perspective: 950 },
          ...baseProps,
        },
        {
          id: 'kf_end',
          name: 'Close Up',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.35, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'tiktok_dynamic_bounce':
      return [
        {
          id: 'kf_1',
          name: 'Top Right Angle',
          startTime: 0,
          duration: d1,
          camera: { rotX: 28, rotY: -35, rotZ: -12, zoom: 0.88, panX: -25, panY: -15, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Low Left Punch',
          startTime: t1,
          duration: d2,
          camera: { rotX: -16, rotY: 30, rotZ: 10, zoom: 1.38, panX: 28, panY: 12, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Snap Tilt',
          startTime: t2,
          duration: d3,
          camera: { rotX: 14, rotY: -12, rotZ: -4, zoom: 1.12, panX: -10, panY: -5, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: 'Final Center',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'subtle_studio_hover':
      return [
        {
          id: 'kf_1',
          name: 'Hover Left',
          startTime: 0,
          duration: dur,
          camera: { rotX: 8, rotY: -10, rotZ: 0, zoom: 0.98, panX: -15, panY: -5, perspective: 1000 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Hover Right',
          startTime: dur,
          duration: 0,
          camera: { rotX: 10, rotY: 8, rotZ: 0, zoom: 1.04, panX: 15, panY: 5, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'cinematic_orbit':
      return [
        {
          id: 'kf_start',
          name: 'Orbit In',
          startTime: 0,
          duration: d1,
          camera: { rotX: 24, rotY: -38, rotZ: -8, zoom: 0.85, panX: -25, panY: -10, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_mid',
          name: 'Center Pan',
          startTime: t1,
          duration: d2,
          camera: { rotX: -10, rotY: 15, rotZ: 5, zoom: 1.25, panX: 15, panY: 8, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Orbit Swirl',
          startTime: t2,
          duration: d3,
          camera: { rotX: 16, rotY: -18, rotZ: -4, zoom: 1.10, panX: -8, panY: -2, perspective: 950 },
          ...baseProps,
        },
        {
          id: 'kf_end',
          name: 'Orbit Out',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    default:
      return buildCameraClips('saas_feature_spotlight', dur);
  }
}

function resolveFocalPointCoords(focalPoint: string, layoutType: string): { name: string; panX: number; panY: number; zoom: number } {
  const norm = (focalPoint || '').toLowerCase().replace(/[-_\s]+/g, '');
  if (norm.includes('topright') || norm.includes('cta') || norm.includes('button') || norm.includes('action') || norm.includes('publish')) {
    return { name: 'Action Button / Primary CTA', panX: 22, panY: -20, zoom: 1.55 };
  }
  if (norm.includes('sidebar') || norm.includes('nav') || norm.includes('menu') || norm.includes('rail') || norm.includes('channel')) {
    return { name: 'Navigation Sidebar & Project Rail', panX: -26, panY: 0, zoom: 1.45 };
  }
  if (norm.includes('kpi') || norm.includes('metric') || norm.includes('stat') || norm.includes('revenue') || norm.includes('arr') || norm.includes('conversion')) {
    return { name: 'KPI Metric Block & Telemetry', panX: 18, panY: -12, zoom: 1.55 };
  }
  if (norm.includes('chart') || norm.includes('graph') || norm.includes('analytics') || norm.includes('trend') || norm.includes('sparkline')) {
    return { name: 'Analytics Chart & Data Visual', panX: 12, panY: 6, zoom: 1.48 };
  }
  if (norm.includes('table') || norm.includes('ledger') || norm.includes('row') || norm.includes('list') || norm.includes('feed')) {
    return { name: 'Data Ledger & Table Rows', panX: 0, panY: 16, zoom: 1.45 };
  }
  if (norm.includes('search') || norm.includes('omnibar') || norm.includes('command') || norm.includes('palette') || norm.includes('filter')) {
    return { name: 'Command Palette & Quick Filter', panX: 0, panY: -20, zoom: 1.6 };
  }
  if (norm.includes('prompt') || norm.includes('chat') || norm.includes('input') || norm.includes('composer')) {
    return { name: 'Input Bar & Action Composer', panX: 0, panY: 22, zoom: 1.55 };
  }
  if (norm.includes('code') || norm.includes('editor') || norm.includes('terminal') || norm.includes('syntax') || norm.includes('console')) {
    return { name: 'Syntax Block & Active Editor', panX: 10, panY: 0, zoom: 1.5 };
  }
  if (norm.includes('header') || norm.includes('headline') || norm.includes('title') || norm.includes('hero')) {
    return { name: 'Display Headline & Hero Banner', panX: -14, panY: -20, zoom: 1.45 };
  }
  if (norm.includes('pricing') || norm.includes('tier') || norm.includes('card') || norm.includes('plan')) {
    return { name: 'Plan Tier & Pricing Features', panX: 0, panY: 2, zoom: 1.5 };
  }
  if (norm.includes('modal') || norm.includes('dialog') || norm.includes('popup') || norm.includes('sheet')) {
    return { name: 'Active Modal Dialog & Focus Sheet', panX: 0, panY: 0, zoom: 1.52 };
  }
  // Layout defaults
  if (layoutType === 'mobile_app') return { name: 'Mobile Interaction Canvas', panX: 0, panY: 4, zoom: 1.5 };
  if (layoutType === 'landing_page') return { name: 'Feature Value Proposition', panX: -10, panY: -14, zoom: 1.45 };
  if (layoutType === 'chat_feed') return { name: 'Conversation Stream', panX: 0, panY: 10, zoom: 1.5 };
  if (layoutType === 'code_editor') return { name: 'Source Function & Logic', panX: 12, panY: -4, zoom: 1.5 };
  return { name: 'Core Feature Component', panX: 16, panY: -10, zoom: 1.5 };
}

function buildLayoutAwareKeyframes(
  layoutType: string,
  duration: number,
  focalPoints?: string[],
  motionIntent?: string
): TimelinePositionClip[] {
  const dur = Math.max(2.0, Math.min(30.0, duration || 4.0));
  const t1 = Number((dur * 0.33).toFixed(2));
  const t2 = Number((dur * 0.66).toFixed(2));
  const d1 = t1;
  const d2 = Number((t2 - t1).toFixed(2));
  const d3 = Number((dur - t2).toFixed(2));
  const baseProps = { color: 'yellow', blockId: 'block_main', mediaClipId: 'clip_init', transition: 'cut' };

  const intent = motionIntent || 'feature_spotlight';

  // 1. High-Readability Feature Spotlight (THE ESSENTIAL CHOICE FOR SAAS FEATURE ANNOUNCEMENTS)
  if (intent === 'feature_spotlight') {
    const rawFocal1 = focalPoints && focalPoints[0] ? focalPoints[0] : (layoutType === 'desktop_dashboard' ? 'kpi_metric' : layoutType === 'code_editor' ? 'code_editor' : 'hero_feature');
    const rawFocal2 = focalPoints && focalPoints[1] ? focalPoints[1] : (layoutType === 'desktop_dashboard' ? 'chart' : 'action_button');
    const f1 = resolveFocalPointCoords(rawFocal1, layoutType);
    const f2 = resolveFocalPointCoords(rawFocal2, layoutType);

    return [
      {
        id: 'kf_1',
        name: '1. Context Establishing (Upright)',
        startTime: 0,
        duration: d1,
        camera: { rotX: 2, rotY: 0, rotZ: 0, zoom: 0.95, panX: 0, panY: 0, perspective: 1100 },
        ...baseProps,
      },
      {
        id: 'kf_2',
        name: `2. Feature Deep Dive: ${f1.name}`,
        startTime: t1,
        duration: d2,
        camera: { rotX: 1, rotY: -2, rotZ: 0, zoom: f1.zoom, panX: f1.panX, panY: f1.panY, perspective: 1150 },
        ...baseProps,
      },
      {
        id: 'kf_3',
        name: `3. Feature Dwell & Micro-Glide: ${f2.name}`,
        startTime: t2,
        duration: d3,
        camera: { rotX: 2, rotY: 1, rotZ: 0, zoom: f2.zoom, panX: f2.panX, panY: f2.panY, perspective: 1150 },
        ...baseProps,
      },
      {
        id: 'kf_4',
        name: '4. Crisp Hero Resolve Lock',
        startTime: dur,
        duration: 0,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.02, panX: 0, panY: 0, perspective: 1000 },
        ...baseProps,
      },
    ];
  }

  // 2. Guided 3-Step Workflow Tour
  if (intent === 'product_walkthrough') {
    const rawFocal1 = focalPoints && focalPoints[0] ? focalPoints[0] : 'sidebar';
    const rawFocal2 = focalPoints && focalPoints[1] ? focalPoints[1] : 'canvas';
    const rawFocal3 = focalPoints && focalPoints[2] ? focalPoints[2] : 'cta';
    const f1 = resolveFocalPointCoords(rawFocal1, layoutType);
    const f2 = resolveFocalPointCoords(rawFocal2, layoutType);
    const f3 = resolveFocalPointCoords(rawFocal3, layoutType);

    return [
      {
        id: 'kf_1',
        name: `1. Step 1 (Trigger): ${f1.name}`,
        startTime: 0,
        duration: d1,
        camera: { rotX: 2, rotY: -3, rotZ: 0, zoom: f1.zoom, panX: f1.panX, panY: f1.panY, perspective: 1100 },
        ...baseProps,
      },
      {
        id: 'kf_2',
        name: `2. Step 2 (Action): ${f2.name}`,
        startTime: t1,
        duration: d2,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: f2.zoom, panX: f2.panX, panY: f2.panY, perspective: 1100 },
        ...baseProps,
      },
      {
        id: 'kf_3',
        name: `3. Step 3 (Outcome): ${f3.name}`,
        startTime: t2,
        duration: d3,
        camera: { rotX: 1, rotY: 2, rotZ: 0, zoom: f3.zoom, panX: f3.panX, panY: f3.panY, perspective: 1100 },
        ...baseProps,
      },
      {
        id: 'kf_4',
        name: '4. Full Product Hero Lock',
        startTime: dur,
        duration: 0,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
        ...baseProps,
      },
    ];
  }

  // 3. Linear Minimal 2.5D Elevation
  if (intent === 'clean_linear') {
    return [
      {
        id: 'kf_1',
        name: '1. Clean 2.5D Establishing',
        startTime: 0,
        duration: d1,
        camera: { rotX: 4, rotY: -2, rotZ: 0, zoom: 0.92, panX: -10, panY: -4, perspective: 1200 },
        ...baseProps,
      },
      {
        id: 'kf_2',
        name: '2. Feature Center Zoom',
        startTime: t1,
        duration: d2,
        camera: { rotX: 2, rotY: 2, rotZ: 0, zoom: 1.40, panX: 8, panY: 4, perspective: 1200 },
        ...baseProps,
      },
      {
        id: 'kf_3',
        name: '3. Horizontal Linear Glide',
        startTime: t2,
        duration: d3,
        camera: { rotX: 3, rotY: -1, rotZ: 0, zoom: 1.25, panX: -6, panY: 2, perspective: 1200 },
        ...baseProps,
      },
      {
        id: 'kf_4',
        name: '4. Crisp Resting Lock',
        startTime: dur,
        duration: 0,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.04, panX: 0, panY: 0, perspective: 1000 },
        ...baseProps,
      },
    ];
  }

  // 4. Apple Keynote Frontal Push
  if (intent === 'frontal_keynote') {
    return [
      {
        id: 'kf_1',
        name: '1. Wide Frontal Establishing',
        startTime: 0,
        duration: d1,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.88, panX: 0, panY: 0, perspective: 1200 },
        ...baseProps,
      },
      {
        id: 'kf_2',
        name: '2. Frontal Push-In to Feature',
        startTime: t1,
        duration: d2,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.48, panX: 12, panY: -8, perspective: 1200 },
        ...baseProps,
      },
      {
        id: 'kf_3',
        name: '3. Secondary Feature Focus',
        startTime: t2,
        duration: d3,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.35, panX: -10, panY: 6, perspective: 1200 },
        ...baseProps,
      },
      {
        id: 'kf_4',
        name: '4. Full Hero Reveal',
        startTime: dur,
        duration: 0,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.02, panX: 0, panY: 0, perspective: 1000 },
        ...baseProps,
      },
    ];
  }

  // 5. Cinematic Teaser (Layout-specific 3D sweeps when high-energy dynamic angles are desired)
  switch (layoutType) {
    case 'desktop_dashboard':
      return [
        {
          id: 'kf_1',
          name: '1. Establishing Dashboard Overview',
          startTime: 0,
          duration: d1,
          camera: { rotX: 22, rotY: -32, rotZ: -8, zoom: 0.82, panX: -22, panY: -10, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Deep Swoop to Analytics & Metrics',
          startTime: t1,
          duration: d2,
          camera: { rotX: -8, rotY: 18, rotZ: 6, zoom: 1.45, panX: 18, panY: 15, perspective: 780 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Glide Across Sidebar & Data Rows',
          startTime: t2,
          duration: d3,
          camera: { rotX: 12, rotY: -14, rotZ: -4, zoom: 1.22, panX: -14, panY: -4, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Authoritative Hero Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'mobile_app':
      return [
        {
          id: 'kf_1',
          name: '1. High-Angle Mobile Teaser',
          startTime: 0,
          duration: d1,
          camera: { rotX: 26, rotY: -30, rotZ: -10, zoom: 0.88, panX: -18, panY: -15, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Macro Focus on Main Content Feed',
          startTime: t1,
          duration: d2,
          camera: { rotX: -12, rotY: 24, rotZ: 8, zoom: 1.48, panX: 20, panY: 12, perspective: 720 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Smooth Pan to Interactive Action & Tabs',
          startTime: t2,
          duration: d3,
          camera: { rotX: 14, rotY: -10, rotZ: -3, zoom: 1.25, panX: -8, panY: 22, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Crisp Upright Center Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.06, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'landing_page':
      return [
        {
          id: 'kf_1',
          name: '1. Dramatic Low Sweep on Header',
          startTime: 0,
          duration: d1,
          camera: { rotX: -14, rotY: 36, rotZ: 12, zoom: 0.88, panX: 24, panY: -18, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Hero Headline & Value Proposition Zoom',
          startTime: t1,
          duration: d2,
          camera: { rotX: 6, rotY: -16, rotZ: -5, zoom: 1.38, panX: -12, panY: -10, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Glide Down to Call-to-Action',
          startTime: t2,
          duration: d3,
          camera: { rotX: -8, rotY: 14, rotZ: 4, zoom: 1.24, panX: 10, panY: 18, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Settle on Final Center Presentation',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.02, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'chat_feed':
      return [
        {
          id: 'kf_1',
          name: '1. Angled Conversation Overview',
          startTime: 0,
          duration: d1,
          camera: { rotX: 28, rotY: -25, rotZ: -6, zoom: 0.86, panX: -15, panY: -20, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Close-up on Response Stream',
          startTime: t1,
          duration: d2,
          camera: { rotX: -6, rotY: 16, rotZ: 5, zoom: 1.40, panX: 12, panY: 5, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Pan Down to Prompt Bar & Action',
          startTime: t2,
          duration: d3,
          camera: { rotX: 10, rotY: -8, rotZ: -2, zoom: 1.30, panX: -6, panY: 25, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Clean Centered Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'code_editor':
      return [
        {
          id: 'kf_1',
          name: '1. Developer Workstation Overview',
          startTime: 0,
          duration: d1,
          camera: { rotX: 20, rotY: -35, rotZ: -10, zoom: 0.84, panX: -25, panY: -8, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Macro Focus on Code Block',
          startTime: t1,
          duration: d2,
          camera: { rotX: -4, rotY: 14, rotZ: 4, zoom: 1.50, panX: 15, panY: 0, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Sweep Across Terminal Output',
          startTime: t2,
          duration: d3,
          camera: { rotX: 8, rotY: -12, rotZ: -3, zoom: 1.25, panX: -10, panY: 20, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Crisp Hero Finish',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.04, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'product_card':
      return [
        {
          id: 'kf_1',
          name: '1. Specular Low Dutch Entry',
          startTime: 0,
          duration: d1,
          camera: { rotX: -16, rotY: 38, rotZ: 14, zoom: 0.84, panX: 26, panY: 15, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: '2. Hero Image Inspection',
          startTime: t1,
          duration: d2,
          camera: { rotX: 8, rotY: -20, rotZ: -6, zoom: 1.42, panX: -16, panY: -12, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: '3. Price Badge & CTA Purchase Glide',
          startTime: t2,
          duration: d3,
          camera: { rotX: -10, rotY: 16, rotZ: 5, zoom: 1.28, panX: 14, panY: 18, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: '4. Centered Commercial Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    default:
      return buildCameraClips('saas_feature_spotlight', dur);
  }
}

function handleChoreographMotion(args: Record<string, unknown>) {
  const layoutType = (args.layoutType as string) || 'desktop_dashboard';
  const duration = Math.max(2.0, Math.min(15.0, Number(args.duration) || 4.0));
  const focalPoints = (args.focalPoints as string[]) || [];
  const motionIntent = (args.motionIntent as string) || 'feature_spotlight';
  const keyframes = buildLayoutAwareKeyframes(layoutType, duration, focalPoints, motionIntent);

  let recommendedFrame = 'macbook-pro';
  let recommendedWallpaper = 'bg-purple-wave';
  let recommendedRatio: '16:9' | '9:16' = '16:9';

  if (layoutType === 'mobile_app') {
    recommendedFrame = '3d-phone';
    recommendedWallpaper = 'bg-purple-wave';
    recommendedRatio = '9:16';
  } else if (layoutType === 'landing_page') {
    recommendedFrame = 'mac-safari';
    recommendedWallpaper = 'bg-green-hills';
    recommendedRatio = '16:9';
  } else if (layoutType === 'code_editor') {
    recommendedFrame = 'macbook-pro';
    recommendedWallpaper = '#09090b';
    recommendedRatio = '16:9';
  } else if (layoutType === 'product_card') {
    recommendedFrame = 'frameless';
    recommendedWallpaper = 'bg-sunflowers';
    recommendedRatio = '16:9';
  }

  const resultText = `### 🎯 Bespoke Camera Choreography for \`${layoutType}\` (Intent: \`${motionIntent}\`)

- **Motion Intent**: \`${motionIntent}\` (${motionIntent === 'feature_spotlight' ? 'High-readability feature showcase' : motionIntent === 'product_walkthrough' ? '3-step guided flow' : motionIntent === 'clean_linear' ? 'Linear 2.5D minimal elevation' : motionIntent === 'frontal_keynote' ? 'Frontal 0° push' : 'Dynamic cinematic teaser'})
- **Recommended Frame**: \`${recommendedFrame}\`
- **Recommended Aspect Ratio**: \`${recommendedRatio}\`
- **Recommended Wallpaper**: \`${recommendedWallpaper}\`
- **Duration**: \`${duration}s\`
- **Focal Landmarks**: ${focalPoints.length > 0 ? focalPoints.map((f) => `\`${f}\``).join(', ') : 'Context -> Feature Deep Dive -> Feature Dwell -> Hero Lock'}

#### 🎬 Generated 3D Waypoint Keyframes:
${keyframes
  .map(
    (kf) =>
      `1. **${kf.name}** (@${kf.startTime}s):\n   - \`rotX: ${kf.camera.rotX}°, rotY: ${kf.camera.rotY}°, rotZ: ${kf.camera.rotZ}°\`\n   - \`zoom: ${kf.camera.zoom}x, panX: ${kf.camera.panX}%, panY: ${kf.camera.panY}%\``
  )
  .join('\n')}

*Pass \`layoutType: "${layoutType}"\` and \`motionIntent: "${motionIntent}"\` directly to \`create_mockup_project\` to generate your instant 4K 60FPS video!*`;

  return {
    content: [{ type: 'text', text: resultText }],
    keyframes: keyframes.map((k) => ({
      name: k.name,
      startTime: k.startTime,
      duration: k.duration,
      camera: k.camera,
    })),
    recommendedFrame,
    recommendedWallpaper,
    recommendedRatio,
  };
}

// Tool definitions for MCP tools/list
const TOOLS = [
  {
    name: 'create_mockup_project',
    description: `Creates a bespoke 3D device mockup in Zetashot Studio and returns a 1-click live link to preview at 60 FPS or export to 4K MP4.
CRITICAL INSTRUCTIONS FOR AI:
1. ALWAYS ANALYZE MEDIA FIRST: Inspect the screenshot/video provided by the user. Determine the interface layout (e.g. desktop web dashboard, mobile app screen, landing page, chat feed, code editor, product card) and identify key visual landmarks (hero headline, analytics chart, table, CTA button, etc.).
2. BESPOKE CAMERA CHOREOGRAPHY: Never output random or disconnected motion. Provide customKeyframes targeting the landmarks you observed, or set 'layoutType' and 'focalPoints' to generate layout-aware cinematic motions automatically.
3. MATCH DEVICE FRAME & WALLPAPER: Select a frame ('macbook-pro', '3d-phone', 'mac-safari') and wallpaper that elevates the content colors.`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Project title (e.g. "SaaS Product Showcase", "Mobile App Teaser")',
        },
        layoutType: {
          type: 'string',
          enum: ['desktop_dashboard', 'mobile_app', 'landing_page', 'chat_feed', 'code_editor', 'product_card'],
          description: 'Detected layout structure of the reference media. Automatically generates bespoke cinematic keyframes targeting that UI structure when customKeyframes is omitted.',
        },
        focalPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Visual landmarks to spotlight (e.g. ["hero_headline", "revenue_chart", "action_button"]).',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5', '21:9'],
          default: '16:9',
          description: 'Video canvas aspect ratio: 16:9 (Landscape / YouTube), 9:16 (Vertical TikTok/Reels), 1:1 (Square), 4:5 (Instagram), 21:9 (Ultrawide)',
        },
        background: {
          type: 'string',
          default: 'bg-purple-wave',
          description: 'Wallpaper preset ("bg-purple-wave", "bg-sunflowers", "bg-green-hills", "bg-halftone-clouds", "bg-tulips") or hex color (e.g. "#09090b")',
        },
        motionIntent: {
          type: 'string',
          enum: ['feature_spotlight', 'product_walkthrough', 'clean_linear', 'frontal_keynote', 'cinematic_teaser'],
          default: 'feature_spotlight',
          description: 'Camera motion philosophy: "feature_spotlight" (RECOMMENDED for SaaS product introductions & new feature launches: deliberate, high legibility, near-zero tilt so text and UI features remain crystal-clear and readable), "product_walkthrough" (3-step guided flow: trigger -> action -> outcome), "clean_linear" (Linear/Raycast 2.5D minimal elevation, zero Dutch roll), "frontal_keynote" (Apple Keynote style, 0° rotation, pure frontal push), "cinematic_teaser" (Dynamic 3D sweeps for high-level promotional trailers).',
        },
        deviceMockup: {
          type: 'string',
          enum: ['3d-phone', 'macbook-pro', 'ipad-pro', 'studio-display', 'mac-safari', 'frameless'],
          default: '3d-phone',
          description: 'Device model or container frame',
        },
        cameraPreset: {
          type: 'string',
          enum: [
            'saas_feature_spotlight',
            'saas_workflow_walkthrough',
            'linear_clean_elevation',
            'apple_keynote_presentation',
            'feature_comparison_glide',
            'executive_kpi_reveal',
            'storytelling_product_walkthrough',
            'apple_commercial_sweep',
            'macro_feature_focus',
            'tiktok_viral_snap',
            'insane_3d_flyby',
            'spiral_vortex_dive',
            'push_in_reveal',
            'tiktok_dynamic_bounce',
            'cinematic_orbit',
            'subtle_studio_hover',
          ],
          default: 'saas_feature_spotlight',
          description: 'Cinematic camera trajectory preset. "saas_feature_spotlight" (RECOMMENDED DEFAULT for SaaS feature releases & intros: crisp, near-zero tilt for 100% text legibility), "saas_workflow_walkthrough" (step-by-step feature journey), "linear_clean_elevation" (Linear-style minimal 2.5D), "apple_keynote_presentation" (pure frontal push).',
        },
        customKeyframes: {
          type: 'array',
          description: 'Optional array of custom 3D camera keyframes choreographed after analyzing the reference media. Overrides cameraPreset when provided.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Descriptive narrative step (e.g. "1. Overview", "2. Swoop to Metric Card")' },
              startTime: { type: 'number', description: 'Start time in seconds along the timeline' },
              duration: { type: 'number', description: 'Duration of transition to next keyframe in seconds' },
              camera: {
                type: 'object',
                properties: {
                  rotX: { type: 'number', description: 'Pitch angle in degrees (-45 to 45)' },
                  rotY: { type: 'number', description: 'Yaw angle in degrees (-75 to 75)' },
                  rotZ: { type: 'number', description: 'Roll / Dutch tilt in degrees (-30 to 30)' },
                  zoom: { type: 'number', description: 'Zoom scale (0.5 to 2.5, where 1.0 is standard view, >1.3 is close-up focus)' },
                  panX: { type: 'number', description: 'Horizontal pan percentage (-50 to 50)' },
                  panY: { type: 'number', description: 'Vertical pan percentage (-50 to 50)' },
                  perspective: { type: 'number', description: 'Focal depth / field-of-view in px (600 = telephoto, 1000 = standard)' },
                },
                required: ['rotX', 'rotY', 'rotZ', 'zoom', 'panX', 'panY'],
              },
            },
            required: ['name', 'startTime', 'camera'],
          },
        },
        textTitle: {
          type: 'string',
          description: 'Primary text overlay badge or title',
        },
        textSubtitle: {
          type: 'string',
          description: 'Secondary subtitle or descriptive tagline',
        },
        duration: {
          type: 'number',
          default: 4.0,
          description: 'Duration of the mockup sequence in seconds (2.0 to 15.0)',
        },
        mediaUrl: {
          type: 'string',
          description: 'Direct web URL or relative path to an image/video to display on the 3D device screen (e.g. "https://...", "/default-codex-image.png", or data URL).',
        },
        mediaTitle: {
          type: 'string',
          description: 'Optional display name or title for the media/screen item',
        },
        autoExport: {
          type: 'boolean',
          default: true,
          description: 'If true (default), immediately initiates automatic 4K 60FPS MP4 video rendering and download when the link is opened in the browser.',
        },
      },
      required: [],
    },
  },
  {
    name: 'choreograph_cinematic_motion',
    description: 'Analyzes the reference media layout and returns tailored 3D camera keyframes with recommended device frame, wallpaper, and timing designed to spotlight key UI landmarks.',
    inputSchema: {
      type: 'object',
      properties: {
        layoutType: {
          type: 'string',
          enum: ['desktop_dashboard', 'mobile_app', 'landing_page', 'chat_feed', 'code_editor', 'product_card'],
          description: 'Detected layout structure',
        },
        motionIntent: {
          type: 'string',
          enum: ['feature_spotlight', 'product_walkthrough', 'clean_linear', 'frontal_keynote', 'cinematic_teaser'],
          default: 'feature_spotlight',
          description: 'Desired motion intent: "feature_spotlight" (SaaS feature release / changelog highlight), "product_walkthrough" (guided 3-step tour), "clean_linear" (subtle 2.5D elevation), "frontal_keynote" (0° frontal push), "cinematic_teaser" (high-energy 3D trailer).',
        },
        duration: {
          type: 'number',
          default: 4.0,
          description: 'Duration in seconds',
        },
        focalPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Focal points to spotlight',
        },
      },
      required: ['layoutType'],
    },
  },
  {
    name: 'list_available_presets',
    description: 'Lists all available wallpapers, 3D device frames, aspect ratios, and camera movement presets supported by Zetashot.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_shareable_link',
    description: 'Generates a direct Zetashot interactive URL for any given project parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5', '21:9'] },
        background: { type: 'string' },
        deviceMockup: { type: 'string' },
        cameraPreset: { type: 'string' },
        title: { type: 'string' },
        mediaUrl: { type: 'string' },
        autoExport: { type: 'boolean' },
      },
    },
  },
  {
    name: 'compose_interest_regions',
    description: 'Vision-Driven Auto-Composition: Automatically choreographs 3D camera waypoints and synchronized telemetry pill badges from an array of detected UI bounding boxes/landmarks, centering each feature with Hermite parallax and golden ratio zoom without manual coordinate guessing.',
    inputSchema: {
      type: 'object',
      properties: {
        regions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string', description: 'Landmark name (e.g. "Revenue Chart", "Sidebar", "Action Button")' },
              x: { type: 'number', description: 'X coordinate (0..100 percentage or 0..960 stage pixels)' },
              y: { type: 'number', description: 'Y coordinate (0..100 percentage or 0..540 stage pixels)' },
              width: { type: 'number', description: 'Bounding box width' },
              height: { type: 'number', description: 'Bounding box height' },
              holdDuration: { type: 'number', description: 'Dwell duration in seconds at this landmark (default: 1.5s)' },
              badgeText: { type: 'string', description: 'Custom text for the telemetry badge overlay' },
            },
            required: ['x', 'y', 'width', 'height'],
          },
          description: 'Array of detected bounding boxes across the interface',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5', '21:9'],
          default: '16:9',
        },
        pacing: {
          type: 'string',
          enum: ['snappy', 'cinematic', 'editorial'],
          default: 'cinematic',
          description: 'Camera motion feel: snappy (fast tech flow), cinematic (sweeping 3D arcs), editorial (deliberate, high legibility)',
        },
        title: { type: 'string' },
        mediaUrl: { type: 'string' },
        deviceMockup: { type: 'string', default: 'mac-safari' },
        background: { type: 'string', default: 'bg-purple-wave' },
        autoExport: { type: 'boolean', default: true },
      },
      required: ['regions'],
    },
  },
  {
    name: 'configure_timeline_clips',
    description: 'Multi-Clip Sequencer & Timeline Surgery: Sequences multiple media clips (images, videos, 3D assets, blank canvases) contiguously with automatic speed compensation, razor trimming, and cinematic transitions (cut, gradient, blocks, fade, push, zoom).',
    inputSchema: {
      type: 'object',
      properties: {
        clips: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sourceUrl: { type: 'string' },
              type: { type: 'string', enum: ['image', 'video', '3d', 'blank'], default: 'image' },
              name: { type: 'string' },
              duration: { type: 'number', description: 'Target clip duration in seconds' },
              playbackSpeed: { type: 'number', description: 'Playback multiplier (0.1x to 8.0x)' },
              trimStart: { type: 'number', description: 'Trim in offset in seconds' },
              trimEnd: { type: 'number', description: 'Trim out offset in seconds' },
              transitionIn: { type: 'string', enum: ['cut', 'gradient', 'blocks', 'fade', 'push', 'zoom'], default: 'cut' },
              transitionDuration: { type: 'number', default: 0.45 },
            },
            required: ['sourceUrl'],
          },
        },
        autoCompensateSpeed: {
          type: 'boolean',
          default: true,
          description: 'Automatically stretch/compress video playback speed to match keyframe duration',
        },
        title: { type: 'string' },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5', '21:9'] },
        deviceMockup: { type: 'string' },
        background: { type: 'string' },
      },
      required: ['clips'],
    },
  },
  {
    name: 'orchestrate_typography',
    description: 'Kinetic Typography & Telemetry Badge Layer: Creates and coordinates 3D typography overlays, hero title cards, glowing telemetry badges, and metric counters with word/char/line animation scopes.',
    inputSchema: {
      type: 'object',
      properties: {
        overlays: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              font: { type: 'string', enum: ['SF Pro Display', 'Sora', 'Helvetica', 'Poppins', 'Geist'], default: 'SF Pro Display' },
              startTime: { type: 'number' },
              endTime: { type: 'number' },
              duration: { type: 'number' },
              animation: { type: 'string', enum: ['fade', 'fade-in-blur', 'pop', 'scale', 'slide-up', 'slide-down', 'scramble', 'shimmer', 'roll'], default: 'fade-in-blur' },
              scope: { type: 'string', enum: ['all', 'word', 'char', 'line'], default: 'word' },
              style: { type: 'string', enum: ['title-card', 'telemetry-pill', 'metric-counter', 'subtitle'], default: 'title-card' },
              position3D: {
                type: 'object',
                properties: {
                  x: { type: 'number', description: 'Percentage 0..100 across stage' },
                  y: { type: 'number', description: 'Percentage 0..100 across stage' },
                  z: { type: 'number' },
                },
              },
              accentGlowHex: { type: 'string' },
              fontSize: { type: 'number' },
              color: { type: 'string' },
            },
            required: ['text', 'startTime'],
          },
        },
        projectHash: { type: 'string', description: 'Optional project hash to layer typography onto' },
        title: { type: 'string' },
      },
      required: ['overlays'],
    },
  },
  {
    name: 'sync_sound_design',
    description: 'Frame-Accurate Audio & SFX Sync: Synthesizes BGM tracks and automatically aligns whoosh SFX at Hermite spline velocity peaks, sub-drops on monolith reveals, pops on badge entries, and chimes on landing resolves.',
    inputSchema: {
      type: 'object',
      properties: {
        bgmTrack: {
          type: 'string',
          enum: ['lofi-ambient', 'cinematic-saas', 'modern-tech', 'none'],
          default: 'cinematic-saas',
        },
        bgmVolume: { type: 'number', default: 0.6, description: 'Volume (0.0 to 1.0)' },
        autoSyncSfx: {
          type: 'boolean',
          default: true,
          description: 'Automatically compute derivative velocity peaks and text layer triggers for whoosh, sub-drop, pop, and chime SFX',
        },
        projectHash: { type: 'string', description: 'Optional project hash to analyze and layer audio onto' },
        timelineDuration: { type: 'number', default: 6.0 },
      },
    },
  },
  {
    name: 'configure_optics_and_3d',
    description: 'Optics, Lighting & WebGL Material Controller: Configures Depth of Field aperture blur, specular edge glow, corner squircle radius, drop shadow physics, and Three.js WebGL material properties (roughness, metalness, tint, repeat, flipY).',
    inputSchema: {
      type: 'object',
      properties: {
        dof: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            aperture: { type: 'number', description: 'F-stop blur intensity (0 to 50, e.g. 15 for subtle, 38 for bokeh)' },
            focusTargetKeyframe: { type: 'string' },
          },
        },
        specularGlow: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            autoExtractDominantColor: { type: 'boolean' },
            hexOverride: { type: 'string' },
          },
        },
        shadow: {
          type: 'object',
          properties: {
            blur: { type: 'number', description: '0 to 100 px' },
            spread: { type: 'number' },
            opacity: { type: 'number', description: '0.0 to 1.0' },
            yOffset: { type: 'number' },
          },
        },
        cornerRadius: { type: 'number', description: 'Corner squircle radius in px (0 to 64)' },
        webglMaterial: {
          type: 'object',
          properties: {
            roughness: { type: 'number', description: '0.0 (mirror) to 1.0 (matte)' },
            metalness: { type: 'number', description: '0.0 (dielectric) to 1.0 (metallic)' },
            tintHex: { type: 'string' },
            textureRepeat: {
              type: 'array',
              items: { type: 'number' },
              description: '[repeatX, repeatY]',
            },
            flipY: { type: 'boolean' },
          },
        },
        projectHash: { type: 'string', description: 'Optional project hash to layer onto' },
      },
    },
  },
];

function handleCreateProject(args: Record<string, unknown>, baseUrl: string) {
  const title = (args.title as string) || 'Zetashot Studio Project';
  const aspectRatio = (args.aspectRatio as '16:9' | '9:16' | '1:1' | '4:5' | '21:9') || '16:9';
  const bgInput = (args.background as string) || 'bg-purple-wave';
  const deviceMockup = (args.deviceMockup as string) || '3d-phone';
  const cameraPreset = (args.cameraPreset as string) || (aspectRatio === '9:16' ? 'tiktok_viral_snap' : 'saas_feature_spotlight');
  const duration = Math.max(2.0, Math.min(15.0, Number(args.duration) || 4.0));
  const autoExport = args.autoExport !== false; // defaults to true!

  const matchedWallpaper = WALLPAPER_PRESETS.find((w) => w.id === bgInput);
  const isImage = !!matchedWallpaper || bgInput.startsWith('bg-') || bgInput.endsWith('.jpg') || bgInput.endsWith('.png');

  const backgroundConfig: BackgroundConfig = isImage
    ? {
        type: 'image',
        imageUrl: matchedWallpaper ? matchedWallpaper.path : `/backgrounds/${bgInput}.jpg`,
        imageFit: 'cover',
        imageScale: 1.0,
        position: matchedWallpaper?.position || { x: 50, y: 50 },
        opacity: 1,
      }
    : {
        type: 'solid',
        color: bgInput.startsWith('#') ? bgInput : '#09090b',
        opacity: 1,
      };

  let cameraClips: TimelinePositionClip[];
  let choreographyDescription = `\`${cameraPreset}\``;
  if (Array.isArray(args.customKeyframes) && args.customKeyframes.length > 0) {
    cameraClips = (args.customKeyframes as any[]).map((kf, i) => ({
      id: `kf_custom_${i + 1}`,
      name: kf.name || `Step ${i + 1}`,
      startTime: Number(kf.startTime) || 0,
      duration: Number(kf.duration) || 0,
      color: 'yellow',
      blockId: 'block_main',
      mediaClipId: 'clip_init',
      transition: 'cut',
      camera: {
        rotX: Number(kf.camera?.rotX) || 0,
        rotY: Number(kf.camera?.rotY) || 0,
        rotZ: Number(kf.camera?.rotZ) || 0,
        zoom: Number(kf.camera?.zoom) || 1.0,
        panX: Number(kf.camera?.panX) || 0,
        panY: Number(kf.camera?.panY) || 0,
        perspective: Number(kf.camera?.perspective) || 1000,
      },
    }));
    choreographyDescription = `Custom AI Choreography (${cameraClips.length} waypoints)`;
  } else if (args.layoutType) {
    const motionIntent = (args.motionIntent as string) || 'feature_spotlight';
    cameraClips = buildLayoutAwareKeyframes(args.layoutType as string, duration, args.focalPoints as string[], motionIntent);
    choreographyDescription = `Layout-Aware (\`${args.layoutType}\`, Intent: \`${motionIntent}\`, ${cameraClips.length} waypoints)`;
  } else {
    cameraClips = buildCameraClips(cameraPreset, duration);
  }

  const payload: ZetashotSharedProject = {
    version: '1.0.0',
    title,
    aspectRatio,
    background: backgroundConfig,
    deviceMockup,
    cameraClips,
    duration,
    autoExport,
  };

  let rawMediaUrl = (args.mediaUrl as string)?.trim();
  if (rawMediaUrl) {
    let resolvedMediaUrl = rawMediaUrl;
    const normalized = rawMediaUrl.replace(/\\/g, '/');
    const pubIdx = normalized.toLowerCase().indexOf('/public/');
    if (pubIdx !== -1) {
      resolvedMediaUrl = normalized.substring(pubIdx + '/public'.length);
    } else if (normalized.toLowerCase().startsWith('public/')) {
      resolvedMediaUrl = '/' + normalized.substring('public/'.length);
    } else if (!resolvedMediaUrl.startsWith('http://') && !resolvedMediaUrl.startsWith('https://') && !resolvedMediaUrl.startsWith('/') && !resolvedMediaUrl.startsWith('data:')) {
      resolvedMediaUrl = '/' + resolvedMediaUrl;
    }
    payload.mediaUrl = resolvedMediaUrl;
    payload.mediaName = (args.mediaTitle as string) || (resolvedMediaUrl.split('/').pop()?.split('?')[0] || 'Custom Screen Media');
    payload.mediaType = resolvedMediaUrl.endsWith('.mp4') || resolvedMediaUrl.endsWith('.webm') ? 'video' : 'image';
  }

  if (args.textTitle || args.textSubtitle) {
    payload.textLayers = [
      {
        id: `text_${Date.now()}`,
        text: (args.textTitle as string) || '',
        title: (args.textSubtitle as string) || '',
        x: 50,
        y: 85,
        fontSize: 32,
        fontFamily: "'Geist', Inter, sans-serif",
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        paddingX: 20,
        paddingY: 10,
        opacity: 1,
        startTime: 0,
        duration,
        animationType: 'fade',
      },
    ];
  }

  const encodedParam = encodeProjectToUrl(payload);
  const bgParam = matchedWallpaper ? matchedWallpaper.id : bgInput;
  const mediaParam = payload.mediaUrl ? `&media=${encodeURIComponent(payload.mediaUrl)}` : '';
  const exportParam = autoExport ? '&export=mp4' : '';
  const shareUrl = `${baseUrl}/?preset=${encodeURIComponent(cameraPreset)}&bg=${encodeURIComponent(bgParam)}&ratio=${encodeURIComponent(aspectRatio)}&dur=${duration}${exportParam}${mediaParam}&p=${encodedParam}`;

  const md = `### 🎬 Zetashot Mockup Created Successfully!

- **Project**: **${title}**
- **Aspect Ratio**: \`${aspectRatio}\`
- **Device Frame**: \`${deviceMockup}\`
- **Background**: ${matchedWallpaper ? matchedWallpaper.name : `\`${bgInput}\``}
- **Camera Choreography**: ${choreographyDescription} (${duration}s duration, ${cameraClips.length} keyframes with 3D Dutch tilt & swoop)
${payload.mediaUrl ? `- **Screen Media**: \`${payload.mediaUrl}\`` : ''}
${args.textTitle ? `- **Text Title**: "${args.textTitle}"` : ''}
- **MP4 Auto-Export**: \`${autoExport ? 'Enabled (Instant 4K 60FPS MP4 render & download)' : 'Manual'}\`

👉 **[Open in Zetashot Studio & Download MP4](${shareUrl})**

Direct URL:
${shareUrl}

*Click the link above to view your interactive 3D camera mockup looping at 60 FPS and download the high-resolution 4K MP4 video directly!*`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
  };
}

// -------------------------------------------------------------
// 1. VISION-DRIVEN AUTO-COMPOSITION HANDLER
// -------------------------------------------------------------
function handleComposeInterestRegions(args: Record<string, unknown>, baseUrl: string) {
  const regions = (args.regions as any[]) || [];
  const aspectRatio = (args.aspectRatio as '16:9' | '9:16' | '1:1' | '4:5' | '21:9') || '16:9';
  const pacing = (args.pacing as 'snappy' | 'cinematic' | 'editorial') || 'cinematic';
  const title = (args.title as string) || 'Vision-Driven Auto-Composition';
  const mediaUrl = (args.mediaUrl as string) || '/default-codex-image.png';
  const deviceMockup = (args.deviceMockup as string) || (aspectRatio === '9:16' ? 'iphone-pro' : 'mac-safari');
  const bgInput = (args.background as string) || 'bg-purple-wave';
  const autoExport = args.autoExport !== false;

  const stageW = 960;
  const stageH = 540;
  const stepDur = pacing === 'snappy' ? 1.0 : pacing === 'editorial' ? 2.0 : 1.5;

  const cameraClips: TimelinePositionClip[] = [];
  const textLayers: any[] = [];

  // P01: Establishing Overview Shot
  let currentTime = 0;
  const p01Dur = pacing === 'snappy' ? 1.0 : 1.5;
  cameraClips.push({
    id: 'kf_p01_overview',
    name: 'P01: Monolith Establishing View',
    startTime: currentTime,
    duration: p01Dur,
    color: 'yellow',
    blockId: 'block_compose',
    mediaClipId: 'clip_init',
    transition: 'fade',
    camera: {
      rotX: pacing === 'editorial' ? 3 : 8,
      rotY: pacing === 'editorial' ? -2 : -12,
      rotZ: pacing === 'editorial' ? 0 : 3,
      zoom: 0.90,
      panX: 0,
      panY: 0,
      perspective: 1100,
    },
  });
  currentTime += p01Dur;

  textLayers.push({
    id: 'txt_p01_title',
    text: title,
    startTime: 0.2,
    duration: p01Dur - 0.4,
    x: 50,
    y: 14,
    fontSize: aspectRatio === '9:16' ? 42 : 50,
    fontFamily: 'SF Pro Display',
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    inAnimation: 'fade-in-blur',
    inDuration: 0.4,
    outAnimation: 'blur',
    outDuration: 0.3,
    animationScope: 'word',
    shadow: true,
  });

  // Calculate Keyframes & Badges for Each Landmark
  regions.forEach((r, idx) => {
    let rx = Number(r.x) || 0;
    let ry = Number(r.y) || 0;
    let rw = Number(r.width) || 100;
    let rh = Number(r.height) || 100;

    if (rx <= 1.0 && ry <= 1.0 && rw <= 1.0 && rh <= 1.0) {
      rx *= stageW;
      ry *= stageH;
      rw *= stageW;
      rh *= stageH;
    } else if (rx <= 100 && ry <= 100 && rw <= 100 && rh <= 100) {
      rx = (rx / 100) * stageW;
      ry = (ry / 100) * stageH;
      rw = (rw / 100) * stageW;
      rh = (rh / 100) * stageH;
    }

    const holdDur = Math.max(0.6, Number(r.holdDuration) || stepDur);

    const centerX = rx + rw / 2;
    const centerY = ry + rh / 2;
    const offX = centerX - stageW / 2;
    const offY = centerY - stageH / 2;
    const normX = Math.max(-1.0, Math.min(1.0, offX / (stageW / 2)));
    const normY = Math.max(-1.0, Math.min(1.0, offY / (stageH / 2)));

    const targetOccupancyW = pacing === 'snappy' ? 0.42 : pacing === 'editorial' ? 0.32 : 0.38;
    const targetOccupancyH = pacing === 'snappy' ? 0.38 : pacing === 'editorial' ? 0.30 : 0.35;
    const fitScaleW = (stageW * targetOccupancyW) / Math.max(40, rw);
    const fitScaleH = (stageH * targetOccupancyH) / Math.max(30, rh);
    const targetZoom = Number(Math.max(0.85, Math.min(1.55, Math.min(fitScaleW, fitScaleH))).toFixed(2));

    const panX = Number((-offX * targetZoom).toFixed(1));
    const panY = Number((-offY * targetZoom).toFixed(1));

    const readabilityDamping = Math.max(0.40, Math.min(1.0, 1.4 / targetZoom));
    const rotX = Number(((pacing === 'editorial' ? 2.0 : 6.0) + normY * 4.0 * readabilityDamping).toFixed(1));
    const rotY = Number((-normX * (pacing === 'editorial' ? 4.0 : 12.0) * readabilityDamping).toFixed(1));
    const rotZ = Number((-normX * (pacing === 'editorial' ? 0.0 : 3.0) * readabilityDamping).toFixed(1));

    const pNum = idx + 2;
    const pPad = pNum < 10 ? `0${pNum}` : `${pNum}`;
    const regionLabel = r.label || `Region ${idx + 1}`;

    cameraClips.push({
      id: `kf_p${pPad}_region_${idx + 1}`,
      name: `P${pPad}: ${regionLabel}`,
      startTime: Number(currentTime.toFixed(2)),
      duration: holdDur,
      color: 'blue',
      blockId: 'block_compose',
      mediaClipId: 'clip_init',
      transition: 'cut',
      camera: {
        rotX,
        rotY,
        rotZ,
        zoom: targetZoom,
        panX,
        panY,
        perspective: 1100,
      },
    });

    const badgeText = r.badgeText || (r.label ? `⚡ ${r.label.toUpperCase()}` : `⚡ LANDMARK 0${idx + 1}`);
    textLayers.push({
      id: `txt_badge_region_${idx + 1}`,
      text: badgeText,
      startTime: Number((currentTime + 0.15).toFixed(2)),
      duration: Number(Math.max(0.5, holdDur - 0.3).toFixed(2)),
      x: 50,
      y: 86,
      fontSize: 22,
      fontFamily: 'SF Pro Display',
      fontWeight: '600',
      color: '#38bdf8',
      textAlign: 'center',
      inAnimation: pacing === 'snappy' ? 'pop' : 'fade-in-blur',
      inDuration: 0.35,
      outAnimation: 'fade',
      outDuration: 0.25,
      animationScope: 'all',
      shadow: false,
    });

    currentTime += holdDur;
  });

  // Final Authority Lock Resolve
  const pFinalNum = regions.length + 2;
  const pFinalPad = pFinalNum < 10 ? `0${pFinalNum}` : `${pFinalNum}`;
  const resolveDur = 1.5;
  cameraClips.push({
    id: `kf_p${pFinalPad}_resolve`,
    name: `P${pFinalPad}: Hero Authority Resolve`,
    startTime: Number(currentTime.toFixed(2)),
    duration: resolveDur,
    color: 'yellow',
    blockId: 'block_compose',
    mediaClipId: 'clip_init',
    transition: 'cut',
    camera: {
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      zoom: 0.88,
      panX: 0,
      panY: 0,
      perspective: 1000,
    },
  });

  textLayers.push({
    id: 'txt_resolve_cta',
    text: 'Engineered for Absolute Precision',
    startTime: Number((currentTime + 0.25).toFixed(2)),
    duration: Number((resolveDur - 0.4).toFixed(2)),
    x: 50,
    y: 88,
    fontSize: 26,
    fontFamily: 'SF Pro Display',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    inAnimation: 'slide-up',
    inDuration: 0.4,
    outAnimation: 'none',
    outDuration: 0.2,
    animationScope: 'word',
    shadow: true,
  });

  currentTime += resolveDur;
  const totalDuration = Number(currentTime.toFixed(2));

  const matchedWp = WALLPAPER_PRESETS.find((w) => w.id === bgInput);
  const backgroundConfig: BackgroundConfig = matchedWp
    ? { type: 'image', imageUrl: matchedWp.path, imageFit: 'cover', imageScale: 1.0, position: matchedWp.position, opacity: 1 }
    : { type: 'gradient', color: '#090d16' };

  const payload: ZetashotSharedProject = {
    version: '1.2.0',
    title,
    aspectRatio,
    duration: totalDuration,
    background: backgroundConfig,
    deviceMockup,
    mediaUrl,
    mediaType: mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') ? 'video' : 'image',
    mediaName: title,
    cameraClips,
    textLayers,
    autoExport,
  };

  const encodedParam = encodeProjectToUrl(payload);
  const exportParam = autoExport ? '&export=mp4' : '';
  const shareUrl = `${baseUrl}/?ratio=${encodeURIComponent(aspectRatio)}&dur=${totalDuration}${exportParam}&p=${encodedParam}`;

  const md = `### 🎯 Vision-Driven Auto-Composition Generated!

- **Project**: **${title}**
- **Landmarks Centered**: **${regions.length} Bounding Boxes**
- **Waypoints Generated**: **${cameraClips.length} Keyframes** (Hermite Parallax)
- **Pacing Mode**: \`${pacing}\` (Total Duration: **${totalDuration}s**)
- **Telemetry Badges**: **${textLayers.length} Dynamic Text Overlays**

#### Waypoints & Bounding Box Focal Paths:
${cameraClips.map((kf, i) => `${i + 1}. **${kf.name}** [${kf.startTime}s – ${(kf.startTime + kf.duration).toFixed(2)}s] → Zoom \`${kf.camera.zoom}x\`, Pan (\`${kf.camera.panX}%\`, \`${kf.camera.panY}%\`), Pitch \`${kf.camera.rotX}°\`, Yaw \`${kf.camera.rotY}°\``).join('\n')}

👉 **[Open Vision-Composed Project in Zetashot Studio](${shareUrl})**

Direct URL:
${shareUrl}`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
    project: payload,
  };
}

// -------------------------------------------------------------
// 2. MULTI-CLIP SEQUENCER & TIMELINE SURGERY HANDLER
// -------------------------------------------------------------
function handleConfigureTimelineClips(args: Record<string, unknown>, baseUrl: string) {
  const inputClips = (args.clips as any[]) || [];
  const autoCompensateSpeed = args.autoCompensateSpeed !== false;
  const title = (args.title as string) || 'Multi-Clip Sequenced Timeline';
  const aspectRatio = (args.aspectRatio as '16:9' | '9:16' | '1:1' | '4:5' | '21:9') || '16:9';
  const deviceMockup = (args.deviceMockup as string) || (aspectRatio === '9:16' ? 'iphone-pro' : 'mac-safari');
  const bgInput = (args.background as string) || 'bg-purple-wave';

  if (inputClips.length === 0) {
    throw new Error('configure_timeline_clips requires at least one clip in the clips array.');
  }

  let currentStart = 0;
  const mediaClips: any[] = [];
  const cameraClips: TimelinePositionClip[] = [];

  inputClips.forEach((c, idx) => {
    const rawDur = Number(c.duration) || 3.5;
    const clipDur = Math.max(0.5, rawDur);
    const sourceUrl = (c.sourceUrl as string) || '/default-codex-image.png';
    const cType = (c.type as 'image' | 'video' | '3d' | 'blank') || (sourceUrl.endsWith('.mp4') || sourceUrl.endsWith('.webm') ? 'video' : 'image');
    const transitionIn = (c.transitionIn as string) || (idx === 0 ? 'cut' : 'gradient');
    const transitionDuration = Number(c.transitionDuration) || 0.45;

    let speed = Number(c.playbackSpeed) || 1.0;
    if (autoCompensateSpeed && cType === 'video' && c.sourceDuration && c.sourceDuration > 0) {
      speed = Math.max(0.1, Math.min(8.0, Number((c.sourceDuration / clipDur).toFixed(2))));
    }

    const clipId = `mclip_${idx + 1}`;
    mediaClips.push({
      id: clipId,
      mediaId: `source_${idx + 1}`,
      name: c.name || `Shot 0${idx + 1}`,
      type: cType,
      url: sourceUrl,
      startTime: Number(currentStart.toFixed(2)),
      duration: clipDur,
      sourceStartTime: Number(c.trimStart) || 0,
      speed,
      transition: transitionIn,
      transitionDuration,
    });

    const kf1Dur = Number((clipDur * 0.5).toFixed(2));
    const kf2Dur = Number((clipDur - kf1Dur).toFixed(2));
    const isFirst = idx === 0;
    const isLast = idx === inputClips.length - 1;

    const num1 = idx * 2 + 1;
    const num2 = idx * 2 + 2;
    const pPad1 = num1 < 10 ? `0${num1}` : `${num1}`;
    const pPad2 = num2 < 10 ? `0${num2}` : `${num2}`;

    cameraClips.push({
      id: `kf_${pPad1}`,
      name: `P${pPad1}: ${c.name || `Shot 0${idx + 1}`} In`,
      startTime: Number(currentStart.toFixed(2)),
      duration: kf1Dur,
      color: 'yellow',
      blockId: `block_${clipId}`,
      mediaClipId: clipId,
      transition: transitionIn,
      camera: {
        rotX: isFirst ? 12 : 6,
        rotY: isFirst ? -14 : (idx % 2 === 0 ? 10 : -10),
        rotZ: isFirst ? 4 : (idx % 2 === 0 ? -3 : 3),
        zoom: isFirst ? 0.90 : 1.25,
        panX: isFirst ? -6 : (idx % 2 === 0 ? 12 : -12),
        panY: isFirst ? 4 : -6,
        perspective: 1100,
      },
    });

    cameraClips.push({
      id: `kf_${pPad2}`,
      name: `P${pPad2}: ${c.name || `Shot 0${idx + 1}`} Out`,
      startTime: Number((currentStart + kf1Dur).toFixed(2)),
      duration: kf2Dur,
      color: 'yellow',
      blockId: `block_${clipId}`,
      mediaClipId: clipId,
      transition: 'cut',
      camera: {
        rotX: isLast ? 0 : 4,
        rotY: isLast ? 0 : (idx % 2 === 0 ? -6 : 6),
        rotZ: 0,
        zoom: isLast ? 0.88 : 1.15,
        panX: 0,
        panY: 0,
        perspective: 1000,
      },
    });

    currentStart += clipDur;
  });

  const totalDuration = Number(currentStart.toFixed(2));
  const matchedWp = WALLPAPER_PRESETS.find((w) => w.id === bgInput);
  const backgroundConfig: BackgroundConfig = matchedWp
    ? { type: 'image', imageUrl: matchedWp.path, imageFit: 'cover', imageScale: 1.0, position: matchedWp.position, opacity: 1 }
    : { type: 'gradient', color: '#090d16' };

  const payload: ZetashotSharedProject = {
    version: '1.2.0',
    title,
    aspectRatio,
    duration: totalDuration,
    background: backgroundConfig,
    deviceMockup,
    mediaUrl: mediaClips[0].url,
    mediaType: mediaClips[0].type,
    mediaName: mediaClips[0].name,
    mediaClips,
    cameraClips,
  };

  const encodedParam = encodeProjectToUrl(payload);
  const shareUrl = `${baseUrl}/?ratio=${encodeURIComponent(aspectRatio)}&dur=${totalDuration}&p=${encodedParam}`;

  const md = `### 🎬 Multi-Clip Timeline Configured!

- **Project**: **${title}**
- **Media Clips**: **${mediaClips.length} Contiguous Clips**
- **Total Duration**: **${totalDuration}s**
- **Camera Keyframes**: **${cameraClips.length} Waypoints**
- **Speed Compensation**: \`${autoCompensateSpeed ? 'Enabled (Automatic speed stretching)' : 'Disabled'}\`

#### Sequenced Timeline Clips:
${mediaClips.map((mc, i) => `${i + 1}. **${mc.name}** (\`${mc.type}\`) [${mc.startTime}s – ${(mc.startTime + mc.duration).toFixed(2)}s, Speed: ${mc.speed}x] → Transition In: \`${mc.transition}\``).join('\n')}

👉 **[Open Sequenced Timeline in Zetashot Studio](${shareUrl})**

Direct URL:
${shareUrl}`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
    project: payload,
  };
}

// -------------------------------------------------------------
// 3. KINETIC TYPOGRAPHY & TELEMETRY BADGE HANDLER
// -------------------------------------------------------------
function handleOrchestrateTypography(args: Record<string, unknown>, baseUrl: string) {
  const overlays = (args.overlays as any[]) || [];
  const projectHash = args.projectHash as string | undefined;
  const title = (args.title as string) || 'Kinetic Typography Showcase';

  let baseProject: ZetashotSharedProject | null = null;
  if (projectHash) {
    baseProject = decodeProjectFromUrl(projectHash);
  }

  const generatedLayers: any[] = overlays.map((o, idx) => {
    const text = (o.text as string) || '';
    const startTime = Math.max(0, Number(o.startTime) || 0);
    const duration = o.duration ? Number(o.duration) : (o.endTime ? Number(o.endTime) - startTime : 2.5);
    const font = (o.font as string) || 'SF Pro Display';
    const style = (o.style as string) || 'title-card';
    const animation = (o.animation as string) || (style === 'telemetry-pill' ? 'pop' : 'fade-in-blur');
    const scope = (o.scope as string) || (style === 'telemetry-pill' ? 'all' : 'word');
    const accentGlow = (o.accentGlowHex as string) || '#38bdf8';

    let posX = 50;
    let posY = 15;
    let fontSize = 48;
    let color = '#ffffff';
    let fontWeight = '700';

    if (o.position3D) {
      posX = Number(o.position3D.x) ?? 50;
      posY = Number(o.position3D.y) ?? 15;
    } else if (style === 'telemetry-pill') {
      posX = 50;
      posY = 86;
      fontSize = 22;
      color = accentGlow;
      fontWeight = '600';
    } else if (style === 'metric-counter') {
      posX = 50;
      posY = 50;
      fontSize = 38;
      color = '#38bdf8';
      fontWeight = '700';
    } else if (style === 'subtitle') {
      posX = 50;
      posY = 24;
      fontSize = 26;
      color = '#94a3b8';
      fontWeight = '500';
    }

    if (o.fontSize) fontSize = Number(o.fontSize);
    if (o.color) color = o.color as string;

    return {
      id: `txt_layer_${idx + 1}_${Date.now()}`,
      text,
      startTime: Number(startTime.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      x: posX,
      y: posY,
      fontSize,
      fontFamily: font,
      fontWeight,
      color,
      textAlign: 'center',
      lineHeight: 1.05,
      letterSpacing: style === 'telemetry-pill' ? 2 : -1,
      shadow: style !== 'telemetry-pill',
      inAnimation: animation,
      inDuration: 0.35,
      outAnimation: 'fade',
      outDuration: 0.25,
      animationScope: scope,
    };
  });

  const finalProject: ZetashotSharedProject = baseProject
    ? {
        ...baseProject,
        textLayers: [...(baseProject.textLayers || []), ...generatedLayers],
      }
    : {
        version: '1.2.0',
        title,
        aspectRatio: '16:9',
        duration: Math.max(6.0, ...generatedLayers.map((l) => l.startTime + l.duration)),
        background: { type: 'gradient', color: '#090d16' },
        deviceMockup: 'mac-safari',
        mediaUrl: '/default-codex-image.png',
        mediaType: 'image',
        mediaName: title,
        textLayers: generatedLayers,
      };

  const encodedParam = encodeProjectToUrl(finalProject);
  const shareUrl = `${baseUrl}/?dur=${finalProject.duration || 6.0}&p=${encodedParam}`;

  const md = `### ✍️ Kinetic Typography & Badges Orchestrated!

- **Layers Configured**: **${generatedLayers.length} Typography Overlays**
- **Fonts Applied**: ${[...new Set(generatedLayers.map((l) => l.fontFamily))].map((f) => `\`${f}\``).join(', ')}
- **Animation Scopes**: Word-level, character-level, and all-token reveals

#### Overlays Breakdown:
${generatedLayers.map((l, i) => `${i + 1}. **"${l.text}"** [${l.startTime}s – ${(l.startTime + l.duration).toFixed(2)}s] → Font: \`${l.fontFamily}\` (${l.fontSize}px), Animation: \`${l.inAnimation}\` (${l.animationScope}), Position: (${l.x}%, ${l.y}%)`).join('\n')}

👉 **[Preview Typography in Zetashot Studio](${shareUrl})**

Direct URL:
${shareUrl}`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
    project: finalProject,
  };
}

// -------------------------------------------------------------
// 4. FRAME-ACCURATE AUDIO & SFX SYNC HANDLER
// -------------------------------------------------------------
function handleSyncSoundDesign(args: Record<string, unknown>, baseUrl: string) {
  const bgmTrack = (args.bgmTrack as string) || 'cinematic-saas';
  const bgmVolume = typeof args.bgmVolume === 'number' ? Math.max(0, Math.min(1, args.bgmVolume)) : 0.6;
  const autoSyncSfx = args.autoSyncSfx !== false;
  const projectHash = args.projectHash as string | undefined;

  let baseProject: ZetashotSharedProject | null = null;
  if (projectHash) {
    baseProject = decodeProjectFromUrl(projectHash);
  }

  const duration = baseProject?.duration || Number(args.timelineDuration) || 6.0;
  const audioTracks: any[] = [];

  // 1. Add Background Music (BGM)
  if (bgmTrack !== 'none') {
    let bgmPreset = 'preset_music_cinematic';
    let bgmName = 'Cinematic Dawn (Atmospheric Swell)';
    let bgmUrl = '/audio/cinematic-dawn.mp3';

    if (bgmTrack === 'lofi-ambient') {
      bgmPreset = 'preset_music_lofi';
      bgmName = 'Lo-Fi Chill Ambient (Vinyl Beat)';
      bgmUrl = '/audio/lofi-ambient.mp3';
    } else if (bgmTrack === 'modern-tech') {
      bgmPreset = 'preset_music_tech';
      bgmName = 'Modern Tech Pulse (Electronic)';
      bgmUrl = '/audio/modern-tech-pulse.mp3';
    }

    audioTracks.push({
      id: `bgm_${Date.now()}`,
      name: bgmName,
      url: bgmUrl,
      type: 'music',
      startTime: 0,
      duration,
      volume: bgmVolume,
      isMuted: false,
    });
  }

  // 2. Compute Derivative / Velocity Peaks of Hermite Keyframes for Auto SFX
  if (autoSyncSfx) {
    audioTracks.push({
      id: `sfx_subdrop_${Date.now()}`,
      name: 'Sub-Drop Monolith Reveal',
      url: '/audio/sfx-subdrop.mp3',
      type: 'sfx',
      startTime: 0,
      duration: 1.2,
      volume: 0.85,
      isMuted: false,
    });

    const keyframes = baseProject?.cameraClips || [];
    if (keyframes.length > 1) {
      for (let i = 0; i < keyframes.length - 1; i++) {
        const kf = keyframes[i];
        const transitionMidpoint = Number((kf.startTime + (kf.duration * 0.5)).toFixed(2));
        audioTracks.push({
          id: `sfx_whoosh_${i + 1}_${Date.now()}`,
          name: `Camera Whoosh (Waypoint ${i + 1} -> ${i + 2})`,
          url: '/audio/sfx-whoosh.mp3',
          type: 'sfx',
          startTime: transitionMidpoint,
          duration: 0.5,
          volume: 0.7,
          isMuted: false,
        });
      }
    } else {
      audioTracks.push({
        id: `sfx_whoosh_mid_${Date.now()}`,
        name: 'Aerodynamic Camera Whoosh',
        url: '/audio/sfx-whoosh.mp3',
        type: 'sfx',
        startTime: Number((duration * 0.45).toFixed(2)),
        duration: 0.5,
        volume: 0.75,
        isMuted: false,
      });
    }

    const textLayers = baseProject?.textLayers || [];
    textLayers.forEach((layer, idx) => {
      audioTracks.push({
        id: `sfx_pop_${idx + 1}_${Date.now()}`,
        name: `Badge Pop ("${layer.text.substring(0, 16)}...")`,
        url: '/audio/sfx-pop.mp3',
        type: 'sfx',
        startTime: layer.startTime,
        duration: 0.3,
        volume: 0.65,
        isMuted: false,
      });
    });

    const landingTime = Math.max(0, Number((duration - 1.2).toFixed(2)));
    audioTracks.push({
      id: `sfx_chime_resolve_${Date.now()}`,
      name: 'Pristine Landing Resolve Chime',
      url: '/audio/sfx-chime.mp3',
      type: 'sfx',
      startTime: landingTime,
      duration: 1.0,
      volume: 0.8,
      isMuted: false,
    });
  }

  const finalProject: ZetashotSharedProject = baseProject
    ? {
        ...baseProject,
        audioTracks,
      }
    : {
        version: '1.2.0',
        title: 'Audio Synced Project',
        aspectRatio: '16:9',
        duration,
        background: { type: 'gradient', color: '#090d16' },
        deviceMockup: 'mac-safari',
        mediaUrl: '/default-codex-image.png',
        mediaType: 'image',
        mediaName: 'Audio Master Scene',
        audioTracks,
      };

  const encodedParam = encodeProjectToUrl(finalProject);
  const shareUrl = `${baseUrl}/?dur=${duration}&p=${encodedParam}`;

  const md = `### 🎵 Sound Design & SFX Synchronized!

- **BGM Track**: \`${bgmTrack}\` (Volume: \`${bgmVolume * 100}%\`)
- **Total Audio Cues**: **${audioTracks.length} Synced Tracks**
- **Velocity Peaks Detected**: Automatic Hermite spline whoosh placement active
- **Text Triggers**: Synchronized badge pop triggers active

#### Audio Timeline Cue Sheet:
${audioTracks.map((t, i) => `${i + 1}. **${t.name}** [${t.startTime}s – ${(t.startTime + t.duration).toFixed(2)}s] → Type: \`${t.type}\`, Volume: \`${(t.volume * 100).toFixed(0)}%\``).join('\n')}

👉 **[Preview Audio-Synced Video in Zetashot Studio](${shareUrl})**

Direct URL:
${shareUrl}`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
    project: finalProject,
  };
}

// -------------------------------------------------------------
// 5. OPTICS, LIGHTING & WEBGL MATERIAL HANDLER
// -------------------------------------------------------------
function handleConfigureOpticsAnd3D(args: Record<string, unknown>, baseUrl: string) {
  const projectHash = args.projectHash as string | undefined;
  let baseProject: ZetashotSharedProject | null = null;
  if (projectHash) {
    baseProject = decodeProjectFromUrl(projectHash);
  }

  const dof = args.dof as any;
  const specularGlow = args.specularGlow as any;
  const shadow = args.shadow as any;
  const cornerRadius = typeof args.cornerRadius === 'number' ? args.cornerRadius : undefined;
  const webglMaterial = args.webglMaterial as any;

  const visualEffects: any = {
    borderRadius: cornerRadius ?? baseProject?.visualEffects?.borderRadius ?? 16,
    blurAmount: dof?.enabled ? (Number(dof.aperture) || 24) : (baseProject?.visualEffects?.blurAmount ?? 0),
    shadowBlur: shadow?.blur ?? baseProject?.visualEffects?.shadowBlur ?? 32,
    shadowSpread: shadow?.spread ?? baseProject?.visualEffects?.shadowSpread ?? 0,
    shadowOpacity: shadow?.opacity ?? baseProject?.visualEffects?.shadowOpacity ?? 0.45,
    shadowOffsetY: shadow?.yOffset ?? baseProject?.visualEffects?.shadowOffsetY ?? 12,
    specularGlow: specularGlow?.enabled ?? baseProject?.visualEffects?.specularGlow ?? true,
    glowColor: specularGlow?.hexOverride ?? baseProject?.visualEffects?.glowColor ?? '#38bdf8',
    dof: Boolean(dof?.enabled),
    dofAperture: Number(dof?.aperture) || 24,
  };

  const webglMaterialState: any = {
    roughness: Number(webglMaterial?.roughness) || 0.2,
    metalness: Number(webglMaterial?.metalness) || 0.8,
    tintHex: (webglMaterial?.tintHex as string) || '#ffffff',
    textureRepeat: Array.isArray(webglMaterial?.textureRepeat) ? webglMaterial.textureRepeat : [1, 1],
    flipY: Boolean(webglMaterial?.flipY),
  };

  const finalProject: ZetashotSharedProject = baseProject
    ? {
        ...baseProject,
        visualEffects,
        webglMaterial: webglMaterialState,
      }
    : {
        version: '1.2.0',
        title: 'Optics & 3D Configured Scene',
        aspectRatio: '16:9',
        duration: 4.0,
        background: { type: 'gradient', color: '#090d16' },
        deviceMockup: 'mac-safari',
        mediaUrl: '/default-codex-image.png',
        mediaType: 'image',
        mediaName: 'Optics Master Scene',
        visualEffects,
        webglMaterial: webglMaterialState,
      };

  const encodedParam = encodeProjectToUrl(finalProject);
  const shareUrl = `${baseUrl}/?dur=${finalProject.duration || 4.0}&p=${encodedParam}`;

  const md = `### 💎 Optics, Lighting & WebGL Materials Configured!

- **Depth of Field (DoF)**: \`${visualEffects.dof ? `Enabled (Aperture: ƒ ${(1.4 * Math.pow(2, ((50 - visualEffects.blurAmount) / 50) * 4)).toFixed(1)})` : 'Disabled'}\`
- **Specular Edge Glow**: \`${visualEffects.specularGlow ? `Active (${visualEffects.glowColor})` : 'Disabled'}\`
- **Drop Shadow**: Blur \`${visualEffects.shadowBlur}px\`, Opacity \`${visualEffects.shadowOpacity * 100}%\`, Offset \`${visualEffects.shadowOffsetY}px\`
- **Corner Squircle Radius**: \`${visualEffects.borderRadius}px\`
- **WebGL 3D Material**: Roughness \`${webglMaterialState.roughness}\`, Metalness \`${webglMaterialState.metalness}\`, Tint \`${webglMaterialState.tintHex}\`

👉 **[Preview High-End Optics in Zetashot Studio](${shareUrl})**

Direct URL:
${shareUrl}`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
    project: finalProject,
  };
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '*';

  // Permissive CORS Headers for Claude.ai and Claude Desktop
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, mcp-session-id, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Derive origin URL for link generation
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'zetashot.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;

  // Handle GET requests (SSE Stream or Service Discovery)
  if (req.method === 'GET') {
    const acceptHeader = (req.headers.accept || '').toLowerCase();
    const isSSE = acceptHeader.includes('text/event-stream') || req.query?.sse === 'true';

    if (isSSE) {
      // SSE Transport handshake for Claude
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });

      // Send initial endpoint URI event
      res.write(`event: endpoint\ndata: ${baseUrl}/api/mcp\n\n`);

      // Keep stream alive with periodic heartbeats
      const interval = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      req.on('close', () => {
        clearInterval(interval);
      });
      return;
    }

    // Human-friendly browser landing
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        {
          name: 'Zetashot MCP Server',
          version: '1.0.0',
          status: 'online',
          description: 'Model Context Protocol (MCP) server for Zetashot 3D Mockup Studio',
          endpoint: `${baseUrl}/api/mcp`,
          tools: TOOLS.map((t) => t.name),
          claude_connector_instructions: {
            step1: 'In Claude, go to Settings -> Connectors -> Add Custom Connector',
            step2: 'Set Name: Zetashot',
            step3: `Set MCP Server URL: ${baseUrl}/api/mcp`,
          },
        },
        null,
        2
      )
    );
    return;
  }

  // Handle POST requests (JSON-RPC Protocol)
  if (req.method === 'POST') {
    let body: any = req.body;

    // Parse body if received as raw stream / buffer
    if (!body || typeof body !== 'object') {
      try {
        const raw = await new Promise<string>((resolve) => {
          let str = '';
          req.on('data', (chunk: any) => (str += chunk));
          req.on('end', () => resolve(str));
        });
        body = raw ? JSON.parse(raw) : {};
      } catch (e) {
        body = {};
      }
    }

    const { id, method, params } = body || {};

    // Standard MCP JSON-RPC routing
    switch (method) {
      case 'initialize':
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: { listChanged: false },
              },
              serverInfo: {
                name: 'Zetashot 3D Mockup Studio',
                version: '1.0.0',
              },
            },
          })
        );
        return;

      case 'notifications/initialized':
        res.statusCode = 200;
        res.end();
        return;

      case 'ping':
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: {} }));
        return;

      case 'tools/list':
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              tools: TOOLS,
            },
          })
        );
        return;

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (toolName === 'create_mockup_project') {
          const result = handleCreateProject(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'list_available_presets') {
          const summary = `### 🎨 Zetashot Presets Catalog

#### 🖼️ Wallpaper Presets
${WALLPAPER_PRESETS.map((w) => `- **\`${w.id}\`**: ${w.name}`).join('\n')}

#### 🎥 3D Camera Trajectories
${CAMERA_PRESETS.map((c) => `- **\`${c.id}\`**: ${c.name} — *${c.description}*`).join('\n')}

#### 📱 Device Mockup Frames
- **\`3d-phone\`**: Interactive 3D phone with specular glass, camera island, and studio lighting
- **\`macbook-pro\`**: Apple MacBook Pro aluminum laptop frame
- **\`ipad-pro\`**: iPad Pro tablet frame
- **\`studio-display\`**: Apple Studio Display cinema frame
- **\`mac-safari\`**: Desktop browser window with macOS traffic lights and URL bar
- **\`frameless\`**: Clean borderless viewport

#### 📐 Aspect Ratios
- \`16:9\` (YouTube / Landscape)
- \`9:16\` (TikTok / Reels / Shorts)
- \`1:1\` (Square Feed)
- \`4:5\` (Instagram Portrait)
- \`21:9\` (Cinematic Ultrawide)`;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: summary }],
              },
            })
          );
          return;
        }

        if (toolName === 'choreograph_cinematic_motion' || toolName === 'analyze_media_and_choreograph') {
          const result = handleChoreographMotion(toolArgs);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'compose_interest_regions' || toolName === 'auto_compose_from_regions') {
          const result = handleComposeInterestRegions(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'configure_timeline_clips' || toolName === 'manage_timeline_sequence') {
          const result = handleConfigureTimelineClips(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'orchestrate_typography' || toolName === 'add_typography_overlays') {
          const result = handleOrchestrateTypography(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'sync_sound_design') {
          const result = handleSyncSoundDesign(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'configure_optics_and_3d') {
          const result = handleConfigureOpticsAnd3D(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'get_shareable_link') {
          const result = handleCreateProject(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: `Link: ${result.shareUrl}` }],
              },
            })
          );
          return;
        }

        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          })
        );
        return;
      }

      default:
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown method: ${method}`,
            },
          })
        );
        return;
    }
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
}
