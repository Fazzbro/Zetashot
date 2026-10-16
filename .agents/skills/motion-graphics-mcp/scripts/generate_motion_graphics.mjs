#!/usr/bin/env node

/**
 * Autonomous Motion Graphics Generator for MCP Servers and Automation Pipelines
 * 
 * Generates production-grade SaaS product motion graphics videos matching the craft
 * of Linear, Apple, Stripe, and Raycast.
 * 
 * Features:
 * - Ingests image/video source assets or blank canvases.
 * - Choreographs 7-DOF camera keyframes (rotX, rotY, rotZ, zoom, panX, panY, perspective).
 * - Enforces anti-slop rules (Dutch roll <= 14 deg, smooth velocity damping, hero perpendicular resolve).
 * - Generates contextual typography layers (hero headings, glowing pill badges, metric highlights).
 * - Selects cinematic transitions (cuts, gradient wipes, block transitions).
 * - Emits valid Zetashot project JSON, URL hash (#project=...), and export commands.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deflateSync, strToU8 } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. THEMES & AESTHETIC PALETTES
// ==========================================
const THEMES = {
  'dark-monolith': {
    name: 'Dark Monolith (Linear/Raycast aesthetic)',
    background: {
      type: 'gradient',
      gradientType: 'radial',
      color1: '#090d16',
      color2: '#020408',
      angle: 135,
    },
    accentColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    fontFamily: 'SF Pro Display',
    deviceMockup: 'mac-safari',
  },
  'linear-speed': {
    name: 'Linear Speed (High-velocity telemetry)',
    background: {
      type: 'gradient',
      gradientType: 'linear',
      color1: '#0f172a',
      color2: '#09090b',
      angle: 145,
    },
    accentColor: '#818cf8',
    badgeBg: 'rgba(129, 140, 248, 0.15)',
    badgeBorder: 'rgba(129, 140, 248, 0.4)',
    textColor: '#ffffff',
    subtextColor: '#a1a1aa',
    fontFamily: 'Sora',
    deviceMockup: 'mac-safari',
  },
  'stripe-clean': {
    name: 'Stripe Clean (Architectural clarity)',
    background: {
      type: 'gradient',
      gradientType: 'linear',
      color1: '#1e1b4b',
      color2: '#0f172a',
      angle: 120,
    },
    accentColor: '#6366f1',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeBorder: 'rgba(99, 102, 241, 0.4)',
    textColor: '#ffffff',
    subtextColor: '#cbd5e1',
    fontFamily: 'Helvetica',
    deviceMockup: 'mac-safari',
  },
  'apple-minimal': {
    name: 'Apple Minimal (Museum-grade elegance)',
    background: {
      type: 'gradient',
      gradientType: 'radial',
      color1: '#18181b',
      color2: '#09090b',
      angle: 0,
    },
    accentColor: '#e4e4e7',
    badgeBg: 'rgba(255, 255, 255, 0.1)',
    badgeBorder: 'rgba(255, 255, 255, 0.25)',
    textColor: '#ffffff',
    subtextColor: '#a1a1aa',
    fontFamily: 'SF Pro Display',
    deviceMockup: 'mac-safari',
  },
};

// ==========================================
// 2. NARRATIVE PACING ARTHETYPES
// ==========================================
const PACING_PRESETS = {
  'launch-teaser': {
    name: '15-second High-Impact Launch Teaser',
    defaultDurationPerClip: 3.5,
    beats: [
      { role: 'hook', rotX: 14, rotY: -16, rotZ: 5, zoom: 0.88, panX: -8, panY: 6, perspective: 1050 },
      { role: 'dive', rotX: 8, rotY: 12, rotZ: -4, zoom: 1.25, panX: 12, panY: -8, perspective: 1100 },
      { role: 'velocity', rotX: -4, rotY: -8, rotZ: 3, zoom: 1.10, panX: -6, panY: 4, perspective: 1000 },
      { role: 'resolve', rotX: 0, rotY: 0, rotZ: 0, zoom: 0.86, panX: 0, panY: 0, perspective: 1000 },
    ],
  },
  'product-walkthrough': {
    name: '30-second Architectural Product Walkthrough',
    defaultDurationPerClip: 4.5,
    beats: [
      { role: 'overview', rotX: 10, rotY: -10, rotZ: 3, zoom: 0.85, panX: 0, panY: 4, perspective: 1150 },
      { role: 'feature-left', rotX: 6, rotY: 14, rotZ: -3, zoom: 1.30, panX: -14, panY: -6, perspective: 1200 },
      { role: 'feature-right', rotX: 8, rotY: -12, rotZ: 2, zoom: 1.35, panX: 14, panY: 6, perspective: 1200 },
      { role: 'resolve', rotX: 0, rotY: 0, rotZ: 0, zoom: 0.90, panX: 0, panY: 0, perspective: 1000 },
    ],
  },
  'social-reel': {
    name: '10-second 9:16 Vertical Kinetic Reel',
    defaultDurationPerClip: 2.5,
    beats: [
      { role: 'punchy-entry', rotX: 18, rotY: -12, rotZ: 8, zoom: 0.95, panX: -4, panY: 8, perspective: 950 },
      { role: 'macro-detail', rotX: 6, rotY: 8, rotZ: -5, zoom: 1.45, panX: 6, panY: -10, perspective: 1050 },
      { role: 'fast-sweep', rotX: -6, rotY: -10, rotZ: 4, zoom: 1.15, panX: -4, panY: 4, perspective: 1000 },
      { role: 'resolve', rotX: 0, rotY: 0, rotZ: 0, zoom: 0.92, panX: 0, panY: 0, perspective: 1000 },
    ],
  },
};

// ==========================================
// 3. CORE CHOREOGRAPHY ENGINE
// ==========================================

/**
 * Encodes a project object into the base64url compressed URL hash format
 */
