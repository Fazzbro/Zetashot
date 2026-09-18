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
export function solveIntelligentFramingZoom(
  region: { width: number; height: number },
  stageDims: { width: number; height: number } = STAGE_BASE_DIMS,
  baseZoom: number = 0.72,
  style: ChoreographyStyle = 'cinematic'
): number {
  const safeW = Math.max(30, region.width);
  const safeH = Math.max(30, region.height);

  // Golden ratio target occupancy (~46% of active viewport)
  const targetOccupancy = style === 'macro' ? 0.60 : style === 'showcase' ? 0.42 : 0.48;
  const fitScaleW = (stageDims.width * targetOccupancy) / safeW;
  const fitScaleH = (stageDims.height * targetOccupancy) / safeH;

  // Soft-knee sigmoidal mapping relative to base zoom
  const regionArea = safeW * safeH;
  const stageArea = stageDims.width * stageDims.height;
  const areaRatio = Math.max(0.01, Math.min(1.0, regionArea / stageArea));

  let zoomBoost = 0.08;
  if (areaRatio < 0.05) {
    // Micro UI detail (button, icon, tag) -> High-definition push-in
    zoomBoost = style === 'macro' ? 0.32 : 0.22 + (0.05 - areaRatio) * 1.2;
  } else if (areaRatio < 0.15) {
    // Small card, dropdown, or modal section
    zoomBoost = style === 'macro' ? 0.20 : 0.14 + (0.15 - areaRatio) * 0.5;
  } else if (areaRatio < 0.35) {
    // Medium column or form block
    zoomBoost = style === 'showcase' ? 0.05 : 0.08;
  } else {
    // Large hero or full-stage section
    zoomBoost = 0.02;
  }

  // Combined weighted zoom calculation
  const calculatedZoom = baseZoom + zoomBoost;
  const maxZoom = style === 'macro' ? 1.45 : style === 'showcase' ? 1.25 : 1.35;
  return Number(Math.max(0.70, Math.min(maxZoom, calculatedZoom)).toFixed(2));
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

  // 1. Intelligent Context-Aware Zoom
  const baseZoom = baseCamera?.zoom && baseCamera.zoom > 0 ? baseCamera.zoom : 0.72;
  const targetZoom = solveIntelligentFramingZoom(region, stageDims, baseZoom, style);

  // 2. Exact Centering Pan with Momentum Damping
  const panX = Number((-offsetX * targetZoom).toFixed(1));
  const panY = Number((-offsetY * targetZoom).toFixed(1));

  // 3. Cinematic Dynamic 3D Parallax Angles (Auto X, Y, Z)
  let rotX = baseCamera?.rotX ?? 0;
  let rotY = baseCamera?.rotY ?? 0;
  let rotZ = baseCamera?.rotZ ?? 0;

  if (enableCinematic3D) {
    if (style === 'orbit') {
      // Dynamic Orbital Arc: Wider sweeping yaw & roll
      rotX = Number((6.0 + normY * 10.0).toFixed(1));
      rotY = Number((-normX * 20.0).toFixed(1));
      rotZ = Number((-4.5 - normX * 3.5).toFixed(1));
    } else if (style === 'showcase') {
      // SaaS Clean View: Minimal tilt, maximum UI readability
      rotX = Number((4.0 + normY * 5.0).toFixed(1));
      rotY = Number((-normX * 8.0).toFixed(1));
      rotZ = Number((-normX * 1.5).toFixed(1));
    } else if (style === 'macro') {
      // Macro Drone: Deep dramatic perspective
      rotX = Number((8.0 + normY * 12.0).toFixed(1));
      rotY = Number((-normX * 16.0).toFixed(1));
      rotZ = Number((-4.0 - normX * 3.0).toFixed(1));
    } else {
      // Standard Cinematic Studio (Apple/Stripe grade)
      rotX = Number((5.5 + normY * 8.5).toFixed(1));
      rotY = Number((-normX * 14.0).toFixed(1));
      rotZ = Number((-3.2 - normX * 2.2).toFixed(1));
    }
  }

  // Dynamic subtle perspective modulation for enhanced depth pop
  const basePersp = style === 'macro' ? 850 : perspective;
  const dynamicPerspective = Math.round(basePersp * (1 - (targetZoom - 0.70) * 0.15));

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

/**
 * Generates choreographed timeline position clips from an ordered list of interest regions.
 * For K interest points, creates K+1 sets inside a single unified sequence block:
 * - P01: Initial overview / wide angle entrance (at t = 0)
 * - P02: First interest point focus (at t = stepDuration)
 * - P03: Second interest point focus
 * - ...
 * - P{K+1}: K-th interest point focus (at t = totalDuration)
 */
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
  const stepDuration = totalDuration / K;
  const blockGroupId = options?.blockId || `compose_block_${Date.now()}`;
  const startIdx = options?.startKeyframeIndex ?? 1;

  const clips: TimelinePositionClip[] = [];

  // 1. Initial Overview Keyframe (e.g. P01) - Cinematic floating 3D wide overview
  const baseZoom = baseCamera?.zoom && baseCamera.zoom > 0 ? baseCamera.zoom : 0.72;
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
