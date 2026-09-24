import { Camera3DState } from './camera3D';
import { TimelinePositionClip } from '../components/VideoTimeline';

export interface InterestRegion {
  id: string;
  index: number; // 1, 2, 3...
  x: number; // in pixels relative to stage (0..960)
  y: number; // in pixels relative to stage (0..540)
  width: number;
  height: number;
  label?: string;
}

export type ChoreographyStyle = 'cinematic' | 'orbit' | 'showcase' | 'macro';

export const STAGE_BASE_DIMS = { width: 960, height: 540 };

/**
 * Computes intelligent golden-ratio bounding-box framing zoom.
 * Adapts seamlessly between micro-details (e.g. buttons, icons, avatars)
 * and larger cards/sections with sigmoidal soft-knee damping.
 */
export const DEFAULT_COMPOSE_STEP_DURATION = 1.0; // 1.0s per interest region by default

export function solveIntelligentFramingZoom(
  region: { width: number; height: number },
  stageDims: { width: number; height: number } = STAGE_BASE_DIMS,
  baseZoom: number = 0.72,
  style: ChoreographyStyle = 'cinematic'
): number {
  const safeW = Math.max(40, region.width);
  const safeH = Math.max(30, region.height);

  // Target viewport occupancy for readable, balanced SaaS framing (~32% - 44%)
  // Generous breathing room so the mockup frame and UI context remain comfortably visible
  const targetOccupancyW = style === 'macro' ? 0.44 : style === 'showcase' ? 0.32 : 0.38;
  const targetOccupancyH = style === 'macro' ? 0.40 : style === 'showcase' ? 0.30 : 0.35;

  const fitScaleW = (stageDims.width * targetOccupancyW) / safeW;
  const fitScaleH = (stageDims.height * targetOccupancyH) / safeH;

  // Primary bounding-box fit: ensures content fills the frame comfortably while keeping surroundings in context
  const boundingFit = Math.min(fitScaleW, fitScaleH);

  // High-end SaaS target zoom: micro elements zoom up to 1.20x-1.30x; large cards zoom 0.85x-1.10x
  const minFocusZoom = Math.max(0.85, (baseZoom || 0.72) + 0.12);
  const baseStyleMax = style === 'macro' ? 1.38 : style === 'showcase' ? 1.15 : 1.25;
  const maxFocusZoom = Math.max(minFocusZoom, Math.min(1.45, Math.max(baseStyleMax, minFocusZoom + 0.10)));

  // Soft clamp boundingFit
  const targetZoom = Math.max(minFocusZoom, Math.min(maxFocusZoom, boundingFit));
  return Number(targetZoom.toFixed(2));
}

/**
 * Calculates dynamic cinematic camera framing (Auto X, Y, Z + Pan & Zoom) for an interest region.
 * Uses 3D physical parallax angles to create depth and authentic dimensionality.
 */
export function calculateCameraForRegion(
  region: InterestRegion,
  stageDims: { width: number; height: number } = STAGE_BASE_DIMS,
  baseCamera?: Camera3DState,
  perspective: number = 1000,
  enableCinematic3D: boolean = true,
  style: ChoreographyStyle = 'cinematic'
): Camera3DState {
  const regionCenterX = region.x + region.width / 2;
  const regionCenterY = region.y + region.height / 2;
  const stageCenterX = stageDims.width / 2;
  const stageCenterY = stageDims.height / 2;

  const offsetX = regionCenterX - stageCenterX;
  const offsetY = regionCenterY - stageCenterY;

  // Normalized offset from stage center (-1.0 to +1.0)
  const normX = Math.max(-1.0, Math.min(1.0, offsetX / (stageDims.width / 2)));
  const normY = Math.max(-1.0, Math.min(1.0, offsetY / (stageDims.height / 2)));

  // 1. Intelligent Context-Aware Zoom (Crisp, readable, prominent framing)
  const baseZoom = baseCamera?.zoom && baseCamera.zoom > 0 ? baseCamera.zoom : 0.90;
  const targetZoom = solveIntelligentFramingZoom(region, stageDims, baseZoom, style);

  // 2. Exact Centering Pan with Momentum Damping
  const panX = Number((-offsetX * targetZoom).toFixed(1));
  const panY = Number((-offsetY * targetZoom).toFixed(1));

  // 3. Cinematic Dynamic 3D Parallax Angles (Auto X, Y, Z)
  // Subtle damping at high zoom to ensure text and UI content remain razor-sharp and easily readable
  const readabilityDamping = Math.max(0.40, Math.min(1.0, 1.4 / targetZoom));

  let rotX = baseCamera?.rotX ?? 0;
  let rotY = baseCamera?.rotY ?? 0;
  let rotZ = baseCamera?.rotZ ?? 0;

  if (enableCinematic3D) {
    if (style === 'orbit') {
      // Dynamic Orbital Arc: Wider sweeping yaw & roll
      rotX = Number(((5.0 + normY * 7.0) * readabilityDamping).toFixed(1));
      rotY = Number((-normX * 14.0 * readabilityDamping).toFixed(1));
      rotZ = Number((-3.0 - normX * 2.0 * readabilityDamping).toFixed(1));
    } else if (style === 'showcase') {
      // SaaS Clean View: Minimal tilt, maximum UI readability (Linear / Stripe style)
      rotX = Number(((3.0 + normY * 4.0) * readabilityDamping).toFixed(1));
      rotY = Number((-normX * 6.5 * readabilityDamping).toFixed(1));
      rotZ = Number((-normX * 1.2 * readabilityDamping).toFixed(1));
    } else if (style === 'macro') {
      // Macro Drone: Deep dramatic perspective
      rotX = Number(((6.0 + normY * 8.5) * readabilityDamping).toFixed(1));
      rotY = Number((-normX * 12.0 * readabilityDamping).toFixed(1));
      rotZ = Number((-3.0 - normX * 2.0 * readabilityDamping).toFixed(1));
    } else {
      // Standard Cinematic Studio (Apple/Stripe grade)
      rotX = Number(((4.5 + normY * 7.5) * readabilityDamping).toFixed(1));
      rotY = Number((-normX * 13.0 * readabilityDamping).toFixed(1));
      rotZ = Number((-2.0 - normX * 1.5 * readabilityDamping).toFixed(1));
    }
  }

  // Dynamic subtle perspective modulation for enhanced depth pop without distortion
  const basePersp = style === 'macro' ? 850 : perspective;
  const dynamicPerspective = Math.round(basePersp * (1 + (targetZoom - 1.0) * 0.15));

  return {
    rotX,
    rotY,
    rotZ,
    zoom: targetZoom,
    panX,
    panY,
    perspective: dynamicPerspective,
  };
}

