import zlib from 'node:zlib';

interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'transparent';
  color?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageScale?: number;
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
  mediaType?: 'image' | 'video' | '3d';
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
    backgroundColor: string;
    borderRadius: number;
    paddingX: number;
    paddingY: number;
    opacity: number;
    startTime: number;
    duration: number;
    animationType: string;
  }>;
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
    default:
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
