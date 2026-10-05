import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CameraControlsIsland } from './components/CameraControlsIsland';
import { VideoTimeline, TimelinePositionClip } from './components/VideoTimeline';
import { TopModeIsland } from './components/TopModeIsland';
import { InterestRegionOverlay } from './components/InterestRegionOverlay';
import { MediaLibraryModal, BUILTIN_MEDIA_ITEMS, MediaItem } from './components/MediaLibraryModal';
import { CropModal, CropRect } from './components/CropModal';
import { InteractiveDemoUI } from './components/InteractiveDemoUI';
import { BeginnerGuide } from './components/BeginnerGuide';
import { TextLayerOverlay } from './types/textLayer';
import { createDefaultTextLayer, splitTextLayerLines } from './utils/textLayer';
import { TextOverlayStage } from './components/TextOverlayStage';
import { TextLayerInspector } from './components/TextLayerInspector';
import { Camera3DState, calculate3DTransform, clampRotation } from './utils/camera3D';
import { BackgroundConfig, generateBackgroundCss } from './utils/gradientUtils';
import { CaptureEngine } from './services/captureEngine';
import { exportMockupVideo, getCameraAtTime } from './services/videoExportEngine';
import { storageService } from './services/storageService';
import { MediaTimelineClip, getActiveMediaClipAtTime, calculateMediaSequenceDuration, splitMediaClipAtTime, sequenceClipsContiguously } from './types/mediaTimeline';
import { getMediaTransitionAtTime, getBlockTransitionGrid, getBlockTileStates, drawBlockTransitionCanvas } from './utils/transitionMath';
import { calculatePlaybackRate, syncMediaClipsToKeyframeDuration, syncKeyframeSequenceToDuration, generateKeyframesForNewMediaClip, splitKeyframesAtTime, getNextKeyframeIndex } from './utils/keyframeMediaSyncEngine';
import { AudioTrackItem } from './types/audioTrack';
import { getActiveAudioItemsAtTime } from './utils/audioTrackHelper';
import { CubicBezierValues } from './utils/bezierSolver';
import { interpolateCameraSpline, getKeyframeTargetTime, getActiveClipAtTime } from './utils/splineInterpolation';
import { playGearSound, setSoundEnabled as setGlobalSoundEnabled, playTransitionSound } from './utils/soundEffects';
import { getMockupDimensions, getAspectRatioCss, getStageDimensions } from './utils/aspectRatioHelper';
import { generateVideoThumbnails } from './utils/thumbnailGenerator';
import {
  InterestRegion,
  generateClipsFromInterestRegions,
  calculateCameraForRegion,
  STAGE_BASE_DIMS,
  DEFAULT_COMPOSE_STEP_DURATION,
} from './utils/interestRegionEngine';
import { calculateTimelineDuration } from './utils/timelineDurationEngine';
import { isCropActive, calculateCroppedDimensions, calculateMediaCropOffset } from './utils/cropMath';
import {
  Plus,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Share2,
  Check,
  Heart,
  Sparkles,
  HelpCircle,
  Move,
  RotateCw,
  Menu,
  X,
  Sliders,
  SlidersHorizontal,
  Grid,
} from 'lucide-react';

import { FBX3DRenderer } from './services/fbx3DRenderer';
import {
  Model3DTransform,
  Model3DKeyframe,
  Model3DTextureConfig,
  Model3DTextureMapType,
  DEFAULT_MODEL_3D_TRANSFORM,
  DEFAULT_MODEL_3D_TEXTURES,
} from './types/model3D';
import { interpolateModel3DTransform, setOrUpdateModelKeyframe, removeModelKeyframe } from './utils/model3DInterpolation';
import { Model3DControlsIsland } from './components/Model3DControlsIsland';
import { decodeProjectFromUrl, encodeProjectToUrl, ZetashotSharedProject } from './utils/projectUrlEncoder';
import { buildCameraClipsFromPreset } from './utils/cameraPresets';
import { getDefaultTimelineDuration } from './utils/viewportPresets';

import './styles/index.css';
import './styles/uicamera.css';

/**
 * Computes dynamic directional 3D Tilt-Shift & Depth-of-Field mask with autofocus support.
 * When the plane tilts in 3D (rotX/rotY), regions around the focal point remain crystal sharp (0% blur),
 * while receding/distant regions in Z-space smoothly blend into optical cinema bokeh.
 */
export function getTiltShiftMask(
  rotX: number,
  rotY: number,
  focusPoint?: { x: number; y: number }
): string {
  const radX = (rotX * Math.PI) / 180;
  const radY = (rotY * Math.PI) / 180;
  const sinX = Math.sin(radX);
  const sinY = Math.sin(radY);
  const totalTilt = Math.sqrt(sinX * sinX + sinY * sinY);

  const fx = focusPoint ? Math.max(10, Math.min(90, focusPoint.x * 100)) : 50;
  const fy = focusPoint ? Math.max(10, Math.min(90, focusPoint.y * 100)) : 50;

  if (totalTilt > 0.015) {
    // Direction angle from close focal foreground to receding distant background:
    // In CSS linear-gradient: 0deg points UP, 90deg points RIGHT, 180deg points DOWN, 270deg points LEFT.
    // sinY > 0 means right side recedes (90deg); sinX > 0 means top recedes (0deg).
    const angleRad = Math.atan2(sinY, sinX);
    const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;
    
    // Cinema-grade depth-of-field transition:
    // Generous in-focus optical corridor (0% to 42%) keeps the focal UI tack-sharp and readable,
    // then smoothly transitions with a natural Hermite optical curve into creamy background bokeh
    return `linear-gradient(${angleDeg.toFixed(1)}deg, transparent 0%, transparent 42%, rgba(0,0,0,0.08) 56%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.65) 86%, black 100%)`;
  }

  // Flat 2D View: Prime lens aperture bokeh (central 38% remains tack-sharp, outer perimeter softens gracefully)
  return `radial-gradient(circle at ${fx.toFixed(1)}% ${fy.toFixed(1)}%, transparent 0%, transparent 38%, rgba(0,0,0,0.12) 56%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.82) 90%, black 100%)`;
}