export function generateClipsFromInterestRegions(
  regions: InterestRegion[],
  totalDuration: number,
  stageDims: { width: number; height: number } = STAGE_BASE_DIMS,
  baseCamera?: Camera3DState,
  style: ChoreographyStyle = 'cinematic',
  options?: {
    blockId?: string;
    mediaClipId?: string;
    startKeyframeIndex?: number;
  }
): TimelinePositionClip[] {
  if (!regions || regions.length === 0) return [];

  const sortedRegions = [...regions].sort((a, b) => a.index - b.index);
  const K = sortedRegions.length;
  const stepDuration = (totalDuration && totalDuration > 0 ? totalDuration : K * DEFAULT_COMPOSE_STEP_DURATION) / K;
  const blockGroupId = options?.blockId || `compose_block_${Date.now()}`;
  const startIdx = options?.startKeyframeIndex ?? 1;

  const clips: TimelinePositionClip[] = [];

  // 1. Initial Overview Keyframe (e.g. P01) - Cinematic floating 3D wide overview
  const baseZoom = baseCamera?.zoom && baseCamera.zoom > 0 ? baseCamera.zoom : 0.90;
  const firstRegion = sortedRegions[0];
  const firstRegionCenterX = firstRegion.x + firstRegion.width / 2;
  const isFirstOnLeft = firstRegionCenterX < stageDims.width / 2;

  const hasCustomAngle = baseCamera && (baseCamera.rotX !== 0 || baseCamera.rotY !== 0);

  const overviewCamera: Camera3DState = {
    rotX: hasCustomAngle ? baseCamera!.rotX : (style === 'showcase' ? 5 : 9),
    rotY: hasCustomAngle ? baseCamera!.rotY : (isFirstOnLeft ? -13 : 13),
    rotZ: baseCamera?.rotZ && baseCamera.rotZ !== 0 ? baseCamera.rotZ : (style === 'showcase' ? 0 : -3.5),
    zoom: baseZoom,
    panX: baseCamera?.panX && baseCamera.panX !== 0 ? baseCamera.panX : 0,
    panY: baseCamera?.panY && baseCamera.panY !== 0 ? baseCamera.panY : 0,
    perspective: baseCamera?.perspective ?? 1000,
  };

  const p1Pad = startIdx < 10 ? `0${startIdx}` : `${startIdx}`;

  clips.push({
    id: `compose_p${p1Pad}_${Date.now()}_0`,
    name: `P${p1Pad}`,
    startTime: 0,
    duration: Number(stepDuration.toFixed(2)),
    camera: overviewCamera,
    color: 'blue',
    transition: 'fade',
    blockId: blockGroupId,
    mediaClipId: options?.mediaClipId,
  });

  // 2. Interest Region Focus Keyframes (e.g. P02, P03, ... P{K+1})
  let prevCenter: { x: number; y: number } | null = null;
  let prevZoom: number = baseZoom;

  sortedRegions.forEach((region, idx) => {
    const num = startIdx + idx + 1;
    const pad = num < 10 ? `0${num}` : `${num}`;
    let targetCam = calculateCameraForRegion(
      region,
      stageDims,
      baseCamera,
      baseCamera?.perspective ?? 1000,
      true,
      style
    );

    const currCenter = {
      x: region.x + region.width / 2,
      y: region.y + region.height / 2,
    };

    // Avoid sudden zoom oscillations if two consecutive regions are very close
    if (prevCenter) {
      const dist = Math.hypot(currCenter.x - prevCenter.x, currCenter.y - prevCenter.y);
      if (dist < 70) {
        targetCam = {
          ...targetCam,
          zoom: prevZoom,
        };
      }
    }

    prevCenter = currCenter;
    prevZoom = targetCam.zoom;

    const keyframeTime = Number(((idx + 1) * stepDuration).toFixed(2));

    clips.push({
      id: `compose_p${pad}_${Date.now()}_${idx + 1}`,
      name: `P${pad}`,
      startTime: keyframeTime,
      duration: idx === K - 1 ? 0 : Number(stepDuration.toFixed(2)),
      camera: targetCam,
      color: 'blue',
      exitTransition: idx === K - 1 ? 'fade' : 'cut',
      blockId: blockGroupId,
      mediaClipId: options?.mediaClipId,
    });
  });

  return clips;
}