export function encodeProjectHash(projectData) {
  try {
    const jsonStr = JSON.stringify(projectData);
    const u8 = strToU8(jsonStr);
    const compressed = deflateSync(u8, { level: 9 });
    const buffer = Buffer.from(compressed);
    return buffer.toString('base64url');
  } catch (err) {
    console.error('Failed to compress project payload:', err);
    return '';
  }
}

/**
 * Automatically choreographs 7-DOF camera keyframes, transitions, and text typography overlays
 */
export function generateMotionGraphicsProject(options = {}) {
  const {
    title = 'Automated SaaS Showcase',
    sources = [],
    preset = 'launch-teaser',
    themeName = 'dark-monolith',
    aspectRatio = '16:9',
    autoExport = false,
  } = options;

  const theme = THEMES[themeName] || THEMES['dark-monolith'];
  const pacing = PACING_PRESETS[preset] || PACING_PRESETS['launch-teaser'];

  // Normalize sources: if empty, generate a healthy default blank canvas demo
  const rawSources = sources.length > 0 ? sources : [
    { type: 'image', url: '/default-codex-image.png', name: 'Dashboard Core' },
    { type: 'image', url: '/default-codex-image.png', name: 'Analytics Telemetry' },
  ];

  const durationPerClip = pacing.defaultDurationPerClip;
  const totalDuration = Number((rawSources.length * durationPerClip).toFixed(2));

  // 1. Build Media Timeline Clips
  const mediaClips = rawSources.map((src, index) => {
    const startTime = Number((index * durationPerClip).toFixed(2));
    const isLast = index === rawSources.length - 1;
    // Choose transition for multi-clip seams
    let transition = 'cut';
    if (!isLast) {
      const transOptions = ['gradient', 'blocks', 'fade'];
      transition = transOptions[index % transOptions.length];
    }

    return {
      id: `mclip_${index + 1}`,
      mediaId: `source_${index + 1}`,
      name: src.name || `Scene ${index + 1}`,
      type: src.type || 'image',
      url: src.url || '/default-codex-image.png',
      startTime,
      duration: durationPerClip,
      transition: transition,
      transitionDuration: 0.45,
      transitionScope: 'clip',
    };
  });

  // 2. Choreograph 7-DOF Camera Keyframe Clips
  const cameraClips = [];
  let keyframeIndex = 1;

  rawSources.forEach((src, clipIdx) => {
    const clipStart = Number((clipIdx * durationPerClip).toFixed(2));
    const isFinalClip = clipIdx === rawSources.length - 1;

    // Subdivide each media clip into 2 dynamic waypoints (A -> B)
    const kf1Dur = Number((durationPerClip * 0.5).toFixed(2));
    const kf2Dur = Number((durationPerClip - kf1Dur).toFixed(2));

    let beatA, beatB;

    if (clipIdx === 0) {
      // Act 1: Monolith Reveal Hook -> Deep Feature Dive
      beatA = pacing.beats[0];
      beatB = pacing.beats[1];
    } else if (isFinalClip) {
      // Act 4: Kinetic Lead-in -> Perpendicular Authority Resolve
      beatA = pacing.beats[2] || pacing.beats[1];
      beatB = pacing.beats[3] || pacing.beats[pacing.beats.length - 1]; // Hero resolve
    } else {
      // Middle Acts: Varied telemetry orbits with counter-pans
      const sign = clipIdx % 2 === 0 ? 1 : -1;
      beatA = {
        rotX: 10,
        rotY: 14 * sign,
        rotZ: -4 * sign,
        zoom: 1.28,
        panX: -10 * sign,
        panY: -6,
        perspective: 1100,
      };
      beatB = {
        rotX: 6,
        rotY: -10 * sign,
        rotZ: 3 * sign,
        zoom: 1.15,
        panX: 8 * sign,
        panY: 4,
        perspective: 1050,
      };
    }

    // Add Keyframe 1
    const p1Name = `P${keyframeIndex < 10 ? '0' + keyframeIndex : keyframeIndex}`;
    cameraClips.push({
      id: `kf_${keyframeIndex}`,
      name: p1Name,
      startTime: clipStart,
      duration: kf1Dur,
      camera: {
        rotX: beatA.rotX,
        rotY: beatA.rotY,
        rotZ: beatA.rotZ,
        zoom: beatA.zoom,
        panX: beatA.panX,
        panY: beatA.panY,
        perspective: beatA.perspective,
      },
      transition: 'cut',
      blockId: `block_mclip_${clipIdx + 1}`,
      mediaClipId: `mclip_${clipIdx + 1}`,
    });
    keyframeIndex++;

    // Add Keyframe 2
    const p2Name = `P${keyframeIndex < 10 ? '0' + keyframeIndex : keyframeIndex}`;
    cameraClips.push({
      id: `kf_${keyframeIndex}`,
      name: p2Name,
      startTime: Number((clipStart + kf1Dur).toFixed(2)),
      duration: kf2Dur,
      camera: {
        rotX: beatB.rotX,
        rotY: beatB.rotY,
        rotZ: beatB.rotZ,
        zoom: beatB.zoom,
        panX: beatB.panX,
        panY: beatB.panY,
        perspective: beatB.perspective,
      },
      transition: 'cut',
      blockId: `block_mclip_${clipIdx + 1}`,
      mediaClipId: `mclip_${clipIdx + 1}`,
    });
    keyframeIndex++;
  });

  // 3. Generate High-Craft Typography Overlays
  const textLayers = [];

  // Hero Hook Title (Act 1)
  textLayers.push({
    id: 'txt_hero_hook',
    text: title,
    startTime: 0.25,
    duration: Number((durationPerClip - 0.5).toFixed(2)),
    x: 50,
    y: 14,
    fontSize: aspectRatio === '9:16' ? 44 : 52,
    fontFamily: theme.fontFamily,
    fontWeight: '700',
    color: theme.textColor,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 1.05,
    shadow: true,
    inAnimation: 'fade-in-blur',
    inDuration: 0.45,
    outAnimation: 'blur',
    outDuration: 0.35,
    animationScope: 'word',
  });

  // Feature Callout Badge (Middle Acts)
  rawSources.forEach((src, idx) => {
    if (idx > 0 && idx < rawSources.length - 1) {
      const clipStart = Number((idx * durationPerClip).toFixed(2));
      textLayers.push({
        id: `txt_badge_${idx}`,
        text: src.name ? `⚡ ${src.name.toUpperCase()}` : `⚡ TELEMETRY 0${idx}`,
        startTime: Number((clipStart + 0.3).toFixed(2)),
        duration: Number((durationPerClip - 0.6).toFixed(2)),
        x: 50,
        y: 86,
        fontSize: 22,
        fontFamily: theme.fontFamily,
        fontWeight: '600',
        color: theme.accentColor,
        textAlign: 'center',
        letterSpacing: 2,
        shadow: false,
        inAnimation: 'pop',
        inDuration: 0.3,
        outAnimation: 'fade',
        outDuration: 0.25,
        animationScope: 'all',
      });
    }
  });

  // Resolving CTA / Benchmark (Final Act)
  const finalClipStart = Number(((rawSources.length - 1) * durationPerClip).toFixed(2));
  textLayers.push({
    id: 'txt_cta_resolve',
    text: 'Engineered for Unmatched Velocity',
    startTime: Number((finalClipStart + 0.4).toFixed(2)),
    duration: Number((durationPerClip - 0.6).toFixed(2)),
    x: 50,
    y: 88,
    fontSize: 28,
    fontFamily: theme.fontFamily,
    fontWeight: '600',
    color: theme.accentColor,
    textAlign: 'center',
    letterSpacing: 0,
    shadow: true,
    inAnimation: 'slide-up',
    inDuration: 0.4,
    outAnimation: 'none',
    outDuration: 0.2,
    animationScope: 'word',
  });

  // 4. Construct Full Zetashot Shared Project State
  const projectPayload = {
    version: '1.2.0',
    title,
    aspectRatio,
    duration: totalDuration,
    background: theme.background,
    deviceMockup: aspectRatio === '9:16' ? 'iphone-pro' : theme.deviceMockup,
    mediaUrl: rawSources[0].url || '/default-codex-image.png',
    mediaType: rawSources[0].type || 'image',
    mediaName: rawSources[0].name || title,
    cameraClips,
    textLayers,
    mediaClips,
    autoExport,
  };

  const encodedHash = encodeProjectHash(projectPayload);
  const deepLinkUrl = `http://localhost:5173/#project=${encodedHash}`;

  return {
    project: projectPayload,
    hash: encodedHash,
    deepLinkUrl,
    summary: {
      title,
      totalDuration: `${totalDuration}s`,
      clipCount: rawSources.length,
      keyframeCount: cameraClips.length,
      textLayerCount: textLayers.length,
      preset,
      theme: theme.name,
      aspectRatio,
    },
  };
}

