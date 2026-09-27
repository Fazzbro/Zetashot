import { TimelinePositionClip } from '../components/VideoTimeline';

export const CAMERA_PRESET_ITEMS = [
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
  }
}
