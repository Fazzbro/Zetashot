import { TimelinePositionClip } from '../components/VideoTimeline';

export const CAMERA_PRESET_ITEMS = [
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
  { id: 'static_frontal', name: 'Static Frontal', description: 'Clean centered presentation without rotation' },
];

export function buildCameraClipsFromPreset(preset: string, duration: number = 4.0): TimelinePositionClip[] {
  const dur = Math.max(2.0, Math.min(30.0, duration || 4.0));
  const t1 = Number((dur * 0.33).toFixed(2));
  const t2 = Number((dur * 0.66).toFixed(2));
  const d1 = t1;
  const d2 = Number((t2 - t1).toFixed(2));
  const d3 = Number((dur - t2).toFixed(2));

  const baseProps = { color: 'yellow', blockId: 'block_main', mediaClipId: 'clip_init', transition: 'cut' as const };

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
      return buildCameraClipsFromPreset('saas_feature_spotlight', dur);
  }
}