/**
 * 1. Vision-Driven Auto-Composition for Bounding Boxes
 */
export function composeInterestRegions(options = {}) {
  const {
    regions = [],
    aspectRatio = '16:9',
    pacing = 'cinematic',
    title = 'Vision-Driven Auto-Composition',
    mediaUrl = '/default-codex-image.png',
    deviceMockup = 'mac-safari',
    autoExport = true,
  } = options;

  const stageW = 960;
  const stageH = 540;
  const stepDur = pacing === 'snappy' ? 1.0 : pacing === 'editorial' ? 2.0 : 1.5;

  const cameraClips = [];
  const textLayers = [];
  let currentTime = 0;

  // P01: Establishing Overview Shot
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
    duration: Number((p01Dur - 0.4).toFixed(2)),
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

    const fitScaleW = (stageW * 0.38) / Math.max(40, rw);
    const fitScaleH = (stageH * 0.35) / Math.max(30, rh);
    const targetZoom = Number(Math.max(0.85, Math.min(1.55, Math.min(fitScaleW, fitScaleH))).toFixed(2));
    const panX = Number((-offX * targetZoom).toFixed(1));
    const panY = Number((-offY * targetZoom).toFixed(1));

    const readabilityDamping = Math.max(0.40, Math.min(1.0, 1.4 / targetZoom));
    const rotX = Number(((pacing === 'editorial' ? 2.0 : 6.0) + normY * 4.0 * readabilityDamping).toFixed(1));
    const rotY = Number((-normX * (pacing === 'editorial' ? 4.0 : 12.0) * readabilityDamping).toFixed(1));
    const rotZ = Number((-normX * (pacing === 'editorial' ? 0.0 : 3.0) * readabilityDamping).toFixed(1));

    const pNum = idx + 2;
    const pPad = pNum < 10 ? `0${pNum}` : `${pNum}`;

    cameraClips.push({
      id: `kf_p${pPad}_region_${idx + 1}`,
      name: `P${pPad}: ${r.label || `Region ${idx + 1}`}`,
      startTime: Number(currentTime.toFixed(2)),
      duration: holdDur,
      color: 'blue',
      blockId: 'block_compose',
      mediaClipId: 'clip_init',
      transition: 'cut',
      camera: { rotX, rotY, rotZ, zoom: targetZoom, panX, panY, perspective: 1100 },
    });

    textLayers.push({
      id: `txt_badge_region_${idx + 1}`,
      text: r.badgeText || (r.label ? `⚡ ${r.label.toUpperCase()}` : `⚡ LANDMARK 0${idx + 1}`),
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

  // Final Authority Resolve
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
    camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.88, panX: 0, panY: 0, perspective: 1000 },
  });

  currentTime += resolveDur;
  const totalDuration = Number(currentTime.toFixed(2));

  const projectPayload = {
    version: '1.2.0',
    title,
    aspectRatio,
    duration: totalDuration,
    background: { type: 'gradient', color: '#090d16' },
    deviceMockup,
    mediaUrl,
    mediaType: mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') ? 'video' : 'image',
    mediaName: title,
    cameraClips,
    textLayers,
    autoExport,
  };

  const encodedHash = encodeProjectHash(projectPayload);
  return {
    project: projectPayload,
    hash: encodedHash,
    deepLinkUrl: `http://localhost:5173/#project=${encodedHash}`,
  };
}