export function App() {
  // 1. Media & Project State
  const DEFAULT_BLANK_MEDIA: MediaItem = BUILTIN_MEDIA_ITEMS[0] || {
    id: 'default-screen-image',
    name: 'Codex Dashboard',
    type: 'image',
    url: '/default-codex-image.png',
    dimensions: '1920 × 1080',
    format: 'PNG',
  };

  const [mediaList, setMediaList] = useState<MediaItem[]>(
    BUILTIN_MEDIA_ITEMS.length > 0 ? BUILTIN_MEDIA_ITEMS : [DEFAULT_BLANK_MEDIA]
  );
  const [activeMedia, setActiveMedia] = useState<MediaItem>(
    BUILTIN_MEDIA_ITEMS[0] || DEFAULT_BLANK_MEDIA
  );

  // 1b. Multi-Clip Media Timeline Sequence State
  const [mediaClips, setMediaClips] = useState<MediaTimelineClip[]>([
    {
      id: 'clip_init',
      mediaId: (BUILTIN_MEDIA_ITEMS[0] || DEFAULT_BLANK_MEDIA).id,
      name: (BUILTIN_MEDIA_ITEMS[0] || DEFAULT_BLANK_MEDIA).name,
      type: (BUILTIN_MEDIA_ITEMS[0] || DEFAULT_BLANK_MEDIA).type,
      url: (BUILTIN_MEDIA_ITEMS[0] || DEFAULT_BLANK_MEDIA).url,
      startTime: 0,
      duration: 3.0,
    },
  ]);
  const [selectedMediaClipId, setSelectedMediaClipId] = useState<string | null>('clip_init');
  const mediaClipsRef = useRef<MediaTimelineClip[]>(mediaClips);
  useEffect(() => {
    mediaClipsRef.current = mediaClips;
  }, [mediaClips]);

  // 1c. Background Music & Sound Effects (SFX) Track State
  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>([]);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null);
  const audioTracksRef = useRef<AudioTrackItem[]>(audioTracks);
  useEffect(() => {
    audioTracksRef.current = audioTracks;
  }, [audioTracks]);
  const audioPlayersMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Real-time sync of track volume & mute adjustments to active audio elements
  useEffect(() => {
    audioTracks.forEach((track) => {
      const player = audioPlayersMapRef.current.get(track.id);
      if (player) {
        player.volume = track.isMuted ? 0 : Math.max(0, Math.min(1, track.volume ?? 1.0));
      }
    });
    const currentTrackIds = new Set(audioTracks.map((t) => t.id));
    audioPlayersMapRef.current.forEach((player, id) => {
      if (!currentTrackIds.has(id)) {
        player.pause();
        audioPlayersMapRef.current.delete(id);
      }
    });
  }, [audioTracks]);

  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const [isComposed, setIsComposed] = useState<boolean>(false);
  const isComposedRef = useRef<boolean>(false);
  useEffect(() => {
    isComposedRef.current = isComposed;
  }, [isComposed]);

  const [mediaDuration, setMediaDuration] = useState<number>(3.0);
  const mediaDurationRef = useRef<number>(3.0);
  useEffect(() => {
    mediaDurationRef.current = mediaDuration;
  }, [mediaDuration]);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaLibraryMode, setMediaLibraryMode] = useState<'select' | 'add'>('select');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);
  const directUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCameraRulerOpen, setIsCameraRulerOpen] = useState(false);

  useEffect(() => {
    setGlobalSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // 2. Beginner Guide Tour State
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('p') || sp.get('preset') || sp.get('bg') || sp.get('export') || sp.get('media')) {
        return false;
      }
      return !localStorage.getItem('zetashot_guide_completed');
    }
    return false;
  });
  const [guideStepIndex, setGuideStepIndex] = useState<number>(0);
  const [guidePhase, setGuidePhase] = useState<
    'start' | 'end' | 'compose_operator' | 'compose_draw' | 'compose_action' | 'preview' | 'export' | 'complete'
  >('start');

  const handleCompleteTour = () => {
    setIsGuideOpen(false);
    setGuidePhase('complete');
    localStorage.setItem('zetashot_guide_completed', 'true');
  };

  // 3. Studio Mode (Photo vs Video)
  const [studioMode, setStudioMode] = useState<'photo' | 'video'>('video');

  // 3. Top Mode State (Operator vs Compose) & Interest Regions
  const [topMode, setTopMode] = useState<'operator' | 'compose'>('operator');
  const [interestRegions, setInterestRegions] = useState<InterestRegion[]>([]);
  const [isMarkingRegion, setIsMarkingRegion] = useState<boolean>(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // 4. Video Timeline Position Clips: 1 combined 3-second block of two sets (P01 initial at 0s, P02 ending at 3s)
  // Static by default: both P01 and P02 have identical default camera angle so no animation plays by default
  const DEFAULT_STATIC_CAMERA: Camera3DState = {
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    zoom: 0.9,
    panX: 0,
    panY: 0,
    perspective: 1000,
  };

  const DEFAULT_VIDEO_STATIC_CAMERA: Camera3DState = {
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    zoom: 0.9,
    panX: 0,
    panY: 0,
    perspective: 1000,
  };

  const INITIAL_CLIPS: TimelinePositionClip[] = [
    { id: 'P01', name: 'P01', startTime: 0, duration: 1.5, color: 'yellow', camera: { ...DEFAULT_STATIC_CAMERA }, transition: 'cut', blockId: 'block_init', mediaClipId: 'clip_init' },
    { id: 'P02', name: 'P02', startTime: 1.5, duration: 1.5, color: 'yellow', camera: { ...DEFAULT_STATIC_CAMERA }, transition: 'cut', blockId: 'block_init', mediaClipId: 'clip_init' },
  ];

  const [clips, setClips] = useState<TimelinePositionClip[]>(INITIAL_CLIPS);
  const [selectedClipId, setSelectedClipId] = useState<string>('P01');
  const [easingValues, setEasingValues] = useState<CubicBezierValues>([0.25, 0.1, 0.25, 1.0]);
  const [frameOpacity, setFrameOpacity] = useState<number>(1.0);

  // 5. 3D Camera State (Starts at default static angle)
  const [camera, setCamera] = useState<Camera3DState>({ ...DEFAULT_STATIC_CAMERA });

  // 6. Studio Settings
  const [background, setBackground] = useState<BackgroundConfig>({
    type: 'solid',
    color: '#ffffff',
  });
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [shadowDepth, setShadowDepth] = useState<'none' | 'small' | 'medium' | 'large'>('large');
  const [borderRadius, setBorderRadius] = useState<number>(12);
  const [blurAmount, setBlurAmount] = useState<number>(0);
  const [showLaserFocusIndicator, setShowLaserFocusIndicator] = useState<boolean>(false);
  const blurTimerRef = useRef<number | null>(null);

  // 6b. Layer-Based Text Overlays
  const [textLayers, setTextLayers] = useState<TextLayerOverlay[]>([]);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(null);
  const textLayersRef = useRef<TextLayerOverlay[]>([]);
  useEffect(() => {
    textLayersRef.current = textLayers;
  }, [textLayers]);

  const handleBlurChange = (val: number) => {
    setBlurAmount(val);
    setShowLaserFocusIndicator(true);
    playGearSound();
    setGuideStepIndex((prev) => (prev === 2 ? 3 : prev));
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
    }
    blurTimerRef.current = window.setTimeout(() => {
      setShowLaserFocusIndicator(false);
    }, 1200);
  };

  const [autoFocus, setAutoFocus] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  // 7. Crop Tool State
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 });

  // 8. Video Playback & Timeline Scrubber (10s on mobile devices, 12s on desktop)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(() => getDefaultTimelineDuration());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Synchronous Refs for guaranteed zero-race-condition playback
  const isPlayingRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const clipsRef = useRef<TimelinePositionClip[]>(clips);
  const activeMediaRef = useRef<MediaItem>(activeMedia);
  const totalDurationRef = useRef<number>(totalDuration);
  const selectedClipIdRef = useRef<string>(selectedClipId);
  const lastInterpolatedCameraRef = useRef<Camera3DState>(camera);

  useEffect(() => {
    selectedClipIdRef.current = selectedClipId;
  }, [selectedClipId]);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    activeMediaRef.current = activeMedia;
  }, [activeMedia]);

  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);

  // Adapt default duration on window resize between mobile and desktop if user hasn't explicitly extended it
  useEffect(() => {
    const handleResize = () => {
      const targetDefault = getDefaultTimelineDuration();
      setTotalDuration((prev) => {
        if (prev === 10.0 || prev === 12.0) {
          totalDurationRef.current = targetDefault;
          return targetDefault;
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const gradientOverlayRef = useRef<HTMLDivElement | null>(null);
  const ambientBloomRef = useRef<HTMLDivElement | null>(null);
  const blockCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageGradientOverlayRef = useRef<HTMLDivElement | null>(null);
  const stageBlockCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playedTransitionsRef = useRef<Set<string>>(new Set());

  const updateGradientTransitionVisuals = useCallback((time: number) => {
    const trans = getMediaTransitionAtTime(mediaClipsRef.current || [], time);
    const gradIntensity = trans.active && trans.type === 'gradient' ? trans.intensity : 0;
    const isCanvasScope = (trans.scope || 'canvas') === 'canvas';

    // 1. Warm radiant gradient transition visuals
    if (trans.active && trans.type === 'gradient' && gradIntensity > 0.001) {
      if (isCanvasScope) {
        // Fill Entire Canvas Overlay (covers whole background & stage)
        if (stageGradientOverlayRef.current) {
          stageGradientOverlayRef.current.style.display = 'block';
          stageGradientOverlayRef.current.style.opacity = `${gradIntensity}`;
          stageGradientOverlayRef.current.style.background = `
            radial-gradient(ellipse at 50% 50%, rgba(255, 235, 160, ${0.98 * gradIntensity}) 0%, rgba(255, 140, 40, ${0.85 * gradIntensity}) 35%, rgba(255, 75, 95, ${0.75 * gradIntensity}) 65%, rgba(255, 140, 40, ${0.4 * gradIntensity}) 100%),
            linear-gradient(135deg, rgba(255, 140, 40, ${0.85 * gradIntensity}) 0%, rgba(255, 90, 110, ${0.75 * gradIntensity}) 100%)
          `;
          stageGradientOverlayRef.current.style.filter = `brightness(${1 + 0.45 * gradIntensity}) contrast(${1 - 0.1 * gradIntensity})`;
        }
        if (gradientOverlayRef.current) gradientOverlayRef.current.style.display = 'none';
        if (ambientBloomRef.current) ambientBloomRef.current.style.display = 'none';
      } else {
        // Constrain to Clip Only inside mockup frame
        if (gradientOverlayRef.current) {
          gradientOverlayRef.current.style.display = 'block';
          gradientOverlayRef.current.style.opacity = `${gradIntensity}`;
          gradientOverlayRef.current.style.background = `
            radial-gradient(ellipse at 50% 60%, rgba(255, 200, 80, ${0.95 * gradIntensity}) 0%, rgba(255, 125, 45, ${0.9 * gradIntensity}) 35%, rgba(255, 65, 80, ${0.75 * gradIntensity}) 70%, rgba(255, 150, 40, ${0.45 * gradIntensity}) 100%),
            linear-gradient(135deg, rgba(255, 140, 40, ${0.8 * gradIntensity}) 0%, rgba(255, 90, 110, ${0.7 * gradIntensity}) 100%)
          `;
          gradientOverlayRef.current.style.filter = `brightness(${1 + 0.4 * gradIntensity}) contrast(${1 - 0.15 * gradIntensity})`;
        }
        if (ambientBloomRef.current) {
          ambientBloomRef.current.style.display = 'block';
          ambientBloomRef.current.style.opacity = `${gradIntensity}`;
          ambientBloomRef.current.style.background = `radial-gradient(circle at 50% 50%, rgba(255, 130, 40, ${0.55 * gradIntensity}) 0%, rgba(255, 80, 50, ${0.35 * gradIntensity}) 50%, transparent 75%)`;
        }
        if (stageGradientOverlayRef.current) stageGradientOverlayRef.current.style.display = 'none';
      }
    } else {
      if (gradientOverlayRef.current) {
        gradientOverlayRef.current.style.display = 'none';
        gradientOverlayRef.current.style.opacity = '0';
      }
      if (ambientBloomRef.current) {
        ambientBloomRef.current.style.display = 'none';
        ambientBloomRef.current.style.opacity = '0';
      }
      if (stageGradientOverlayRef.current) {
        stageGradientOverlayRef.current.style.display = 'none';
        stageGradientOverlayRef.current.style.opacity = '0';
      }
    }

    // 2. Block-by-Block mosaic grid transition visuals
    if (trans.active && trans.type === 'blocks' && trans.progress > 0 && trans.progress < 1) {
      if (isCanvasScope) {
        // Full Stage Canvas Block Transition
        const stageCanvas = stageBlockCanvasRef.current;
        if (stageCanvas) {
          stageCanvas.style.display = 'block';
          const sCtx = stageCanvas.getContext('2d');
          if (sCtx) {
            sCtx.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
            drawBlockTransitionCanvas(sCtx, stageCanvas.width, stageCanvas.height, trans.progress, 1.25);
          }
        }
        if (blockCanvasRef.current) {
          blockCanvasRef.current.style.display = 'none';
        }
      } else {
        // Clip Only Block Transition inside Mockup
        const clipCanvas = blockCanvasRef.current;
        if (clipCanvas) {
          clipCanvas.style.display = 'block';
          const cCtx = clipCanvas.getContext('2d');
          if (cCtx) {
            cCtx.clearRect(0, 0, clipCanvas.width, clipCanvas.height);
            drawBlockTransitionCanvas(cCtx, clipCanvas.width, clipCanvas.height, trans.progress, 1.0);
          }
        }
        if (stageBlockCanvasRef.current) {
          stageBlockCanvasRef.current.style.display = 'none';
        }
      }
    } else {
      if (blockCanvasRef.current) {
        blockCanvasRef.current.style.display = 'none';
      }
      if (stageBlockCanvasRef.current) {
        stageBlockCanvasRef.current.style.display = 'none';
      }
    }

    // 3. Auto SFX Triggering during Playback
    if (isPlayingRef.current && trans.active && trans.type === 'blocks') {
      const transKey = `${trans.cutTime.toFixed(2)}_${trans.type}`;
      if (!playedTransitionsRef.current.has(transKey) && trans.progress >= 0.15 && trans.progress <= 0.65) {
        playedTransitionsRef.current.add(transKey);
        playTransitionSound(trans.type);
      }
    }
  }, []);

  // Generate timeline filmstrip thumbnails for video media
  useEffect(() => {
    if (activeMedia.type === 'video' && activeMedia.url) {
      generateVideoThumbnails(activeMedia.url, totalDuration, 13).then((thumbs) => {
        if (thumbs.length > 0) {
          setVideoThumbnails(thumbs);
        }
      });
    } else {
      setVideoThumbnails([]);
    }
  }, [activeMedia, totalDuration]);

  // 9. Interactive Dragging State on Stage: Move (Pan) vs Orbit (Rotate 3D)
  const [dragMode, setDragMode] = useState<'move' | 'orbit'>('move');
  const [isDraggingScene, setIsDraggingScene] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    rotX: number;
    rotY: number;
    panX: number;
    panY: number;
  }>({
    x: 0,
    y: 0,
    rotX: 0,
    rotY: 0,
    panX: 0,
    panY: 0,
  });

  // Mobile navigation drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Option to disable beginner guide on mobile devices (persisted in localStorage)
  const [isMobileGuideDisabled, setIsMobileGuideDisabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zetashot_guide_mobile_disabled') === 'true';
    }
    return false;
  });

  const handleToggleMobileGuide = (disabled: boolean) => {
    setIsMobileGuideDisabled(disabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zetashot_guide_mobile_disabled', disabled ? 'true' : 'false');
    }
    if (disabled) {
      setIsGuideOpen(false);
    }
  };

  const handleDisableGuide = useCallback(() => {
    setIsGuideOpen(false);
    setIsMobileGuideDisabled(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zetashot_guide_completed', 'true');
      localStorage.setItem('zetashot_guide_mobile_disabled', 'true');
    }
  }, []);

  // Mobile touch gesture tracking (Drag & Pinch-to-Zoom)
  const touchStartRef = useRef<{
    x: number;
    y: number;
    rotX: number;
    rotY: number;
    panX: number;
    panY: number;
    initialDistance?: number;
    initialZoom?: number;
  }>({
    x: 0,
    y: 0,
    rotX: 0,
    rotY: 0,
    panX: 0,
    panY: 0,
  });

  // 10. Cursor Follower
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 380, y: 220 });

  // 11. Export Status, Format & Framerate (Default MP4 @ 60 FPS)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(60);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [autoExportRequested, setAutoExportRequested] = useState(false);

  // DOM Refs
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameAnchorRef = useRef<HTMLDivElement | null>(null);
  const frameSceneRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 12. Dynamic Stage Reference Scale for 100% Identical Preview-to-Export Framing
  const [stageScale, setStageScale] = useState<number>(1.0);
  const stageScaleRef = useRef<number>(1.0);

  // 13. 3D Model (FBX) Stage Rendering & Transforms
  const [model3DTransform, setModel3DTransform] = useState<Model3DTransform>(DEFAULT_MODEL_3D_TRANSFORM);
  const [model3DTextures, setModel3DTextures] = useState<Model3DTextureConfig>(DEFAULT_MODEL_3D_TEXTURES);
  const model3DRendererRef = useRef<FBX3DRenderer | null>(null);
  const model3DCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedFBXUrlRef = useRef<string | null>(null);

  useEffect(() => {
    stageScaleRef.current = stageScale;
  }, [stageScale]);

  useEffect(() => {
    const updateScale = () => {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        // 540 is the standard reference height in 960x540 base space
        const scale = rect.height > 0 ? rect.height / 540 : 1.0;
        setStageScale(scale);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (stageRef.current) {
      observer.observe(stageRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [aspectRatio]);

  // 3D FBX Model Loading Effect
  useEffect(() => {
    if (activeMedia.type !== '3d') return;
    if (!model3DRendererRef.current) {
      model3DRendererRef.current = new FBX3DRenderer();
    }
    if (activeMedia.url !== loadedFBXUrlRef.current) {
      loadedFBXUrlRef.current = activeMedia.url;
      if (activeMedia.url !== 'default-3d') {
        model3DRendererRef.current
          .loadFBX(activeMedia.url)
          .then(() => {
            if (activeMedia.modelTextures) {
              setModel3DTextures(activeMedia.modelTextures);
              if (activeMedia.modelTextures.diffuseUrl) {
                model3DRendererRef.current?.loadTexture(
                  activeMedia.modelTextures.diffuseUrl,
                  'diffuse',
                  activeMedia.modelTextures.diffuseName,
                  activeMedia.modelTextures
                );
              }
            }
          })
          .catch((err) => {
            console.warn('[Zetashot] Failed to load FBX model:', err);
          });
      }
    }
  }, [activeMedia.type, activeMedia.url]);

  const handleUploadModelTexture = async (file: File, type: Model3DTextureMapType) => {
    try {
      const url = URL.createObjectURL(file);
      if (!model3DRendererRef.current) {
        model3DRendererRef.current = new FBX3DRenderer();
      }
      await model3DRendererRef.current.loadTexture(url, type, file.name, model3DTextures);
      const updated: Model3DTextureConfig = {
        ...model3DTextures,
        [`${type}Url`]: url,
        [`${type}Name`]: file.name,
      };
      setModel3DTextures(updated);
      setActiveMedia((prev) => ({
        ...prev,
        modelTextures: updated,
      }));
      setMediaClips((prev) => {
        const curActive = getActiveMediaClipAtTime(prev, currentTimeRef.current);
        return prev.map((c) => (c.id === curActive?.id ? { ...c, modelTextures: updated } : c));
      });
    } catch (err) {
      console.warn('[Zetashot] Error uploading 3D texture:', err);
    }
  };

  const handleRemoveModelTexture = (type: Model3DTextureMapType) => {
    model3DRendererRef.current?.removeTexture(type);
    const updated: Model3DTextureConfig = { ...model3DTextures };
    delete updated[`${type}Url` as keyof Model3DTextureConfig];
    delete updated[`${type}Name` as keyof Model3DTextureConfig];
    setModel3DTextures(updated);
    setActiveMedia((prev) => ({
      ...prev,
      modelTextures: updated,
    }));
    setMediaClips((prev) => {
      const curActive = getActiveMediaClipAtTime(prev, currentTimeRef.current);
      return prev.map((c) => (c.id === curActive?.id ? { ...c, modelTextures: updated } : c));
    });
  };

  const handleUpdateModelTextureConfig = (updates: Partial<Model3DTextureConfig>) => {
    model3DRendererRef.current?.updateTextureConfig(updates);
    const updated: Model3DTextureConfig = { ...model3DTextures, ...updates };
    setModel3DTextures(updated);
    setActiveMedia((prev) => ({
      ...prev,
      modelTextures: updated,
    }));
    setMediaClips((prev) => {
      const curActive = getActiveMediaClipAtTime(prev, currentTimeRef.current);
      return prev.map((c) => (c.id === curActive?.id ? { ...c, modelTextures: updated } : c));
    });
  };

  // 3D Model Canvas Rendering Effect
  useEffect(() => {
    if (activeMedia.type !== '3d' || !model3DCanvasRef.current) return;
    if (!model3DRendererRef.current) {
      model3DRendererRef.current = new FBX3DRenderer();
    }
    const canvas = model3DCanvasRef.current;
    const baseDims = getMockupDimensions(aspectRatio);
    const mDims = calculateCroppedDimensions(baseDims, cropRect);
    const w = Math.max(10, Math.round(mDims.width * stageScale));
    const h = Math.max(10, Math.round(mDims.height * stageScale));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const activeClip = getActiveMediaClipAtTime(mediaClipsRef.current, currentTime);
    const interpolated = interpolateModel3DTransform(
      activeClip?.modelKeyframes,
      currentTime,
      activeClip?.modelTransform || model3DTransform
    );

    const renderedCanvas = model3DRendererRef.current.render(w, h, interpolated, currentTime);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(renderedCanvas, 0, 0, w, h);
    }
  }, [activeMedia.type, currentTime, aspectRatio, cropRect, stageScale, model3DTransform, mediaClips]);

  // 13. Shareable Hosted Link & Deep-Link MCP State Restoration
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const encodedParam = searchParams.get('p') || searchParams.get('project');
      const directPreset = searchParams.get('preset');
      const directBg = searchParams.get('bg') || searchParams.get('background');
      const directRatio = searchParams.get('ratio') || searchParams.get('aspectRatio');
      const directMedia = searchParams.get('media') || searchParams.get('mediaUrl');
      const directTitle = searchParams.get('title');
      const directDuration = parseFloat(searchParams.get('dur') || searchParams.get('duration') || '4.0');
      const directAutoExport = searchParams.get('export') === 'mp4' || searchParams.get('autoExport') === 'true';

      const hasUrlProject = !!(encodedParam || directPreset || directBg || directMedia || directRatio || directAutoExport);

      if (hasUrlProject) {
        // Immediately dismiss beginner guide tutorial so the project displays cleanly
        setIsGuideOpen(false);
        localStorage.setItem('zetashot_guide_completed', 'true');

        let project: ZetashotSharedProject | null = null;
        if (encodedParam) {
          project = decodeProjectFromUrl(encodedParam);
        }

        const title = project?.title || directTitle;
        if (title) {
          document.title = `${title} | Zetashot 3D`;
        }

        const ratio = project?.aspectRatio || (directRatio as any);
        if (ratio) {
          setAspectRatio(ratio);
        }

        // Background restoration
        if (project?.background) {
          setBackground(project.background);
        } else if (directBg) {
          const bgPresets = [
            { id: 'bg-purple-wave', path: '/backgrounds/bg-purple-wave.jpg', position: { x: 50, y: 50 } },
            { id: 'bg-sunflowers', path: '/backgrounds/bg-sunflowers.png', position: { x: 50, y: 100 } },
            { id: 'bg-green-hills', path: '/backgrounds/bg-green-hills.jpg', position: { x: 50, y: 50 } },
            { id: 'bg-halftone-clouds', path: '/backgrounds/bg-halftone-clouds.jpg', position: { x: 50, y: 50 } },
            { id: 'bg-tulips', path: '/backgrounds/bg-tulips.jpg', position: { x: 50, y: 50 } },
          ];
          const matchedWp = bgPresets.find((w) => w.id === directBg || w.id === `bg-${directBg}` || directBg.includes(w.id.replace('bg-', '')));
          if (matchedWp || directBg.startsWith('bg-') || directBg.endsWith('.jpg') || directBg.endsWith('.png')) {
            const path = matchedWp ? matchedWp.path : directBg.startsWith('/') ? directBg : `/backgrounds/${directBg}.jpg`;
            setBackground({
              type: 'image',
              imageUrl: path,
              imageFit: 'cover',
              imageScale: 1.0,
              position: matchedWp?.position || { x: 50, y: 50 },
              opacity: 1,
            });
          } else if (directBg.startsWith('#')) {
            setBackground({ type: 'solid', color: directBg, opacity: 1 });
          }
        }

        // Camera Keyframes restoration
        const cameraPresetToUse = directPreset || (ratio === '9:16' ? 'tiktok_dynamic_bounce' : 'saas_feature_spotlight');
        const durationToUse = project?.duration || directDuration || 4.0;
        let clipsToUse = project?.cameraClips;
        if (!clipsToUse || clipsToUse.length === 0) {
          clipsToUse = buildCameraClipsFromPreset(cameraPresetToUse, durationToUse);
        }

        if (clipsToUse && clipsToUse.length > 0) {
          setClips(clipsToUse);
          setSelectedClipId(clipsToUse[0].id);
          setCamera({ ...clipsToUse[0].camera });
          const calculatedMax = Math.max(
            ...clipsToUse.map((c) => c.startTime + c.duration),
            durationToUse
          );
          setTotalDuration(calculatedMax);
          setMediaDuration(calculatedMax);
          setMediaClips((prevClips) =>
            prevClips.map((c, i) =>
              i === 0 ? { ...c, duration: calculatedMax } : c
            )
          );
        }

        if (project?.textLayers && project.textLayers.length > 0) {
          setTextLayers(project.textLayers);
        }
        if (project?.model3DTransform) {
          setModel3DTransform(project.model3DTransform);
        }

        // Media restoration
        const mediaUrlToUse = project?.mediaUrl || directMedia;
        if (mediaUrlToUse) {
          const customMedia: MediaItem = {
            id: `media_${Date.now()}`,
            name: project?.mediaName || (mediaUrlToUse.split('/').pop()?.split('?')[0] || 'Screen Media'),
            type: project?.mediaType || (mediaUrlToUse.endsWith('.mp4') || mediaUrlToUse.endsWith('.webm') ? 'video' : 'image'),
            url: mediaUrlToUse,
            dimensions: '1920 × 1080',
            format: mediaUrlToUse.endsWith('.mp4') || mediaUrlToUse.endsWith('.webm') ? 'MP4' : 'PNG',
          };
          setActiveMedia(customMedia);
          setMediaList((prev) => {
            if (prev.some((m) => m.url === customMedia.url)) return prev;
            return [customMedia, ...prev];
          });
          setMediaClips((prevClips) =>
            prevClips.map((c, i) =>
              i === 0
                ? {
                    ...c,
                    mediaId: customMedia.id,
                    name: customMedia.name,
                    type: customMedia.type,
                    url: customMedia.url,
                  }
                : c
            )
          );
        }

        // Auto-play the 3D camera trajectory on load so the user sees the insane motions live
        window.setTimeout(() => {
          setIsPlaying(true);
        }, 350);

        // If autoExport is requested, trigger automatic MP4 render and download
        const shouldAutoExport = project?.autoExport || directAutoExport;
        if (shouldAutoExport) {
          setAutoExportRequested(true);
        }
      }
    } catch (e) {
      console.warn('[Zetashot] Failed to parse URL project param:', e);
    }
  }, []);

  const getShareUrl = () => {
    let origin = 'https://zetashot.vercel.app';
    if (typeof window !== 'undefined' && window.location.origin) {
      const locOrigin = window.location.origin;
      if (!locOrigin.includes('localhost') && !locOrigin.includes('127.0.0.1')) {
        origin = locOrigin;
      }
    }
    const payload: ZetashotSharedProject = {
      version: '1.0.0',
      aspectRatio: aspectRatio as any,
      background,
      cameraClips: clips,
      duration: totalDuration,
      textLayers: textLayers.length > 0 ? textLayers : undefined,
      model3DTransform,
      mediaUrl: activeMedia.url.startsWith('http') || activeMedia.url.startsWith('/') ? activeMedia.url : undefined,
      mediaName: activeMedia.name,
      mediaType: activeMedia.type === 'video' ? 'video' : 'image',
    };
    const p = encodeProjectToUrl(payload);
    return p ? `${origin}/?p=${p}` : origin;
  };

  const handleShareLink = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopiedLink(true);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.1, x: 0.85 } });
      setTimeout(() => setIsCopiedLink(false), 2500);
    } catch {
      // Fallback silently if clipboard is restricted
    }
  };

  // When selected clip changes, load its camera angle and seek to its keyframe point (0s for 1st set, 3s for 2nd set)
  const handleSelectClip = useCallback((clipId: string) => {
    setSelectedClipId(clipId);
    selectedClipIdRef.current = clipId;
    if (isGuideOpen) {
      if (clipId === 'P01') {
        setGuidePhase('start');
      } else if (clipId === 'P02' && guidePhase === 'start') {
        setGuidePhase('end');
      }
    }
    const currentClips = clipsRef.current;
    const clipIdx = currentClips.findIndex((c) => c.id === clipId);
    const found = currentClips[clipIdx];
    if (found) {
      setCamera(found.camera);
      if (frameAnchorRef.current) {
        frameAnchorRef.current.style.perspective = `${(found.camera.perspective || 1000) * (stageScaleRef.current || 1.0)}px`;
      }
      if (frameSceneRef.current) {
        frameSceneRef.current.style.transform = calculate3DTransform(found.camera, stageScaleRef.current);
      }
      const targetTime = getKeyframeTargetTime(currentClips, clipId);
      currentTimeRef.current = targetTime;
      setCurrentTime(targetTime);
      if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
        if (!isPlayingRef.current) {
          videoRef.current.pause();
        }
      }
    }
  }, [isGuideOpen, guidePhase]);

  // Helper to update camera and sync with active clip (ensures perspective and angles persist immediately)
  const handleCameraChange = (newCamera: Camera3DState) => {
    const defaultZoom = 0.9;
    const cleanedCam: Camera3DState = {
      rotX: typeof newCamera?.rotX === 'number' && !isNaN(newCamera.rotX) ? Math.round(newCamera.rotX) : 0,
      rotY: typeof newCamera?.rotY === 'number' && !isNaN(newCamera.rotY) ? Math.round(newCamera.rotY) : 0,
      rotZ: typeof newCamera?.rotZ === 'number' && !isNaN(newCamera.rotZ) ? Math.round(newCamera.rotZ) : 0,
      zoom: typeof newCamera?.zoom === 'number' && !isNaN(newCamera.zoom) ? Number(newCamera.zoom.toFixed(2)) : defaultZoom,
      panX: typeof newCamera?.panX === 'number' && !isNaN(newCamera.panX) ? Math.round(newCamera.panX) : 0,
      panY: typeof newCamera?.panY === 'number' && !isNaN(newCamera.panY) ? Math.round(newCamera.panY) : 0,
      perspective: typeof newCamera?.perspective === 'number' && !isNaN(newCamera.perspective) ? Math.round(newCamera.perspective) : 1000,
    };
    setCamera(cleanedCam);
    playGearSound();

    if (frameAnchorRef.current) {
      frameAnchorRef.current.style.perspective = `${cleanedCam.perspective * (stageScaleRef.current || 1.0)}px`;
    }
    if (frameSceneRef.current) {
      frameSceneRef.current.style.transform = calculate3DTransform(cleanedCam, stageScaleRef.current);
    }

    const currentClips = clipsRef.current;
    const currentMediaClips = mediaClipsRef.current;
    const activeMedia = currentMediaClips.length > 0
      ? getActiveMediaClipAtTime(currentMediaClips, currentTimeRef.current)
      : null;

    // Filter candidate clips strictly belonging to the active media clip when multi-clip
    let candidateClips = currentClips;
    if (activeMedia) {
      candidateClips = currentClips.filter((c) =>
        c.mediaClipId ? c.mediaClipId === activeMedia.id : (c.startTime >= activeMedia.startTime - 0.05 && c.startTime < activeMedia.startTime + activeMedia.duration)
      );
    }

    let targetId = selectedClipIdRef.current || selectedClipId;
    if (!targetId || !candidateClips.some((c) => c.id === targetId)) {
      const active = getActiveClipAtTime(candidateClips, currentTimeRef.current);
      targetId = active ? active.id : (candidateClips[0]?.id || '');
    }

    if (targetId && currentClips.some((c) => c.id === targetId)) {
      // Update existing keyframe belonging to this media clip
      setSelectedClipId(targetId);
      selectedClipIdRef.current = targetId;
      const nextClips = currentClips.map((c) => (c.id === targetId ? { ...c, camera: cleanedCam } : c));
      clipsRef.current = nextClips;
      setClips(nextClips);
    } else if (activeMedia) {
      // Active media clip has NO keyframe! Create a keyframe directly for activeMedia
      // DO NOT fall back to modifying a keyframe from another clip!
      const nextNum = getNextKeyframeIndex(currentClips);
      const pad = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      const newKeyframe: TimelinePositionClip = {
        id: `P${pad}_${Date.now()}`,
        name: `P${pad}`,
        startTime: Number(currentTimeRef.current.toFixed(2)),
        duration: Math.min(1.5, Number((activeMedia.duration / 2).toFixed(2)) || 1.5),
        camera: cleanedCam,
        color: 'yellow',
        transition: 'cut',
        exitTransition: 'cut',
        mediaClipId: activeMedia.id,
        blockId: `block_${activeMedia.id}`,
      };
      const nextClips = [...currentClips, newKeyframe].sort((a, b) => a.startTime - b.startTime);
      clipsRef.current = nextClips;
      setClips(nextClips);
      setSelectedClipId(newKeyframe.id);
      selectedClipIdRef.current = newKeyframe.id;
    }
  };

  // Synchronous Media Duration and Playback Rate Sync Handler
  const handleMediaDurationChange = useCallback((newDur: number) => {
    const clamped = Math.max(0.6, Number(newDur.toFixed(2)));
    setMediaDuration(clamped);
    mediaDurationRef.current = clamped;
    if (videoRef.current && activeMediaRef.current.type === 'video') {
      const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
        ? videoRef.current.duration
        : clamped;
      if (isComposedRef.current) {
        videoRef.current.playbackRate = Math.max(0.1, Math.min(4.0, naturalDur / clamped));
      }
    }
  }, []);

  const handleClipsChange = useCallback((newClips: TimelinePositionClip[]) => {
    setClips(newClips);
    let maxEnd = 0;
    for (const c of newClips) {
      const end = (c.startTime || 0) + (c.duration || 0);
      if (end > maxEnd) maxEnd = end;
    }
    if (maxEnd > 0) {
      const clamped = Number(maxEnd.toFixed(2));
      setMediaDuration(clamped);
      mediaDurationRef.current = clamped;
      if (videoRef.current && activeMediaRef.current.type === 'video') {
        const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
          ? videoRef.current.duration
          : clamped;
        const computedRate = calculatePlaybackRate(naturalDur, clamped);
        videoRef.current.playbackRate = computedRate;
      }
      // Also ensure mediaClips duration is synchronized (only for single media clip!)
      // For multi-clip sequences, each clip preserves its independent length.
      if (mediaClipsRef.current.length === 1) {
        const naturalDur = (videoRef.current?.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
          ? videoRef.current.duration
          : clamped;
        setMediaClips((prev) => syncMediaClipsToKeyframeDuration(prev, clamped, naturalDur));
      }
    }
  }, []);

  // Auto-compose macro generator: transforms into choreographed sequence from interest regions
  // Core Rule: Compose = Synchronize media duration to Number of Interest Points * 2.5s (or natural video duration), master timeline stays 12s
  // If 0 Interest Points exist: DO NOT create zoom keyframes, DO NOT change camera, DO NOT modify timeline.
  const handleCompose = () => {
    if (interestRegions.length > 0) {
      setIsComposed(true);
      isComposedRef.current = true;

      const defaultDurationPerRegion = DEFAULT_COMPOSE_STEP_DURATION;
      const targetClipIdx = selectedMediaClipId
        ? mediaClipsRef.current.findIndex((c) => c.id === selectedMediaClipId)
        : 0;
      const actualClipIdx = targetClipIdx !== -1 ? targetClipIdx : 0;
      const targetClip = mediaClipsRef.current[actualClipIdx] || mediaClipsRef.current[0];

      const composedDuration = Number((interestRegions.length * defaultDurationPerRegion).toFixed(2));

      // Visual timeline ruler stays at default duration (10s on mobile, 12s on desktop)
      const defaultDuration = getDefaultTimelineDuration();
      setTotalDuration(defaultDuration);
      totalDurationRef.current = defaultDuration;

      const clipStart = mediaClipsRef.current
        .slice(0, actualClipIdx)
        .reduce((sum, c) => sum + c.duration, 0);
      const oldDuration = targetClip ? targetClip.duration : composedDuration;
      const durationDelta = Number((composedDuration - oldDuration).toFixed(2));

      // Update target clip's duration
      const updatedMediaClips = mediaClipsRef.current.map((c, idx) =>
        idx === actualClipIdx ? { ...c, duration: composedDuration } : c
      );
      const resequenced = sequenceClipsContiguously(updatedMediaClips);
      mediaClipsRef.current = resequenced;
      setMediaClips(resequenced);

      const totalMediaDur = calculateMediaSequenceDuration(resequenced);
      setMediaDuration(totalMediaDur);
      mediaDurationRef.current = totalMediaDur;

      // Determine keyframe numbering starting index
      let startKeyframeIndex = 1;
      if (actualClipIdx > 0) {
        let maxNum = 0;
        clipsRef.current.forEach((c) => {
          const isUpstream = c.mediaClipId
            ? c.mediaClipId !== targetClip.id && c.startTime <= clipStart + 0.001
            : c.startTime <= clipStart + 0.001;
          if (isUpstream) {
            const match = c.name?.match(/^P(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
        startKeyframeIndex = maxNum + 1;
      }

      const blockId = `compose_block_${targetClip.id}_${Date.now()}`;
      const generated = generateClipsFromInterestRegions(
        interestRegions,
        composedDuration,
        STAGE_BASE_DIMS,
        camera,
        'cinematic',
        {
          blockId,
          mediaClipId: targetClip.id,
          startKeyframeIndex,
        }
      );

      const offsetGenerated = generated.map((k) => ({
        ...k,
        startTime: Number((k.startTime + clipStart).toFixed(2)),
      }));

      setClips((prevClips) => {
        if (mediaClipsRef.current.length <= 1) {
          return offsetGenerated;
        }
        // Upstream: all keyframes belonging to preceding clips.
        // Preserves the preceding clip's terminal keyframe at t = clipStart!
        const upstream = prevClips.filter((c) => {
          if (c.mediaClipId) {
            return c.mediaClipId !== targetClip.id && c.startTime <= clipStart + 0.001;
          }
          return c.startTime < clipStart - 0.001 || (Math.abs(c.startTime - clipStart) <= 0.01 && c.duration === 0);
        });

        // Downstream: all keyframes belonging to subsequent clips, shifted by durationDelta
        const downstream = prevClips
          .filter((c) => {
            if (c.mediaClipId) {
              return c.mediaClipId !== targetClip.id && c.startTime >= clipStart + oldDuration - 0.001;
            }
            return c.startTime >= clipStart + oldDuration - 0.001;
          })
          .map((c) => ({
            ...c,
            startTime: Math.max(0, Number((c.startTime + durationDelta).toFixed(2))),
          }));

        return [...upstream, ...offsetGenerated, ...downstream];
      });

      setInterestRegions([]);
      if (offsetGenerated.length > 0) {
        setSelectedClipId(offsetGenerated[0].id);
        currentTimeRef.current = clipStart;
        setCurrentTime(clipStart);
        setCamera(offsetGenerated[0].camera);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          const natDur = (videoRef.current?.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
            ? videoRef.current.duration
            : composedDuration;
          const computedRate = calculatePlaybackRate(natDur, composedDuration);
          videoRef.current.playbackRate = computedRate;
        }
      }
    }
    // 0 Interest Points: Simply exit compose mode without touching keyframes or camera
    setIsMarkingRegion(false);
    setTopMode('operator');
  };

  // Close compose handler: keep visual timeline ruler at default duration (10s on mobile, 12s on desktop)
  const handleCloseCompose = () => {
    const defaultDuration = getDefaultTimelineDuration();
    setTotalDuration(defaultDuration);
    totalDurationRef.current = defaultDuration;
    if (interestRegions.length > 0) {
      setIsComposed(true);
      isComposedRef.current = true;

      const defaultDurationPerRegion = DEFAULT_COMPOSE_STEP_DURATION;
      const targetClipIdx = selectedMediaClipId
        ? mediaClipsRef.current.findIndex((c) => c.id === selectedMediaClipId)
        : 0;
      const actualClipIdx = targetClipIdx !== -1 ? targetClipIdx : 0;
      const targetClip = mediaClipsRef.current[actualClipIdx] || mediaClipsRef.current[0];

      const composedDuration = Number((interestRegions.length * defaultDurationPerRegion).toFixed(2));

      const clipStart = mediaClipsRef.current
        .slice(0, actualClipIdx)
        .reduce((sum, c) => sum + c.duration, 0);
      const oldDuration = targetClip ? targetClip.duration : composedDuration;
      const durationDelta = Number((composedDuration - oldDuration).toFixed(2));

      const updatedMediaClips = mediaClipsRef.current.map((c, idx) =>
        idx === actualClipIdx ? { ...c, duration: composedDuration } : c
      );
      const resequenced = sequenceClipsContiguously(updatedMediaClips);
      mediaClipsRef.current = resequenced;
      setMediaClips(resequenced);

      const totalMediaDur = calculateMediaSequenceDuration(resequenced);
      setMediaDuration(totalMediaDur);
      mediaDurationRef.current = totalMediaDur;

      let startKeyframeIndex = 1;
      if (actualClipIdx > 0) {
        let maxNum = 0;
        clipsRef.current.forEach((c) => {
          const isUpstream = c.mediaClipId
            ? c.mediaClipId !== targetClip.id && c.startTime <= clipStart + 0.001
            : c.startTime <= clipStart + 0.001;
          if (isUpstream) {
            const match = c.name?.match(/^P(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
        startKeyframeIndex = maxNum + 1;
      }

      const blockId = `compose_block_${targetClip.id}_${Date.now()}`;
      const generated = generateClipsFromInterestRegions(
        interestRegions,
        composedDuration,
        STAGE_BASE_DIMS,
        camera,
        'cinematic',
        {
          blockId,
          mediaClipId: targetClip.id,
          startKeyframeIndex,
        }
      );

      const offsetGenerated = generated.map((k) => ({
        ...k,
        startTime: Number((k.startTime + clipStart).toFixed(2)),
      }));

      setClips((prevClips) => {
        if (mediaClipsRef.current.length <= 1) {
          return offsetGenerated;
        }
        const upstream = prevClips.filter((c) => {
          if (c.mediaClipId) {
            return c.mediaClipId !== targetClip.id && c.startTime <= clipStart + 0.001;
          }
          return c.startTime < clipStart - 0.001 || (Math.abs(c.startTime - clipStart) <= 0.01 && c.duration === 0);
        });

        const downstream = prevClips
          .filter((c) => {
            if (c.mediaClipId) {
              return c.mediaClipId !== targetClip.id && c.startTime >= clipStart + oldDuration - 0.001;
            }
            return c.startTime >= clipStart + oldDuration - 0.001;
          })
          .map((c) => ({
            ...c,
            startTime: Math.max(0, Number((c.startTime + durationDelta).toFixed(2))),
          }));

        return [...upstream, ...offsetGenerated, ...downstream];
      });

      setInterestRegions([]);
      if (offsetGenerated.length > 0) {
        setSelectedClipId(offsetGenerated[0].id);
      }
    }
    setIsMarkingRegion(false);
    setTopMode('operator');
  };

  // Explicit Play / Pause handler with guaranteed immediate synchronous execution
  const handlePlayPause = useCallback(() => {
    setGuidePhase((prev) => (prev === 'preview' || prev === 'end' ? 'export' : prev));
    setGuideStepIndex((prev) => (prev === 4 ? 5 : prev));
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      audioPlayersMapRef.current.forEach((player) => player.pause());
      document.querySelectorAll('video').forEach((v) => v.pause());
      // Synchronize exact camera and currentTime to React UI upon pause
      const currentClips = clipsRef.current;
      const pausedCamera = interpolateCameraSpline(currentClips, currentTimeRef.current, mediaClipsRef.current);
      lastInterpolatedCameraRef.current = pausedCamera;
      setCamera(pausedCamera);
      setCurrentTime(currentTimeRef.current);
    } else {
      const activeProjectDuration = calculateTimelineDuration(clipsRef.current, mediaDurationRef.current);
      if (currentTimeRef.current >= activeProjectDuration - 0.05) {
        currentTimeRef.current = 0;
        setCurrentTime(0);
        updateGradientTransitionVisuals(0);
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (videoRef.current) {
        const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
          ? videoRef.current.duration
          : mediaDurationRef.current;

        const activeClip = mediaClipsRef.current.length > 0 ? getActiveMediaClipAtTime(mediaClipsRef.current, currentTimeRef.current) : null;
        if (activeClip && activeClip.type === 'video') {
          const clipSpeed = activeClip.speed || (isComposedRef.current ? calculatePlaybackRate(naturalDur, mediaDurationRef.current || 3.0) : 1.0);
          videoRef.current.playbackRate = clipSpeed;
          const targetVidTime = Math.min(
            naturalDur - 0.03,
            Math.max(0, (currentTimeRef.current - activeClip.startTime) * clipSpeed + (activeClip.sourceStartTime || 0))
          );
          if (Math.abs(videoRef.current.currentTime - targetVidTime) > 0.05) {
            videoRef.current.currentTime = targetVidTime;
          }
        } else if (isComposedRef.current) {
          const medDur = mediaDurationRef.current > 0 ? mediaDurationRef.current : 3.0;
          videoRef.current.playbackRate = calculatePlaybackRate(naturalDur, medDur);
          const targetVidTime = Math.min(
            naturalDur,
            (currentTimeRef.current / medDur) * naturalDur
          );
          if (Math.abs(videoRef.current.currentTime - targetVidTime) > 0.05) {
            videoRef.current.currentTime = targetVidTime;
          }
        } else {
          // Normal un-composed playback at 1.0x normal speed throughout full video length
          videoRef.current.playbackRate = 1.0;
          const targetVidTime = Math.min(naturalDur, currentTimeRef.current);
          if (Math.abs(videoRef.current.currentTime - targetVidTime) > 0.05) {
            videoRef.current.currentTime = targetVidTime;
          }
        }

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }

      // Sync background audio & SFX playback (concurrent multi-track)
      const activeAudios = getActiveAudioItemsAtTime(audioTracksRef.current, currentTimeRef.current);
      const activeIds = new Set(activeAudios.map((a) => a.id));
      audioPlayersMapRef.current.forEach((player, id) => {
        if (!activeIds.has(id)) {
          player.pause();
        }
      });
      activeAudios.forEach((track) => {
        let player = audioPlayersMapRef.current.get(track.id);
        if (!player || player.src !== track.url) {
          if (player) player.pause();
          player = new Audio(track.url);
          audioPlayersMapRef.current.set(track.id, player);
        }
        player.volume = track.isMuted ? 0 : Math.max(0, Math.min(1, track.volume ?? 1.0));
        const trackTime = Math.max(0, (currentTimeRef.current - track.startTime) + (track.sourceStartTime || 0));
        player.currentTime = trackTime;
        player.play().catch(() => {});
      });
    }
  }, []);

  // Explicit Seek handler with instant video & camera update
  const handleSeek = useCallback((time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);

    // Sync multi-clip active media on stage
    if (mediaClipsRef.current.length > 0) {
      const clipAtTime = getActiveMediaClipAtTime(mediaClipsRef.current, time);
      if (clipAtTime && clipAtTime.url !== activeMediaRef.current.url) {
        setActiveMedia({
          id: clipAtTime.mediaId,
          name: clipAtTime.name,
          type: clipAtTime.type,
          url: clipAtTime.url,
          dimensions: '1920 × 1080',
          format: clipAtTime.type === 'video' ? 'MP4' : 'PNG',
        });
      }
    }

    if (videoRef.current && activeMediaRef.current.type === 'video') {
      const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
        ? videoRef.current.duration
        : mediaDurationRef.current;

      const activeClip = mediaClipsRef.current.length > 0 ? getActiveMediaClipAtTime(mediaClipsRef.current, time) : null;
      if (activeClip && activeClip.type === 'video') {
        const clipSpeed = activeClip.speed || (isComposedRef.current ? calculatePlaybackRate(naturalDur, mediaDurationRef.current || 3.0) : 1.0);
        const targetVidTime = Math.min(
          naturalDur - 0.03,
          Math.max(0, (time - activeClip.startTime) * clipSpeed + (activeClip.sourceStartTime || 0))
        );
        videoRef.current.currentTime = targetVidTime;
      } else if (isComposedRef.current) {
        const medDur = mediaDurationRef.current > 0 ? mediaDurationRef.current : 3.0;
        const targetVidTime = Math.min(
          naturalDur,
          (time / medDur) * naturalDur
        );
        videoRef.current.currentTime = targetVidTime;
      } else {
        // Normal 1:1 timeline seeking at standard speed
        videoRef.current.currentTime = Math.min(naturalDur, time);
      }

      if (!isPlayingRef.current) {
        videoRef.current.pause();
      }
    }

    // Audio preview seek sync (concurrent multi-track)
    const activeAudios = getActiveAudioItemsAtTime(audioTracksRef.current, time);
    const activeIds = new Set(activeAudios.map((a) => a.id));
    audioPlayersMapRef.current.forEach((player, id) => {
      if (!activeIds.has(id)) {
        player.pause();
      }
    });
    activeAudios.forEach((track) => {
      let player = audioPlayersMapRef.current.get(track.id);
      if (!player || player.src !== track.url) {
        if (player) player.pause();
        player = new Audio(track.url);
        audioPlayersMapRef.current.set(track.id, player);
      }
      player.volume = track.isMuted ? 0 : Math.max(0, Math.min(1, track.volume ?? 1.0));
      const trackTime = Math.max(0, (time - track.startTime) + (track.sourceStartTime || 0));
      player.currentTime = trackTime;
      if (isPlayingRef.current) {
        player.play().catch(() => {});
      } else {
        player.pause();
      }
    });

    const currentClips = clipsRef.current;
    const currentMediaClips = mediaClipsRef.current;
    const activeMedia = currentMediaClips.length > 0
      ? getActiveMediaClipAtTime(currentMediaClips, time)
      : null;

    if (currentClips.length > 0) {
      let candidateClips = currentClips;
      if (activeMedia) {
        candidateClips = currentClips.filter((c) =>
          c.mediaClipId ? c.mediaClipId === activeMedia.id : (c.startTime >= activeMedia.startTime - 0.05 && c.startTime < activeMedia.startTime + activeMedia.duration)
        );
      }
      const targetClip = getActiveClipAtTime(candidateClips, time);
      if (targetClip) {
        if (selectedClipIdRef.current !== targetClip.id) {
          selectedClipIdRef.current = targetClip.id;
          setSelectedClipId(targetClip.id);
        }
      } else if (activeMedia && candidateClips.length === 0) {
        // Active media clip has no keyframes, clear selected keyframe
        selectedClipIdRef.current = '';
        setSelectedClipId('');
      }
    }
    const interpolated = getCameraAtTime(currentClips, time, currentMediaClips);
    setCamera(interpolated);
    if (frameAnchorRef.current) {
      frameAnchorRef.current.style.perspective = `${(interpolated.perspective || 1000) * (stageScaleRef.current || 1.0)}px`;
    }
    if (frameSceneRef.current) {
      frameSceneRef.current.style.transform = calculate3DTransform(interpolated, stageScaleRef.current);
    }
    updateGradientTransitionVisuals(time);
  }, [updateGradientTransitionVisuals]);

  // Master Timeline Playback Animation Loop (Frame-Accurate & Zero-Drift)
  useEffect(() => {
    if (!isPlaying) return;

    let animFrame: number;
    let lastTimestamp = performance.now();
    let lastReactUpdateTime = 0;

    const loop = (now: number) => {
      if (!isPlayingRef.current) return;

      const video = videoRef.current;
      const media = activeMediaRef.current;
      const activeProjectDuration = calculateTimelineDuration(clipsRef.current, mediaDurationRef.current);
      const isVideoMedia = media.type === 'video' && !!video && (video.duration > 0 || !isNaN(video.duration));

      let nextTime: number;
      if (isVideoMedia && !video.paused && !video.seeking) {
        // Direct synchronization with the hardware video decoder clock:
        // Deriving timeline progression directly from video.currentTime eliminates clock drift,
        // decoder stall latency, and stuttering entirely.
        const activeClip = mediaClipsRef.current.length > 0 ? getActiveMediaClipAtTime(mediaClipsRef.current, currentTimeRef.current) : null;
        if (activeClip && activeClip.type === 'video') {
          const clipSpeed = activeClip.speed || (isComposedRef.current ? calculatePlaybackRate(video.duration, mediaDurationRef.current || 3.0) : 1.0);
          if (video.playbackRate !== clipSpeed) {
            video.playbackRate = clipSpeed;
          }
          nextTime = activeClip.startTime + Math.max(0, (video.currentTime - (activeClip.sourceStartTime || 0))) / (clipSpeed || 1.0);
        } else if (isComposedRef.current) {
          const medDur = mediaDurationRef.current > 0 ? mediaDurationRef.current : 3.0;
          nextTime = (video.currentTime / (video.duration || 1)) * medDur;
        } else {
          nextTime = video.currentTime;
        }
      } else if (isVideoMedia && video.seeking) {
        // Hold timeline steady while the video seeks so the playhead never races ahead of the decoder
        nextTime = currentTimeRef.current;
      } else {
        const deltaSec = (now - lastTimestamp) / 1000;
        nextTime = currentTimeRef.current + deltaSec;
      }
      lastTimestamp = now;

      if (nextTime >= activeProjectDuration || (isVideoMedia && video.ended)) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
        audioPlayersMapRef.current.forEach((player) => {
          player.pause();
          player.currentTime = 0;
        });
        playedTransitionsRef.current.clear();
        currentTimeRef.current = 0;
        setCurrentTime(0);
        const finalClips = clipsRef.current;
        const resetCamera = interpolateCameraSpline(finalClips, 0, mediaClipsRef.current);
        lastInterpolatedCameraRef.current = resetCamera;
        setCamera(resetCamera);
        updateGradientTransitionVisuals(0);
        return;
      }

      currentTimeRef.current = nextTime;

      // Throttle React setCurrentTime state updates to ~25 FPS to eliminate 60Hz main-thread diffing stalls
      if (now - lastReactUpdateTime >= 40) {
        setCurrentTime(nextTime);
        lastReactUpdateTime = now;
      }

      updateGradientTransitionVisuals(nextTime);

      // Multi-Clip active switch on stage
      if (mediaClipsRef.current.length > 0) {
        const clipAtTime = getActiveMediaClipAtTime(mediaClipsRef.current, nextTime);
        if (clipAtTime && clipAtTime.url !== activeMediaRef.current.url) {
          setActiveMedia({
            id: clipAtTime.mediaId,
            name: clipAtTime.name,
            type: clipAtTime.type,
            url: clipAtTime.url,
            dimensions: '1920 × 1080',
            format: clipAtTime.type === 'video' ? 'MP4' : 'PNG',
          });
        }
      }

      // Audio preview multi-track sync
      const activeAudios = getActiveAudioItemsAtTime(audioTracksRef.current, nextTime);
      const activeIds = new Set(activeAudios.map((a) => a.id));
      audioPlayersMapRef.current.forEach((player, id) => {
        if (!activeIds.has(id) && !player.paused) {
          player.pause();
        }
      });
      activeAudios.forEach((track) => {
        let player = audioPlayersMapRef.current.get(track.id);
        const targetAudioTime = Math.max(0, (nextTime - track.startTime) + (track.sourceStartTime || 0));
        if (!player || player.src !== track.url) {
          if (player) player.pause();
          player = new Audio(track.url);
          audioPlayersMapRef.current.set(track.id, player);
          player.volume = track.isMuted ? 0 : Math.max(0, Math.min(1, track.volume ?? 1.0));
          player.currentTime = targetAudioTime;
          if (isPlayingRef.current) {
            player.play().catch(() => {});
          }
        } else {
          player.volume = track.isMuted ? 0 : Math.max(0, Math.min(1, track.volume ?? 1.0));
          if (player.paused && isPlayingRef.current) {
            player.currentTime = targetAudioTime;
            player.play().catch(() => {});
          } else if (Math.abs(player.currentTime - targetAudioTime) > 0.3) {
            player.currentTime = targetAudioTime;
          }
        }
      });

      // Canonical camera evaluation matching export 1:1 with Catmull-Rom spline
      const currentClips = clipsRef.current;
      const interpolated = interpolateCameraSpline(currentClips, nextTime, mediaClipsRef.current);
      lastInterpolatedCameraRef.current = interpolated;

      // Direct GPU transform update for instantaneous, buttery smooth 60fps response
      if (frameAnchorRef.current) {
        frameAnchorRef.current.style.perspective = `${(interpolated.perspective || 1000) * (stageScaleRef.current || 1.0)}px`;
      }
      if (frameSceneRef.current) {
        frameSceneRef.current.style.transform = calculate3DTransform(interpolated, stageScaleRef.current);
      }

      if (isPlayingRef.current) {
        animFrame = requestAnimationFrame(loop);
      }
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying]);

  const isProcessingRef = useRef<boolean>(false);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Clean pause enforcement when isPlaying is false and not exporting
  useEffect(() => {
    if (!isPlaying && !isProcessing) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isProcessing]);

  // Stage Mouse Move (Cursor follower)
  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (!frameSceneRef.current) return;
    const rect = frameSceneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPos({ x, y });
  };

  // Global Keyboard Shortcuts for Move (V), Orbit (R), Spacebar (Play/Pause), and Split (S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'v' || e.key === 'V') {
        setDragMode('move');
      } else if (e.key === 'r' || e.key === 'R') {
        setDragMode('orbit');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        const newLayer = createDefaultTextLayer(currentTimeRef.current);
        setTextLayers((prev) => [...prev, newLayer]);
        setSelectedTextLayerId(newLayer.id);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const { updatedClips, splitClipId } = splitMediaClipAtTime(mediaClipsRef.current, currentTimeRef.current);
        if (splitClipId) {
          const targetClip = mediaClipsRef.current.find(
            (c) => currentTimeRef.current >= c.startTime + 0.15 && currentTimeRef.current <= c.startTime + c.duration - 0.15
          );
          if (targetClip) {
            const updatedKeyframes = splitKeyframesAtTime(clipsRef.current, currentTimeRef.current, targetClip.id, splitClipId);
            setClips(updatedKeyframes);
            clipsRef.current = updatedKeyframes;
          }
          setMediaClips(updatedClips);
          setSelectedMediaClipId(splitClipId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);

  // Direct 3D Scene Dragging with smooth pointer tracking (Move/Pan vs Orbit)
  const handleSceneMouseDown = (e: React.MouseEvent) => {
    if (isMarkingRegion) return;

    // Shift or Middle Click (button 1) or Right Click (button 2) temporarily forces Move
    const isModifierPan = e.shiftKey || e.button === 1 || e.button === 2;
    const effectiveMode = isModifierPan ? 'move' : dragMode;

    e.preventDefault();
    setIsDraggingScene(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: camera.rotX,
      rotY: camera.rotY,
      panX: camera.panX || 0,
      panY: camera.panY || 0,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      const deltaY = moveEvent.clientY - dragStartRef.current.y;
      const currentScale = stageScaleRef.current || 1.0;

      if (effectiveMode === 'move') {
        // Direct 1:1 screen pixel position moving
        const newPanX = Math.round(dragStartRef.current.panX + deltaX / currentScale);
        const newPanY = Math.round(dragStartRef.current.panY + deltaY / currentScale);
        handleCameraChange({
          ...camera,
          panX: newPanX,
          panY: newPanY,
        });
      } else {
        // 3D Orbit / Angle rotation
        const newRotY = clampRotation(dragStartRef.current.rotY + deltaX * 0.35, -85, 85);
        const newRotX = clampRotation(dragStartRef.current.rotX - deltaY * 0.35, -85, 85);
        handleCameraChange({
          ...camera,
          rotX: newRotX,
          rotY: newRotY,
        });
      }

      // Auto-advance beginner guide if on Step 2 (Move & 3D Orbit)
      if (isGuideOpen && guideStepIndex === 1) {
        setGuideStepIndex(2);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingScene(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Mobile / Touch support for 3D Scene Dragging & 2-finger Pinch-to-Zoom
  const handleSceneTouchStart = (e: React.TouchEvent) => {
    if (isMarkingRegion) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDraggingScene(true);
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        rotX: camera.rotX,
        rotY: camera.rotY,
        panX: camera.panX || 0,
        panY: camera.panY || 0,
      };
    } else if (e.touches.length === 2) {
      setIsDraggingScene(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
        rotX: camera.rotX,
        rotY: camera.rotY,
        panX: camera.panX || 0,
        panY: camera.panY || 0,
        initialDistance: dist,
        initialZoom: camera.zoom,
      };
    }
  };

  const handleSceneTouchMove = (e: React.TouchEvent) => {
    if (isMarkingRegion) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const currentScale = stageScaleRef.current || 1.0;

      if (dragMode === 'move') {
        const newPanX = Math.round(touchStartRef.current.panX + deltaX / currentScale);
        const newPanY = Math.round(touchStartRef.current.panY + deltaY / currentScale);
        handleCameraChange({
          ...camera,
          panX: newPanX,
          panY: newPanY,
        });
      } else {
        const newRotY = clampRotation(touchStartRef.current.rotY + deltaX * 0.4, -85, 85);
        const newRotX = clampRotation(touchStartRef.current.rotX - deltaY * 0.4, -85, 85);
        handleCameraChange({
          ...camera,
          rotX: newRotX,
          rotY: newRotY,
        });
      }

      if (isGuideOpen && guideStepIndex === 1) {
        setGuideStepIndex(2);
      }
    } else if (e.touches.length === 2 && touchStartRef.current.initialDistance && touchStartRef.current.initialZoom !== undefined) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleFactor = dist / Math.max(1, touchStartRef.current.initialDistance);
      const newZoom = Math.max(0.2, Math.min(3.5, Number((touchStartRef.current.initialZoom * scaleFactor).toFixed(2))));
      handleCameraChange({
        ...camera,
        zoom: newZoom,
      });
    }
  };

  const handleSceneTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        rotX: camera.rotX,
        rotY: camera.rotY,
        panX: camera.panX || 0,
        panY: camera.panY || 0,
      };
    } else if (e.touches.length === 0) {
      setIsDraggingScene(false);
    }
  };

  // Append a new media item to the multi-clip sequence
  const handleAddMediaClip = useCallback((item: MediaItem) => {
    const isVideo = item.type === 'video';
    const is3D = item.type === '3d';
    const dur = isVideo || is3D ? 4.0 : 3.0;

    // Ensure item is registered in library list
    setMediaList((prev) => {
      if (prev.some((m) => m.id === item.id || (m.url && m.url === item.url))) {
        return prev;
      }
      return [item, ...prev.filter((m) => m.id !== 'blank-media')];
    });

    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // IMPORTANT: Compute start time of new clip BEFORE updating mediaClipsRef.current!
    // The new clip starts directly at the end of the existing clips sequence.
    const newClipStartTime = calculateMediaSequenceDuration(mediaClipsRef.current);

    setMediaClips((prev) => {
      const nextStart = calculateMediaSequenceDuration(prev);
      const newClip: MediaTimelineClip = {
        id: newClipId,
        mediaId: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
        startTime: nextStart,
        duration: dur,
        transition: prev.length > 0 ? 'gradient' : undefined,
        modelTransform: is3D ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
      };
      const updated = [...prev, newClip];
      mediaClipsRef.current = updated;
      const newSeqDur = calculateMediaSequenceDuration(updated);
      setMediaDuration(newSeqDur);
      mediaDurationRef.current = newSeqDur;
      const defaultDuration = getDefaultTimelineDuration();
      if (newSeqDur > totalDurationRef.current) {
        setTotalDuration(Math.max(defaultDuration, Math.ceil(newSeqDur)));
        totalDurationRef.current = Math.max(defaultDuration, Math.ceil(newSeqDur));
      }
      setSelectedMediaClipId(newClip.id);
      return updated;
    });

    const defaultCam = isVideo ? DEFAULT_VIDEO_STATIC_CAMERA : DEFAULT_STATIC_CAMERA;
    // Generate new keyframes for the newly uploaded media clip
    // positioned DIRECTLY above the new clip on the timeline starting at newClipStartTime
    setClips((prevClips) => {
      return generateKeyframesForNewMediaClip(prevClips, newClipStartTime, dur, defaultCam, newClipId);
    });

    if (isVideo) {
      setStudioMode('video');
      setCamera({ ...DEFAULT_VIDEO_STATIC_CAMERA });
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.src = item.url;
    } else if (is3D) {
      setStudioMode('video');
      setModel3DTransform({ ...DEFAULT_MODEL_3D_TRANSFORM });
    }
    setActiveMedia(item);
    currentTimeRef.current = newClipStartTime;
    setCurrentTime(newClipStartTime);
  }, []);

  // Upload user file
  const handleUploadFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isFBX = fileName.endsWith('.fbx');
    const is3D = isFBX || fileName.endsWith('.obj') || fileName.endsWith('.gltf') || fileName.endsWith('.glb');
    const isVideo = !is3D && (file.type.startsWith('video') || fileName.endsWith('.mp4') || fileName.endsWith('.webm') || fileName.endsWith('.mov') || fileName.endsWith('.mkv'));
    const isImage = !is3D && !isVideo && (file.type.startsWith('image') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp'));

    // If currently viewing a 3D model and user drops/uploads an image, apply it as a diffuse texture
    if (activeMedia.type === '3d' && isImage && mediaLibraryMode !== 'add') {
      await handleUploadModelTexture(file, 'diffuse');
      return;
    }

    const url = URL.createObjectURL(file);
    const newItem: MediaItem = {
      id: `upload_${Date.now()}`,
      name: file.name,
      type: is3D ? '3d' : isVideo ? 'video' : 'image',
      url,
      dimensions: is3D ? '3D Mesh' : isVideo ? '1920 × 1080' : 'Custom Image',
      format: file.name.split('.').pop()?.toUpperCase() || (is3D ? '3D' : 'FILE'),
    };

    if (is3D) {
      try {
        const buffer = await file.arrayBuffer();
        if (!model3DRendererRef.current) {
          model3DRendererRef.current = new FBX3DRenderer();
        }
        loadedFBXUrlRef.current = url;
        setModel3DTextures({ ...DEFAULT_MODEL_3D_TEXTURES });
        await model3DRendererRef.current.loadModel(buffer, file.name);
      } catch (err) {
        console.warn('[Zetashot] Error reading 3D file buffer:', err);
      }
    }

    setMediaList((prev) => [newItem, ...prev.filter((item) => item.id !== 'blank-media')]);

    if (mediaLibraryMode === 'add') {
      handleAddMediaClip(newItem);
    } else {
      setIsComposed(false);
      isComposedRef.current = false;
      setInterestRegions([]);
      setActiveMedia(newItem);
      setCropRect({ x: 0, y: 0, width: 100, height: 100 });

      setMediaClips((prev) => {
        const dur = isVideo || is3D ? 4.0 : 3.0;
        if (prev.length === 0) {
          return [
            {
              id: `clip_${Date.now()}`,
              mediaId: newItem.id,
              name: newItem.name,
              type: newItem.type,
              url: newItem.url,
              startTime: 0,
              duration: dur,
              modelTransform: is3D ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
            },
          ];
        }
        if (selectedMediaClipId) {
          return prev.map((c) =>
            c.id === selectedMediaClipId
              ? {
                  ...c,
                  mediaId: newItem.id,
                  name: newItem.name,
                  type: newItem.type,
                  url: newItem.url,
                  modelTransform: is3D ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
                }
              : c
          );
        }
        return prev.map((c, idx) =>
          idx === 0
            ? {
                ...c,
                mediaId: newItem.id,
                name: newItem.name,
                type: newItem.type,
                url: newItem.url,
                modelTransform: is3D ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
              }
            : c
        );
      });
    }

    if (isVideo) {
      setStudioMode('video');
      setCamera({ ...DEFAULT_VIDEO_STATIC_CAMERA });
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.src = url;
    } else if (is3D) {
      setStudioMode('video');
      setModel3DTransform({ ...DEFAULT_MODEL_3D_TRANSFORM });
    }
    setGuideStepIndex((prev) => (prev === 0 ? 1 : prev));
  };

  // Reset Camera Scene
  const handleResetScene = () => {
    setIsComposed(false);
    isComposedRef.current = false;
    setInterestRegions([]);
    handleCameraChange({
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      zoom: 0.9,
      panX: 0,
      panY: 0,
      perspective: 1000,
    });
    setMediaDuration(3.0);
    mediaDurationRef.current = 3.0;
    setClips(INITIAL_CLIPS);
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
      videoRef.current.currentTime = 0;
    }
  };

  // Delete user uploaded media from library
  const handleDeleteMediaItem = useCallback((mediaId: string) => {
    setMediaList((prev) => {
      const filtered = prev.filter((item) => item.id !== mediaId);
      return filtered.length > 0 ? filtered : [DEFAULT_BLANK_MEDIA];
    });

    if (activeMedia.id === mediaId) {
      setActiveMedia(DEFAULT_BLANK_MEDIA);
      setCropRect({ x: 0, y: 0, width: 100, height: 100 });
      setInterestRegions([]);
      setIsComposed(false);
      isComposedRef.current = false;
    }

    setMediaClips((prev) =>
      prev.map((c) =>
        c.mediaId === mediaId
          ? {
              ...c,
              mediaId: DEFAULT_BLANK_MEDIA.id,
              name: DEFAULT_BLANK_MEDIA.name,
              type: DEFAULT_BLANK_MEDIA.type,
              url: DEFAULT_BLANK_MEDIA.url,
              modelTransform: undefined,
            }
          : c
      )
    );
  }, [activeMedia.id, DEFAULT_BLANK_MEDIA]);

  // Reset media sequence & active media to default
  const handleResetToDefaultMedia = useCallback(() => {
    setActiveMedia(DEFAULT_BLANK_MEDIA);
    setCropRect({ x: 0, y: 0, width: 100, height: 100 });
    setInterestRegions([]);
    setIsComposed(false);
    isComposedRef.current = false;
    setStudioMode('video');
  }, [DEFAULT_BLANK_MEDIA]);

  // Capture / Video Export Handler (Supports MP4 & WebM, 24/30/60 FPS)
  const handleExport = async (format: 'mp4' | 'webm' = exportFormat, fps: 24 | 30 | 60 = exportFps) => {
    if (!stageRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setExportProgress(0);

      if (studioMode === 'photo') {
        const result = await CaptureEngine.capturePhotoMockup({
          background,
          camera,
          aspectRatio,
          borderRadius,
          blurAmount,
          shadowDepth,
          mediaElement: activeMedia.type === 'video' ? videoRef.current : activeMedia.type === '3d' ? model3DCanvasRef.current : (document.getElementById('mockup-image-player') as HTMLImageElement | null),
          mediaType: activeMedia.type,
          cropRect,
          textLayers,
          currentTime,
          projectName: activeMedia.name,
          format: 'png',
          quality: 1.0,
        });

        CaptureEngine.downloadFile(result.blob, result.filename);
        try {
          await CaptureEngine.copyToClipboard(result.blob);
        } catch {
          // Clipboard copy is non-blocking
        }

        await storageService.saveHistoryItem({
          id: `photo_${Date.now()}`,
          type: 'screenshot',
          title: activeMedia.name,
          filename: result.filename,
          format: 'PNG',
          width: result.width,
          height: result.height,
          scale: 1,
          dataUrl: result.dataUrl,
          blob: result.blob,
          createdAt: Date.now(),
        });

        confetti({ particleCount: 70, spread: 75 });
      } else {
        // Video Mockup Rendering via VideoExportEngine (MP4 / WebM with accurate framerate)
        // Strictly exports the active length of the video/composition (e.g. 3.0s, 4.0s, etc.)
        const activeExportDuration = calculateTimelineDuration(clips, mediaDuration);
        const stageDims = getStageDimensions(aspectRatio, 1920, 1080);
        const result = await exportMockupVideo({
          clips,
          totalDuration: activeExportDuration,
          mediaDuration,
          fps,
          format,
          width: stageDims.width,
          height: stageDims.height,
          background,
          mediaElement: activeMedia.type === 'video' ? videoRef.current : activeMedia.type === '3d' ? model3DCanvasRef.current : (document.getElementById('mockup-image-player') as HTMLImageElement | null),
          mediaUrl: activeMedia.url,
          mediaType: activeMedia.type,
          modelTextures: getActiveMediaClipAtTime(mediaClips, currentTime)?.modelTextures || model3DTextures,
          mediaClips,
          audioTracks,
          cropRect,
          textLayers,
          aspectRatio,
          borderRadius,
          blurAmount,
          shadowDepth,
          projectName: activeMedia.name,
          onProgress: (p: number) => setExportProgress(p),
        });

        CaptureEngine.downloadFile(result.blob, result.filename);

        try {
          await storageService.saveHistoryItem({
            id: `video_${Date.now()}`,
            type: 'recording',
            title: activeMedia.name,
            filename: result.filename,
            format: result.format.toUpperCase(),
            width: stageDims.width,
            height: stageDims.height,
            scale: 1,
            dataUrl: result.dataUrl,
            blob: result.blob,
            duration: result.duration,
            createdAt: Date.now(),
          });
        } catch (storageErr) {
          console.warn('[Zetashot] Non-fatal history storage error:', storageErr);
        }

        confetti({ particleCount: 120, spread: 90 });
        if (isGuideOpen) {
          setGuidePhase('complete');
        }
      }
    } catch (e: any) {
      console.error('Export failed:', e);
      const detail = e?.message || String(e) || 'Unknown export failure';
      alert(`Export encountered an error: ${detail}. Please try again.`);
    } finally {
      setIsProcessing(false);
      setExportProgress(0);
    }
  };

  // Automated background export trigger when requested by deep-link or MCP tool
  useEffect(() => {
    if (autoExportRequested && !isProcessing) {
      const timer = window.setTimeout(() => {
        handleExport('mp4', 60);
        setAutoExportRequested(false);
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [autoExportRequested, isProcessing]);

  // Contextual Reference Style Guide step advance
  const handleGuideAdvance = useCallback(() => {
    if (guidePhase === 'start') {
      handleSelectClip('P02');
      setGuidePhase('end');
    } else if (guidePhase === 'end') {
      setGuidePhase('compose_operator');
    } else if (guidePhase === 'compose_operator') {
      setTopMode('compose');
      setIsMarkingRegion(true);
      setGuidePhase('compose_draw');
    } else if (guidePhase === 'compose_draw') {
      setGuidePhase('compose_action');
    } else if (guidePhase === 'compose_action') {
      handleCompose();
      setGuidePhase('preview');
    } else if (guidePhase === 'preview') {
      handlePlayPause();
      setGuidePhase('export');
    } else if (guidePhase === 'export') {
      handleExport(exportFormat, exportFps);
      setGuidePhase('complete');
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 } });
    }
  }, [guidePhase, handleSelectClip, handlePlayPause, handleCompose, handleExport, exportFormat, exportFps]);

  const bgStyle = generateBackgroundCss(background);
  const transform3D = calculate3DTransform(camera, stageScale);
  const baseMockupDims = getMockupDimensions(aspectRatio);
  const isCropped = isCropActive(cropRect);
  const mockupDims = calculateCroppedDimensions(baseMockupDims, cropRect);
  const cropOffset = calculateMediaCropOffset(baseMockupDims, cropRect, stageScale);

  return (
    <div
      className={`studio-root ${theme === 'dark' ? 'dark-theme' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsDraggingFile(true);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsDraggingFile(false);
        }
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDraggingFile(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 1) {
          const modelFile = files.find((f) => {
            const n = f.name.toLowerCase();
            return n.endsWith('.fbx') || n.endsWith('.obj') || n.endsWith('.gltf') || n.endsWith('.glb');
          });
          const textureFile = files.find((f) => {
            const n = f.name.toLowerCase();
            return f.type.startsWith('image') || n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.webp');
          });
          if (modelFile) {
            await handleUploadFile(modelFile);
            if (textureFile) {
              await handleUploadModelTexture(textureFile, 'diffuse');
            }
            return;
          }
        }
        const file = files[0];
        if (file) {
          handleUploadFile(file);
        }
      }}
    >
      {/* Drag & Drop Fullscreen Visual Indicator */}
      {isDraggingFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '36px 48px',
              borderRadius: 24,
              border: '2px dashed rgba(255, 255, 255, 0.4)',
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: '#ffffff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <Upload size={44} style={{ color: '#38bdf8', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>Drop file to import</h3>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
              Directly load 3D FBX meshes, MP4/WebM videos, or images into Zetashot
            </p>
          </div>
        </div>
      )}

      {/* UNIFIED STUDIO TOP BAR: Ensures zero overlap between Left tools, Operator island, and Right actions */}
      <header className="studio-top-bar">
        {/* 1. TOP-LEFT TOOLBAR */}
        <div className="top-left-toolbar">
          <button
            type="button"
            className="top-pill-btn"
            data-guide="add-media"
            onClick={() => {
              setMediaLibraryMode('add');
              setIsMediaLibraryOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Add media</span>
          </button>

          <button
            type="button"
            className="top-pill-btn desktop-only-btn"
            title="Direct file import (.fbx, videos, images)"
            onClick={() => directUploadInputRef.current?.click()}
          >
            <Upload size={14} />
            <span>Upload</span>
          </button>

          <input
            ref={directUploadInputRef}
            type="file"
            accept=".fbx,.obj,.gltf,.glb,video/*,image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadFile(file);
              }
              e.target.value = '';
            }}
          />
        </div>

        {/* 2. TOP CENTER MODE ISLAND (Unified Operator & Compose matching Screenshot 1) */}
        <div
          className={`top-center-mode-island-wrap ${topMode === 'compose' ? 'is-compose-mode' : 'is-operator-mode'}`}
          data-guide="top-mode-island"
        >
          <TopModeIsland
            isComposeActive={topMode === 'compose'}
            onToggleCompose={() => {
              const nextMode = topMode === 'operator' ? 'compose' : 'operator';
              setTopMode(nextMode);
              if (nextMode === 'compose') {
                setIsMarkingRegion(true);
                setGuideStepIndex((prev) => (prev === 3 ? 4 : prev));
                if (isGuideOpen) {
                  if (interestRegions.length === 0) {
                    setGuidePhase('compose_draw');
                  } else {
                    setGuidePhase('compose_action');
                  }
                }
              } else {
                setIsMarkingRegion(false);
                if (isGuideOpen && (guidePhase === 'compose_draw' || guidePhase === 'compose_action')) {
                  setGuidePhase('compose_operator');
                }
              }
            }}
            onCloseCompose={handleCloseCompose}
            onComposeMacro={() => {
              handleCompose();
              if (isGuideOpen) {
                setGuidePhase('preview');
              }
            }}
            isMarkingRegion={isMarkingRegion}
            onToggleMarkingRegion={() => setIsMarkingRegion(!isMarkingRegion)}
            onClearRegions={() => {
              setInterestRegions([]);
              if (isGuideOpen && topMode === 'compose') {
                setGuidePhase('compose_draw');
              }
            }}
            regionsCount={interestRegions.length}
            isGuideOpen={isGuideOpen && !isMobileGuideDisabled}
            guidePhase={guidePhase}
            onGuideAdvance={handleGuideAdvance}
          />
        </div>

        {/* 3. TOP-RIGHT TOOLBAR */}
        <div className="top-right-toolbar">
          {/* Beginner Guide / Tour Pill (Strict Black & White) */}
          <button
            type="button"
            className={`top-pill-btn desktop-only-btn ${isGuideOpen ? 'is-active-guide' : ''}`}
            onClick={() => {
              if (isGuideOpen) {
                setIsGuideOpen(false);
              } else {
                setIsGuideOpen(true);
                setGuidePhase('start');
                handleSelectClip('P01');
              }
            }}
            title="Interactive Beginner Guide & Feature Tour"
          >
            <Sparkles size={13} color="#ffffff" />
            <span>Guide</span>
            <span className="guide-tour-badge">{isGuideOpen ? 'Active' : 'Start'}</span>
          </button>

          <button
            type="button"
            className="top-pill-btn desktop-only-btn"
            onClick={handleResetScene}
            title="Reset scene"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className="top-pill-btn desktop-only-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Share Live Link Pill */}
          <button
            type="button"
            className="top-pill-btn desktop-only-btn"
            onClick={handleShareLink}
            title="Share live studio link (https://zetashot.vercel.app)"
          >
            {isCopiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
            <span>{isCopiedLink ? 'Copied Link!' : 'Share'}</span>
          </button>

          {/* Direct 1-Click Guide Disable Button (Visible on mobile & desktop whenever guide is active) */}
          {isGuideOpen && !isMobileGuideDisabled && (
            <button
              type="button"
              className="top-pill-btn guide-disable-quick-btn"
              onClick={handleDisableGuide}
              title="Disable guide tips"
              aria-label="Disable guide"
            >
              <X size={13} />
              <span className="guide-disable-text-desktop">Disable Guide</span>
              <span className="guide-disable-text-mobile">Guide Off</span>
            </button>
          )}

          {/* Export & Support Creator Group */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <button
              type="button"
              className="top-pill-btn top-upgrade-btn"
              data-guide="export-button"
              onClick={() => handleExport(exportFormat, exportFps)}
              disabled={isProcessing}
              title={`Export video as ${exportFormat.toUpperCase()} at ${exportFps} FPS`}
            >
              <Zap size={13} />
              <span className="export-btn-label">
                {isProcessing
                  ? `Exporting ${exportFormat.toUpperCase()} (${exportFps}fps) ${exportProgress}%`
                  : `Export ${exportFormat.toUpperCase()} • ${exportFps}fps`}
              </span>
              <span className="export-btn-label-mobile">
                {isProcessing ? `${exportProgress}%` : 'Export'}
              </span>
            </button>
            <a
              href="https://paypal.me/zetabyteIN"
              target="_blank"
              rel="noopener noreferrer"
              className="support-creator-pill-link desktop-only-btn"
              title="Support Creator on PayPal (@zetabyteIN)"
            >
              <Heart size={11} stroke="currentColor" fill="none" />
              <span>Support Creator</span>
            </a>
          </div>

          {/* Mobile Menu Hamburger Button (visible <= 768px) */}
          <button
            type="button"
            className="top-pill-btn mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open studio menu"}
            title="Studio options and tools"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* MOBILE STUDIO DRAWER / SHEET */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="mobile-drawer-brand">
                <Sparkles size={16} color="#38bdf8" />
                <span>Zetashot Studio</span>
              </div>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-drawer-content">
              {/* Option to Disable Guide on Mobile Devices */}
              <div className="mobile-drawer-section">
                <span className="mobile-drawer-section-title">Guide & Onboarding</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      Guide on Mobile
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {isMobileGuideDisabled ? 'Disabled (tips hidden)' : 'Enabled (showing tips)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch ${!isMobileGuideDisabled ? 'is-on' : ''}`}
                    onClick={() => handleToggleMobileGuide(!isMobileGuideDisabled)}
                    aria-label="Toggle Beginner Guide on Mobile"
                    title={isMobileGuideDisabled ? "Enable guide on mobile" : "Disable guide on mobile"}
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>
              </div>

              {/* Media Section */}
              <div className="mobile-drawer-section">
                <span className="mobile-drawer-section-title">Media & Assets</span>
                <div className="mobile-drawer-grid-two">
                  <button
                    type="button"
                    className="mobile-drawer-action-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setMediaLibraryMode('add');
                      setIsMediaLibraryOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>Media Library</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-action-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      directUploadInputRef.current?.click();
                    }}
                  >
                    <Upload size={16} />
                    <span>Upload File</span>
                  </button>
                </div>
              </div>

              {/* Viewport Settings */}
              <div className="mobile-drawer-section">
                <span className="mobile-drawer-section-title">Canvas Aspect Ratio</span>
                <div className="mobile-ratio-chips-row">
                  {['16:9', '9:16', '1:1', '4:3', '21:9'].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      className={`mobile-ratio-chip ${aspectRatio === ratio ? 'is-active' : ''}`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Drag & Studio Mode */}
              <div className="mobile-drawer-section">
                <span className="mobile-drawer-section-title">Mode & Touch Drag</span>
                <div className="mobile-drawer-grid-two">
                  <button
                    type="button"
                    className={`mobile-drawer-action-btn ${studioMode === 'video' ? 'is-active' : ''}`}
                    onClick={() => setStudioMode(studioMode === 'video' ? 'photo' : 'video')}
                  >
                    <span>{studioMode === 'video' ? 'Video Mode' : 'Photo Mode'}</span>
                  </button>
                  <button
                    type="button"
                    className={`mobile-drawer-action-btn ${dragMode === 'orbit' ? 'is-active' : ''}`}
                    onClick={() => setDragMode(dragMode === 'orbit' ? 'move' : 'orbit')}
                  >
                    <span>{dragMode === 'orbit' ? 'Touch: 3D Orbit' : 'Touch: Pan/Move'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mobile-drawer-section">
                <span className="mobile-drawer-section-title">Studio Actions</span>
                <div className="mobile-drawer-list">
                  <button
                    type="button"
                    className={`mobile-drawer-list-btn ${topMode === 'compose' ? 'is-active' : ''}`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const next = topMode === 'compose' ? 'operator' : 'compose';
                      setTopMode(next);
                      if (next === 'compose') {
                        setIsMarkingRegion(true);
                      } else {
                        setIsMarkingRegion(false);
                      }
                    }}
                  >
                    <Sliders size={16} />
                    <span>AI Compose Mode ({topMode === 'compose' ? 'Active' : 'Choreograph'})</span>
                    <span className="mobile-badge">{topMode === 'compose' ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    className={`mobile-drawer-list-btn ${isGuideOpen && !isMobileGuideDisabled ? 'is-active' : ''}`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (isGuideOpen && !isMobileGuideDisabled) {
                        setIsGuideOpen(false);
                      } else {
                        handleToggleMobileGuide(false);
                        setIsGuideOpen(true);
                        setGuidePhase('start');
                        handleSelectClip('P01');
                      }
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Beginner Guide & Tour</span>
                    <span className="mobile-badge">
                      {isMobileGuideDisabled ? 'Disabled' : isGuideOpen ? 'Active' : 'Start'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="mobile-drawer-list-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleResetScene();
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>Reset Scene Camera</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-drawer-list-btn"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span>Sound Effects ({soundEnabled ? 'Enabled' : 'Muted'})</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-drawer-list-btn"
                    onClick={() => {
                      handleShareLink();
                    }}
                  >
                    {isCopiedLink ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
                    <span>{isCopiedLink ? 'Copied Share Link!' : 'Share Live Project Link'}</span>
                  </button>

                  <a
                    href="https://paypal.me/zetabyteIN"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-drawer-list-btn"
                  >
                    <Heart size={16} color="#ec4899" />
                    <span>Support Creator (PayPal)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MEDIA LIBRARY MODAL */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        activeMediaId={activeMedia.id}
        mediaItems={mediaList}
        mode={mediaLibraryMode}
        onModeChange={setMediaLibraryMode}
        onAddMediaClip={handleAddMediaClip}
        onSelectMedia={(item) => {
          if (mediaLibraryMode === 'add') {
            handleAddMediaClip(item);
            return;
          }
          setIsComposed(false);
          isComposedRef.current = false;
          setInterestRegions([]);
          setActiveMedia(item);
          setCropRect({ x: 0, y: 0, width: 100, height: 100 });
          setGuideStepIndex((prev) => (prev === 0 ? 1 : prev));
          if (item.type === '3d') {
            setStudioMode('video');
            setModel3DTransform({ ...DEFAULT_MODEL_3D_TRANSFORM });
          } else if (item.type === 'video') {
            setStudioMode('video');
            setCamera({ ...DEFAULT_VIDEO_STATIC_CAMERA });
          }

          setMediaClips((prev) => {
            const dur = item.type === 'video' || item.type === '3d' ? 4.0 : 3.0;
            if (prev.length === 0) {
              return [
                {
                  id: `clip_${Date.now()}`,
                  mediaId: item.id,
                  name: item.name,
                  type: item.type,
                  url: item.url,
                  startTime: 0,
                  duration: dur,
                  modelTransform: item.type === '3d' ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
                },
              ];
            }
            if (selectedMediaClipId) {
              return prev.map((c) =>
                c.id === selectedMediaClipId
                  ? {
                      ...c,
                      mediaId: item.id,
                      name: item.name,
                      type: item.type,
                      url: item.url,
                      modelTransform: item.type === '3d' ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
                    }
                  : c
              );
            }
            return prev.map((c, idx) =>
              idx === 0
                ? {
                    ...c,
                    mediaId: item.id,
                    name: item.name,
                    type: item.type,
                    url: item.url,
                    modelTransform: item.type === '3d' ? { ...DEFAULT_MODEL_3D_TRANSFORM } : undefined,
                  }
                : c
            );
          });
        }}
        onDeleteMediaItem={handleDeleteMediaItem}
        onUploadFile={handleUploadFile}
      />

      {/* 5. CROP MODAL */}
      <CropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        mediaName={activeMedia.name}
        mediaUrl={activeMedia.url}
        mediaType={activeMedia.type}
        currentCrop={cropRect}
        onApplyCrop={(newCrop) => setCropRect(newCrop)}
      />

      {/* 6. 3D STAGE & COMPOSITION CANVAS */}
      <div 
        className="stage-wrap" 
        data-guide="stage-canvas"
        onMouseMove={handleStageMouseMove}
      >
        <div
          ref={stageRef}
          className="capture-stage"
          onTouchStart={handleSceneTouchStart}
          onTouchMove={handleSceneTouchMove}
          onTouchEnd={handleSceneTouchEnd}
          onTouchCancel={handleSceneTouchEnd}
          style={{
            touchAction: 'none',
            backgroundColor: background.type === 'solid' ? (background.color || '#ffffff') : undefined,
            backgroundImage: background.type === 'image' && background.imageUrl
              ? `url("${background.imageUrl}")`
              : background.type === 'gradient'
              ? bgStyle
              : undefined,
            backgroundSize: background.imageUrl
              ? (background.imageFit === 'contain' ? 'contain' : (background.imageScale && background.imageScale !== 1 ? `${Math.round(background.imageScale * 100)}%` : 'cover'))
              : undefined,
            backgroundPosition: background.imageUrl
              ? (background.position ? `${background.position.x}% ${background.position.y}%` : 'center')
              : undefined,
            backgroundRepeat: 'no-repeat',
            aspectRatio: getAspectRatioCss(aspectRatio),
            ['--stage-aspect-ratio' as any]: getAspectRatioCss(aspectRatio),
          }}
        >
          {/* Framing 3x3 Grid */}
          {showGrid && (
            <div className="framing-grid-overlay">
              <div /><div /><div /><div /><div /><div /><div /><div /><div />
            </div>
          )}

          {/* 3D Perspective Anchor */}
          <div
            ref={frameAnchorRef}
            className={`frame-anchor mode-${dragMode} ${isDraggingScene ? 'is-dragging' : ''}`}
            onMouseDown={handleSceneMouseDown}
            onTouchStart={handleSceneTouchStart}
            onTouchMove={handleSceneTouchMove}
            onTouchEnd={handleSceneTouchEnd}
            onTouchCancel={handleSceneTouchEnd}
            style={{ perspective: `${(camera.perspective || 1000) * stageScale}px`, touchAction: 'none' }}
          >
            {/* Ambient warm lighting spill around device frame during gradient transition */}
            <div
              ref={ambientBloomRef}
              className="gradient-transition-ambient-bloom"
              style={{ display: 'none', opacity: 0 }}
            />

            {/* 3D Rotated Frame Scene with zero-stutter dynamic transition */}
            <div
              ref={frameSceneRef}
              className={`frame-scene shadow-${shadowDepth} ${
                isPlaying || isDraggingScene ? 'is-moving' : ''
              } ${activeMedia.type === '3d' ? 'is-3d' : ''}`}
              style={{
                transform: transform3D,
                borderRadius: `${borderRadius * stageScale}px`,
                opacity: frameOpacity,
                width: `${mockupDims.width * stageScale}px`,
                height: `${mockupDims.height * stageScale}px`,
                background: activeMedia.type === '3d' ? 'transparent' : undefined,
                border: activeMedia.type === '3d' ? 'none' : undefined,
                boxShadow: activeMedia.type === '3d' ? 'none' : undefined,
              }}
            >
              {/* Depth of field / Laser red focus overlay */}
              {showLaserFocusIndicator && !isPlaying && <div className="laser-focus-overlay" />}

              {/* Yellow Follower Cursor */}
              {autoFocus && (
                <div
                  className="cursor-follower-dot"
                  style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                  }}
                />
              )}

              {/* Loaded Media Content inside Frame with active Cropping support */}
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: `${borderRadius * stageScale}px`,
                  width: `${mockupDims.width * stageScale}px`,
                  height: `${mockupDims.height * stageScale}px`,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: `${baseMockupDims.width * stageScale}px`,
                    height: `${baseMockupDims.height * stageScale}px`,
                    transform: isCropped
                      ? `translate(-${cropOffset.offsetX}px, -${cropOffset.offsetY}px)`
                      : 'none',
                    transformOrigin: 'top left',
                  }}
                >
                  {activeMedia.type === 'demo' ? (
                    <InteractiveDemoUI />
                  ) : activeMedia.type === 'video' ? (
                    <video
                      id="mockup-video-player"
                      ref={videoRef}
                      src={activeMedia.url}
                      crossOrigin="anonymous"
                      playsInline
                      preload="auto"
                      muted={!soundEnabled}
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        if (!isPlayingRef.current && !isProcessingRef.current) {
                          vid.pause();
                        } else if (isPlayingRef.current) {
                          vid.play().catch(() => {});
                        }
                        if (!isComposedRef.current) {
                          // Standard normal mode: normal 1.0x playback speed, keyframes stay 3.0s (two 1.5s clips)
                          vid.playbackRate = 1.0;
                          setMediaDuration(3.0);
                          mediaDurationRef.current = 3.0;
                        }
                        const activeClip = mediaClipsRef.current.length > 0 ? getActiveMediaClipAtTime(mediaClipsRef.current, currentTimeRef.current) : null;
                        if (activeClip && activeClip.type === 'video') {
                          const clipSpeed = activeClip.speed || 1.0;
                          vid.playbackRate = clipSpeed;
                          const targetVidTime = Math.min(
                            (vid.duration || 1000) - 0.03,
                            Math.max(0, (currentTimeRef.current - activeClip.startTime) * clipSpeed + (activeClip.sourceStartTime || 0))
                          );
                          vid.currentTime = targetVidTime;
                        } else {
                          vid.currentTime = currentTimeRef.current;
                        }
                      }}
                      onCanPlay={(e) => {
                        if (!isPlayingRef.current && !isProcessingRef.current) {
                          e.currentTarget.pause();
                        } else if (isPlayingRef.current && e.currentTarget.paused) {
                          e.currentTarget.play().catch(() => {});
                        }
                      }}
                      onPause={() => {
                        // Handled centrally by handlePlayPause
                      }}
                      onPlay={(e) => {
                        if (!isPlayingRef.current && !isProcessingRef.current) {
                          e.currentTarget.pause();
                        }
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : activeMedia.type === '3d' ? (
                    <canvas
                      id="mockup-3d-model-canvas"
                      ref={model3DCanvasRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        background: 'transparent',
                      }}
                    />
                  ) : (
                    <img
                      id="mockup-image-player"
                      src={activeMedia.url}
                      crossOrigin="anonymous"
                      alt={activeMedia.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>

                {/* Optical 3D Depth-of-Field & Tilt-Shift Blur Overlay (over the media) */}
                {blurAmount > 0 && (
                  <div
                    className="edge-tilt-shift-blur-overlay"
                    style={{
                      // Optical Circle of Confusion (CoC): non-linear power curve
                      // Gives subtle, silky f/5.6 depth at low values and luscious f/1.4 cinema bokeh at high values (max 22px)
                      backdropFilter: `blur(${(Math.pow(blurAmount / 50, 1.35) * 22).toFixed(1)}px)`,
                      WebkitBackdropFilter: `blur(${(Math.pow(blurAmount / 50, 1.35) * 22).toFixed(1)}px)`,
                      maskImage: getTiltShiftMask(
                        camera.rotX,
                        camera.rotY,
                        autoFocus ? { x: cursorPos.x / Math.max(1, mockupDims.width * stageScale), y: cursorPos.y / Math.max(1, mockupDims.height * stageScale) } : undefined
                      ),
                      WebkitMaskImage: getTiltShiftMask(
                        camera.rotX,
                        camera.rotY,
                        autoFocus ? { x: cursorPos.x / Math.max(1, mockupDims.width * stageScale), y: cursorPos.y / Math.max(1, mockupDims.height * stageScale) } : undefined
                      ),
                    }}
                  />
                )}

                {/* Warm radiant gradient flare overlay over media during transition */}
                <div
                  ref={gradientOverlayRef}
                  className="gradient-transition-screen-overlay"
                  style={{ display: 'none', opacity: 0 }}
                />

                {/* Block-by-Block mosaic transition canvas overlay */}
                <canvas
                  ref={blockCanvasRef}
                  className="block-transition-canvas-overlay"
                  width={1280}
                  height={720}
                />
              </div>
            </div>
          </div>

          {/* Interactive Interest Regions Overlay covering full capture stage */}
          <InterestRegionOverlay
            isComposeActive={topMode === 'compose'}
            isActive={isMarkingRegion}
            regions={interestRegions}
            onRegionsChange={(newRegions) => {
              setInterestRegions(newRegions);
              if (isGuideOpen && topMode === 'compose' && newRegions.length > 0) {
                setGuidePhase('compose_action');
              }
            }}
            selectedRegionId={selectedRegionId}
            onSelectRegion={(id) => {
              setSelectedRegionId(id);
            }}
            width={STAGE_BASE_DIMS.width}
            height={STAGE_BASE_DIMS.height}
            isGuideOpen={isGuideOpen && !isMobileGuideDisabled}
            guidePhase={guidePhase}
            onGuideAdvance={() => {
              if (guidePhase === 'compose_draw') {
                setGuidePhase('compose_action');
              } else {
                handleGuideAdvance();
              }
            }}
          />

          {/* Layer-Based Text Overlays on Stage */}
          <TextOverlayStage
            layers={textLayers}
            currentTime={currentTime}
            selectedLayerId={selectedTextLayerId}
            onSelectLayer={(id) => setSelectedTextLayerId(id)}
            onChangeLayer={(updated) =>
              setTextLayers((layers) => layers.map((l) => (l.id === updated.id ? updated : l)))
            }
            stageScale={stageScale}
            isPlaying={isPlaying}
          />

          {/* Full Stage Canvas Transition Overlays (active when Coverage is Fill Canvas) */}
          <div
            ref={stageGradientOverlayRef}
            className="stage-gradient-transition-overlay"
            style={{ display: 'none', opacity: 0 }}
          />
          <canvas
            ref={stageBlockCanvasRef}
            className="stage-block-transition-canvas"
            width={1920}
            height={1080}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* 7. BOTTOM CONTROLS STACK (3D Model Controls + Camera Controls Island) */}
      <div 
        className={`bottom-studio-controls-slot ${studioMode === 'video' ? 'has-timeline' : ''}`}
        data-guide="camera-island"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {(activeMedia.type === '3d' || getActiveMediaClipAtTime(mediaClips, currentTime)?.type === '3d') && (
          <div
            style={{
              pointerEvents: 'auto',
              width: 'max-content',
              maxWidth: '95vw',
              marginBottom: isCameraRulerOpen ? '48px' : '10px',
              transition: 'margin-bottom 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Model3DControlsIsland
              transform={
                interpolateModel3DTransform(
                  getActiveMediaClipAtTime(mediaClips, currentTime)?.modelKeyframes,
                  currentTime,
                  getActiveMediaClipAtTime(mediaClips, currentTime)?.modelTransform || model3DTransform
                )
              }
              onChangeTransform={(newTransform) => {
                setModel3DTransform(newTransform);
                const activeClip = getActiveMediaClipAtTime(mediaClipsRef.current, currentTime);
                if (activeClip) {
                  const existingKf = activeClip.modelKeyframes || [];
                  let nextKf = activeClip.modelKeyframes;
                  if (existingKf.length > 0) {
                    nextKf = setOrUpdateModelKeyframe(existingKf, currentTime, newTransform, 0.12);
                  }
                  setMediaClips((prev) =>
                    prev.map((c) =>
                      c.id === activeClip.id
                        ? {
                            ...c,
                            modelTransform: newTransform,
                            modelKeyframes: nextKf,
                          }
                        : c
                    )
                  );
                }
              }}
              keyframes={getActiveMediaClipAtTime(mediaClips, currentTime)?.modelKeyframes}
              onAddKeyframe={() => {
                const activeClip = getActiveMediaClipAtTime(mediaClipsRef.current, currentTime);
                if (!activeClip) return;
                const currentKf = activeClip.modelKeyframes || [];
                const currentT = interpolateModel3DTransform(
                  currentKf,
                  currentTime,
                  activeClip.modelTransform || model3DTransform
                );
                const updatedKf = setOrUpdateModelKeyframe(currentKf, currentTime, currentT, 0.12);
                setMediaClips((prev) =>
                  prev.map((c) => (c.id === activeClip.id ? { ...c, modelKeyframes: updatedKf } : c))
                );
              }}
              onRemoveKeyframe={(time) => {
                const activeClip = getActiveMediaClipAtTime(mediaClipsRef.current, currentTime);
                if (!activeClip || !activeClip.modelKeyframes) return;
                const updatedKf = removeModelKeyframe(activeClip.modelKeyframes, time, 0.1);
                setMediaClips((prev) =>
                  prev.map((c) => (c.id === activeClip.id ? { ...c, modelKeyframes: updatedKf } : c))
                );
              }}
              currentTime={currentTime}
              onSeek={handleSeek}
              onReset={() => {
                setModel3DTransform(DEFAULT_MODEL_3D_TRANSFORM);
                const activeClip = getActiveMediaClipAtTime(mediaClipsRef.current, currentTime);
                if (activeClip) {
                  setMediaClips((prev) =>
                    prev.map((c) =>
                      c.id === activeClip.id
                        ? {
                            ...c,
                            modelTransform: DEFAULT_MODEL_3D_TRANSFORM,
                            modelKeyframes: undefined,
                          }
                        : c
                    )
                  );
                }
              }}
              hasEmbeddedAnimation={model3DRendererRef.current?.hasAnimation() ?? false}
              textureConfig={getActiveMediaClipAtTime(mediaClips, currentTime)?.modelTextures || model3DTextures}
              onUploadTexture={handleUploadModelTexture}
              onRemoveTexture={handleRemoveModelTexture}
              onUpdateTextureConfig={handleUpdateModelTextureConfig}
            />
          </div>
        )}

        <div style={{ pointerEvents: 'auto' }}>
          <CameraControlsIsland
            mode={studioMode}
            onModeChange={setStudioMode}
            dragMode={dragMode}
            onDragModeChange={setDragMode}
            camera={camera}
            onCameraChange={handleCameraChange}
            background={background}
            onBackgroundChange={setBackground}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            shadowDepth={shadowDepth}
            onShadowDepthChange={setShadowDepth}
            borderRadius={borderRadius}
            onBorderRadiusChange={setBorderRadius}
            blurAmount={blurAmount}
            onBlurChange={handleBlurChange}
            autoFocus={autoFocus}
            onAutoFocusChange={setAutoFocus}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onCapture={() => handleExport(exportFormat)}
            isProcessing={isProcessing}
            isGuideOpen={isGuideOpen && !isMobileGuideDisabled}
            guidePhase={guidePhase}
            selectedClipId={selectedClipId}
            onGuideAdvance={handleGuideAdvance}
            onRulerActiveChange={setIsCameraRulerOpen}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onDisableGuide={handleDisableGuide}
          />
        </div>
      </div>

      {/* 8. BOTTOM VIDEO TIMELINE TRAY (when in VIDEO mode) */}
      {studioMode === 'video' && (
        <div data-guide="video-timeline" style={{ width: '100%' }}>
          <VideoTimeline
            clips={clips}
            onClipsChange={handleClipsChange}
            selectedClipId={selectedClipId}
            onSelectClip={handleSelectClip}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onResetScene={handleResetScene}
            onExportVideo={handleExport}
            isExporting={isProcessing}
            exportProgress={exportProgress}
            exportFormat={exportFormat}
            onExportFormatChange={setExportFormat}
            exportFps={exportFps}
            onExportFpsChange={setExportFps}
            onOpenCrop={() => setIsCropModalOpen(true)}
            onOpenMediaLibrary={(mode = 'select') => {
              setMediaLibraryMode(mode);
              setIsMediaLibraryOpen(true);
            }}
            easingValues={easingValues}
            onEasingValuesChange={setEasingValues}
            onCompose={handleCompose}
            onTotalDurationChange={(newDur) => setTotalDuration(newDur)}
            onMediaDurationChange={handleMediaDurationChange}
            onResetToDefaultMedia={handleResetToDefaultMedia}
            mediaThumbnailUrl={activeMedia.type === 'image' ? activeMedia.url : undefined}
            mediaThumbnails={videoThumbnails}
            mediaDuration={mediaDuration}
            isGuideOpen={isGuideOpen && !isMobileGuideDisabled}
            guidePhase={guidePhase}
            onGuideAdvance={handleGuideAdvance}
            onDisableGuide={handleDisableGuide}
            textLayers={textLayers}
            onTextLayersChange={setTextLayers}
            selectedTextLayerId={selectedTextLayerId}
            onSelectTextLayer={setSelectedTextLayerId}
            mediaClips={mediaClips}
            onMediaClipsChange={(newClips) => {
              setMediaClips(newClips);
              const totalMediaDur = calculateMediaSequenceDuration(newClips);
              if (totalMediaDur > 0) {
                setMediaDuration(totalMediaDur);
                mediaDurationRef.current = totalMediaDur;
                if (videoRef.current && activeMediaRef.current.type === 'video') {
                  const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
                    ? videoRef.current.duration
                    : totalMediaDur;
                  const computedRate = calculatePlaybackRate(naturalDur, totalMediaDur);
                  videoRef.current.playbackRate = computedRate;
                }
              }
            }}
            selectedMediaClipId={selectedMediaClipId}
            onSelectMediaClip={(id) => {
              setSelectedMediaClipId(id);
              const target = mediaClips.find((c) => c.id === id);
              if (target) {
                setActiveMedia({
                  id: target.mediaId,
                  name: target.name,
                  type: target.type,
                  url: target.url,
                  dimensions: '1920 × 1080',
                  format: target.type === 'video' ? 'MP4' : 'PNG',
                });
              }
              if (id) {
                const clipKeyframes = clipsRef.current.filter((c) => c.mediaClipId === id);
                if (clipKeyframes.length > 0) {
                  setSelectedClipId(clipKeyframes[0].id);
                  selectedClipIdRef.current = clipKeyframes[0].id;
                } else {
                  setSelectedClipId('');
                  selectedClipIdRef.current = '';
                }
              }
            }}
            audioTracks={audioTracks}
            onAudioTracksChange={setAudioTracks}
            selectedAudioTrackId={selectedAudioTrackId}
            onSelectAudioTrack={setSelectedAudioTrackId}
          />
        </div>
      )}

      {/* 8b. FLOATING TEXT LAYER INSPECTOR */}
      {selectedTextLayerId && (() => {
        const activeLayer = textLayers.find((l) => l.id === selectedTextLayerId);
        if (!activeLayer) return null;
        return (
          <TextLayerInspector
            layer={activeLayer}
            onChange={(updated) =>
              setTextLayers((layers) => layers.map((l) => (l.id === updated.id ? updated : l)))
            }
            onDelete={(id) => {
              setTextLayers((layers) => layers.filter((l) => l.id !== id));
              setSelectedTextLayerId(null);
            }}
            onDuplicate={(layer) => {
              const dup = {
                ...layer,
                id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                startTime: Number((layer.startTime + 0.4).toFixed(2)),
              };
              setTextLayers((layers) => [...layers, dup]);
              setSelectedTextLayerId(dup.id);
            }}
            onSplitLines={(layer) => {
              const split = splitTextLayerLines(layer);
              if (split.length <= 1) return;
              setTextLayers((layers) => {
                const remaining = layers.filter((l) => l.id !== layer.id);
                return [...remaining, ...split];
              });
              setSelectedTextLayerId(split[0].id);
            }}
            onClose={() => setSelectedTextLayerId(null)}
          />
        );
      })()}

      {/* 9. INTERACTIVE BEGINNER ONBOARDING GUIDE (Pure Black & White, Real-Time Telemetry) */}
      <BeginnerGuide
        isOpen={isGuideOpen && !isMobileGuideDisabled}
        onClose={() => setIsGuideOpen(false)}
        currentStepIndex={guideStepIndex}
        onStepChange={setGuideStepIndex}
        onCompleteTour={handleCompleteTour}
        isMobileGuideDisabled={isMobileGuideDisabled}
        onDisableMobileGuide={handleDisableGuide}
        activeMediaName={activeMedia.name}
        isMediaLibraryOpen={isMediaLibraryOpen}
        onOpenMediaLibrary={() => {
          setMediaLibraryMode('select');
          setIsMediaLibraryOpen(true);
          if (guideStepIndex === 0) setGuideStepIndex(1);
        }}
        camera={camera}
        dragMode={dragMode}
        onSetDragMode={(mode) => {
          setDragMode(mode);
          if (guideStepIndex === 1) setGuideStepIndex(2);
        }}
        onCenterCamera={() => {
          handleCameraChange({ ...camera, panX: 0, panY: 0 });
          if (guideStepIndex === 1) setGuideStepIndex(2);
        }}
        aspectRatio={aspectRatio}
        onSetAspectRatio={(ratio) => {
          setAspectRatio(ratio);
          if (guideStepIndex === 2) setGuideStepIndex(3);
        }}
        blurAmount={blurAmount}
        onSetBlur={(val) => {
          handleBlurChange(val);
          if (guideStepIndex === 2) setGuideStepIndex(3);
        }}
        borderRadius={borderRadius}
        topMode={topMode}
        onSetTopMode={(mode) => {
          setTopMode(mode);
          if (mode === 'compose') {
            setIsMarkingRegion(true);
            if (guideStepIndex === 3) setGuideStepIndex(4);
          } else {
            setIsMarkingRegion(false);
          }
        }}
        interestRegionsCount={interestRegions.length}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onTogglePlay={() => {
          handlePlayPause();
          if (guideStepIndex === 4) setGuideStepIndex(5);
        }}
        onSeek={handleSeek}
        exportFps={exportFps}
        exportFormat={exportFormat}
        isProcessing={isProcessing}
        exportProgress={exportProgress}
        onExport={() => {
          handleExport(exportFormat, exportFps);
          if (guideStepIndex === 5) handleCompleteTour();
        }}
      />
    </div>
  );
}

export default App;
