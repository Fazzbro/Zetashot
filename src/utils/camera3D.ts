export interface Camera3DState {
  rotX: number; // Pitch: -85deg to +85deg
  rotY: number; // Yaw: -85deg to +85deg
  rotZ: number; // Roll: -180deg to +180deg
  zoom: number; // 0.25 to 3.0
  panX: number;
  panY: number;
  perspective: number; // e.g. 1000px
}

export interface PerspectivePreset {
  id: string;
  name: string;
  shortLabel: string;
  rotX: number;
  rotY: number;
  rotZ: number;
  zoom: number;
}

export const PERSPECTIVE_PRESETS: PerspectivePreset[] = [
  {
    id: 'front',
    name: 'Front View',
    shortLabel: '0 / 0 / 0',
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    zoom: 1.0,
  },
  {
    id: 'side-angle',
    name: 'Side Angle',
    shortLabel: '+15 / −45 / 0',
    rotX: 15,
    rotY: -45,
    rotZ: 0,
    zoom: 1.15,
  },
  {
    id: 'isometric',
    name: 'Isometric',
    shortLabel: '+30 / +45 / 0',
    rotX: 30,
    rotY: 45,
    rotZ: 0,
    zoom: 1.1,
  },
  {
    id: 'top-diagonal',
    name: 'Top Diagonal',
    shortLabel: '+65 / 0 / −45',
    rotX: 65,
    rotY: 0,
    rotZ: -45,
    zoom: 1.25,
  },
  {
    id: 'reverse-isometric',
    name: 'Reverse Isometric',
    shortLabel: '−20 / +45 / 0',
    rotX: -20,
    rotY: 45,
    rotZ: 0,
    zoom: 1.1,
  },
];

export function clampRotation(angle: number, min: number = -85, max: number = 85): number {
  return Math.max(min, Math.min(max, angle));
}

export function calculate3DTransform(camera: Camera3DState): string {
  const { rotX, rotY, rotZ, zoom, panX, panY } = camera;
  return `translate3d(${panX}px, ${panY}px, 0) scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
}

export function interpolateCamera3D(
  from: Camera3DState,
  to: Camera3DState,
  progress: number
): Camera3DState {
  const p = Math.max(0, Math.min(1, progress));
  return {
    rotX: from.rotX + (to.rotX - from.rotX) * p,
    rotY: from.rotY + (to.rotY - from.rotY) * p,
    rotZ: from.rotZ + (to.rotZ - from.rotZ) * p,
    zoom: from.zoom + (to.zoom - from.zoom) * p,
    panX: from.panX + (to.panX - from.panX) * p,
    panY: from.panY + (to.panY - from.panY) * p,
    perspective: from.perspective + (to.perspective - from.perspective) * p,
  };
}