/**
 * 2. Multi-Clip Sequencer & Timeline Surgery
 */
export function configureTimelineClips(options = {}) {
  const {
    clips = [],
    autoCompensateSpeed = true,
    title = 'Multi-Clip Sequenced Timeline',
    aspectRatio = '16:9',
    deviceMockup = 'mac-safari',
  } = options;

  let currentStart = 0;
  const mediaClips = [];
  const cameraClips = [];

  clips.forEach((c, idx) => {
    const rawDur = Number(c.duration) || 3.5;
    const clipDur = Math.max(0.5, rawDur);
    const sourceUrl = c.sourceUrl || '/default-codex-image.png';
    const cType = c.type || (sourceUrl.endsWith('.mp4') || sourceUrl.endsWith('.webm') ? 'video' : 'image');
    const transitionIn = c.transitionIn || (idx === 0 ? 'cut' : 'gradient');

    let speed = Number(c.playbackSpeed) || 1.0;
    if (autoCompensateSpeed && cType === 'video' && c.sourceDuration) {
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
      speed,
      transition: transitionIn,
      transitionDuration: 0.45,
    });

    const kf1Dur = Number((clipDur * 0.5).toFixed(2));
    const kf2Dur = Number((clipDur - kf1Dur).toFixed(2));
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
      camera: { rotX: 10, rotY: idx % 2 === 0 ? 12 : -12, rotZ: idx % 2 === 0 ? -3 : 3, zoom: 1.25, panX: -8, panY: -4, perspective: 1100 },
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
      camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.90, panX: 0, panY: 0, perspective: 1000 },
    });

    currentStart += clipDur;
  });

  const totalDuration = Number(currentStart.toFixed(2));
  const projectPayload = {
    version: '1.2.0',
    title,
    aspectRatio,
    duration: totalDuration,
    background: { type: 'gradient', color: '#090d16' },
    deviceMockup,
    mediaUrl: mediaClips[0]?.url || '/default-codex-image.png',
    mediaType: mediaClips[0]?.type || 'image',
    mediaName: title,
    mediaClips,
    cameraClips,
  };

  const encodedHash = encodeProjectHash(projectPayload);
  return {
    project: projectPayload,
    hash: encodedHash,
    deepLinkUrl: `http://localhost:5173/#project=${encodedHash}`,
  };
}

/**
 * 3. Kinetic Typography & Telemetry Badges
 */
export function orchestrateTypography(options = {}) {
  const { overlays = [], title = 'Kinetic Typography' } = options;
  const textLayers = overlays.map((o, idx) => ({
    id: `txt_layer_${idx + 1}_${Date.now()}`,
    text: o.text || '',
    startTime: Number(o.startTime) || 0,
    duration: Number(o.duration) || 2.5,
    x: o.position3D?.x ?? 50,
    y: o.position3D?.y ?? (o.style === 'telemetry-pill' ? 86 : 15),
    fontSize: o.fontSize || (o.style === 'telemetry-pill' ? 22 : 48),
    fontFamily: o.font || 'SF Pro Display',
    fontWeight: o.style === 'telemetry-pill' ? '600' : '700',
    color: o.color || (o.style === 'telemetry-pill' ? '#38bdf8' : '#ffffff'),
    textAlign: 'center',
    inAnimation: o.animation || (o.style === 'telemetry-pill' ? 'pop' : 'fade-in-blur'),
    inDuration: 0.35,
    outAnimation: 'fade',
    outDuration: 0.25,
    animationScope: o.scope || (o.style === 'telemetry-pill' ? 'all' : 'word'),
  }));

  const projectPayload = {
    version: '1.2.0',
    title,
    duration: Math.max(6.0, ...textLayers.map((l) => l.startTime + l.duration)),
    textLayers,
  };

  const encodedHash = encodeProjectHash(projectPayload);
  return {
    project: projectPayload,
    hash: encodedHash,
    deepLinkUrl: `http://localhost:5173/#project=${encodedHash}`,
  };
}

/**
 * 4. Sound Design & SFX Sync
 */
export function syncSoundDesign(options = {}) {
  const { bgmTrack = 'cinematic-saas', bgmVolume = 0.6, autoSyncSfx = true, timelineDuration = 6.0 } = options;
  const audioTracks = [];

  if (bgmTrack !== 'none') {
    audioTracks.push({
      id: `bgm_${Date.now()}`,
      name: bgmTrack === 'lofi-ambient' ? 'Lo-Fi Chill Ambient' : 'Cinematic Dawn',
      url: `/audio/${bgmTrack}.mp3`,
      type: 'music',
      startTime: 0,
      duration: timelineDuration,
      volume: bgmVolume,
    });
  }

  if (autoSyncSfx) {
    audioTracks.push({
      id: `sfx_subdrop_${Date.now()}`,
      name: 'Sub-Drop Monolith Reveal',
      url: '/audio/sfx-subdrop.mp3',
      type: 'sfx',
      startTime: 0,
      duration: 1.2,
      volume: 0.85,
    });
    audioTracks.push({
      id: `sfx_whoosh_${Date.now()}`,
      name: 'Camera Velocity Whoosh',
      url: '/audio/sfx-whoosh.mp3',
      type: 'sfx',
      startTime: Number((timelineDuration * 0.45).toFixed(2)),
      duration: 0.5,
      volume: 0.75,
    });
    audioTracks.push({
      id: `sfx_chime_${Date.now()}`,
      name: 'Landing Resolve Chime',
      url: '/audio/sfx-chime.mp3',
      type: 'sfx',
      startTime: Math.max(0, Number((timelineDuration - 1.2).toFixed(2))),
      duration: 1.0,
      volume: 0.8,
    });
  }

  const projectPayload = {
    version: '1.2.0',
    title: 'Audio Synced Project',
    duration: timelineDuration,
    audioTracks,
  };

  const encodedHash = encodeProjectHash(projectPayload);
  return {
    project: projectPayload,
    hash: encodedHash,
    deepLinkUrl: `http://localhost:5173/#project=${encodedHash}`,
  };
}

/**
 * 5. Optics, Lighting & WebGL Materials
 */
export function configureOpticsAnd3D(options = {}) {
  const { dof, specularGlow, shadow, cornerRadius = 16, webglMaterial } = options;
  const visualEffects = {
    borderRadius: cornerRadius,
    blurAmount: dof?.enabled ? (Number(dof.aperture) || 24) : 0,
    shadowBlur: shadow?.blur ?? 32,
    shadowSpread: shadow?.spread ?? 0,
    shadowOpacity: shadow?.opacity ?? 0.45,
    shadowOffsetY: shadow?.yOffset ?? 12,
    specularGlow: specularGlow?.enabled !== false,
    glowColor: specularGlow?.hexOverride || '#38bdf8',
    dof: Boolean(dof?.enabled),
    dofAperture: Number(dof?.aperture) || 24,
  };

  const webglMaterialState = {
    roughness: Number(webglMaterial?.roughness) || 0.2,
    metalness: Number(webglMaterial?.metalness) || 0.8,
    tintHex: webglMaterial?.tintHex || '#ffffff',
    textureRepeat: webglMaterial?.textureRepeat || [1, 1],
    flipY: Boolean(webglMaterial?.flipY),
  };

  const projectPayload = {
    version: '1.2.0',
    title: 'Optics Configured Project',
    duration: 4.0,
    visualEffects,
    webglMaterial: webglMaterialState,
  };

  const encodedHash = encodeProjectHash(projectPayload);
  return {
    project: projectPayload,
    hash: encodedHash,
    deepLinkUrl: `http://localhost:5173/#project=${encodedHash}`,
  };
}

// ==========================================
// 4. CLI PARSER & EXECUTION
// ==========================================
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

// Run if called directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = parseArgs(process.argv.slice(2));

  let sources = [];
  if (args.sources) {
    try {
      sources = JSON.parse(args.sources);
    } catch {
      // Split comma separated list of files
      sources = args.sources.split(',').map((p, idx) => ({
        url: p.trim(),
        name: `Shot 0${idx + 1}`,
        type: p.endsWith('.mp4') || p.endsWith('.webm') ? 'video' : 'image',
      }));
    }
  }

  const generated = generateMotionGraphicsProject({
    title: args.title || 'Linear Next-Gen Architecture',
    sources,
    preset: args.preset || 'launch-teaser',
    themeName: args.theme || 'dark-monolith',
    aspectRatio: args.aspectRatio || '16:9',
    autoExport: Boolean(args.autoExport),
  });

  if (args.output) {
    const outPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(generated.project, null, 2), 'utf-8');
    console.log(`[Zetashot Motion] Saved project JSON to: ${outPath}`);
  }

  console.log('\n============================================================');
  console.log(' ✨ AUTONOMOUS SAAS MOTION GRAPHICS GENERATED');
  console.log('============================================================');
  console.log(` Title:       ${generated.summary.title}`);
  console.log(` Duration:    ${generated.summary.totalDuration}`);
  console.log(` Media Clips: ${generated.summary.clipCount}`);
  console.log(` Keyframes:   ${generated.summary.keyframeCount} (7-DOF with Hermite Damping)`);
  console.log(` Text Layers: ${generated.summary.textLayerCount} (Word-level typography)`);
  console.log(` Aesthetic:   ${generated.summary.theme}`);
  console.log(` Aspect:      ${generated.summary.aspectRatio}`);
  console.log('------------------------------------------------------------');
  console.log(` Deep-Link URL: ${generated.deepLinkUrl.substring(0, 80)}...`);
  console.log('============================================================\n');

  if (args.json) {
    console.log(JSON.stringify(generated, null, 2));
  }
}
