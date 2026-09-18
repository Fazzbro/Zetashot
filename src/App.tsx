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
import { calculatePlaybackRate, syncMediaClipsToKeyframeDuration, syncKeyframeSequenceToDuration, generateKeyframesForNewMediaClip } from './utils/keyframeMediaSyncEngine';
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
} from './utils/interestRegionEngine';
import { calculateTimelineDuration } from './utils/timelineDurationEngine';
import { isCropActive, calculateCroppedDimensions, calculateMediaCropOffset } from './utils/cropMath';
import {
  Plus,
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
} from 'lucide-react';

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
    
    // Rich multi-stop anamorphic depth ramp:
    // Close to camera / focus plane is 100% crisp & transparent (unblurred)
    // Distant depth achieves full deep bokeh
    return `linear-gradient(${angleDeg.toFixed(1)}deg, transparent 0%, transparent 32%, rgba(0,0,0,0.3) 54%, rgba(0,0,0,0.75) 76%, black 100%)`;
  }

  // Flat angle: Photorealistic center-weighted lens aperture bokeh
  return `radial-gradient(circle at ${fx.toFixed(1)}% ${fy.toFixed(1)}%, transparent 0%, transparent 18%, rgba(0,0,0,0.38) 48%, rgba(0,0,0,0.85) 75%, black 100%)`;
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
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setGlobalSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // 2. Beginner Guide Tour State
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(() => {
    return !localStorage.getItem('zetashot_guide_completed');
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
    zoom: 0.7,
    panX: 0,
    panY: 0,
    perspective: 1000,
  };

  const INITIAL_CLIPS: TimelinePositionClip[] = [
    { id: 'P01', name: 'P01', startTime: 0, duration: 1.5, color: 'yellow', camera: { ...DEFAULT_STATIC_CAMERA }, transition: 'cut' },
    { id: 'P02', name: 'P02', startTime: 1.5, duration: 1.5, color: 'yellow', camera: { ...DEFAULT_STATIC_CAMERA }, transition: 'cut' },
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

  // 8. Video Playback & Timeline Scrubber (12s visible workspace ruler)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(12.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Synchronous Refs for guaranteed zero-race-condition playback
  const isPlayingRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const clipsRef = useRef<TimelinePositionClip[]>(clips);
  const activeMediaRef = useRef<MediaItem>(activeMedia);
  const totalDurationRef = useRef<number>(totalDuration);
  const selectedClipIdRef = useRef<string>(selectedClipId);

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
    if (isPlayingRef.current && trans.active && (trans.type === 'gradient' || trans.type === 'blocks')) {
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

  // 10. Cursor Follower
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 380, y: 220 });

  // 11. Export Status, Format & Framerate (Default MP4 @ 60 FPS)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(60);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // DOM Refs
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameAnchorRef = useRef<HTMLDivElement | null>(null);
  const frameSceneRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 12. Dynamic Stage Reference Scale for 100% Identical Preview-to-Export Framing
  const [stageScale, setStageScale] = useState<number>(1.0);
  const stageScaleRef = useRef<number>(1.0);
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

  // 13. Shareable Hosted Link State
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      const origin = window.location.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return origin;
      }
    }
    return 'https://zetashot.vercel.app';
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
    const cleanedCam: Camera3DState = {
      ...newCamera,
      rotX: Math.round(newCamera.rotX),
      rotY: Math.round(newCamera.rotY),
      rotZ: Math.round(newCamera.rotZ),
      zoom: Number(newCamera.zoom.toFixed(2)),
      panX: Math.round(newCamera.panX || 0),
      panY: Math.round(newCamera.panY || 0),
      perspective: Math.round(newCamera.perspective || 1000),
    };
    setCamera(cleanedCam);
    playGearSound();

    if (frameAnchorRef.current) {
      frameAnchorRef.current.style.perspective = `${cleanedCam.perspective * (stageScaleRef.current || 1.0)}px`;
    }
    if (frameSceneRef.current) {
      frameSceneRef.current.style.transform = calculate3DTransform(cleanedCam, stageScaleRef.current);
    }

    // Determine target clip: selectedClipId, or active clip at currentTime, or first clip
    const currentClips = clipsRef.current;
    let targetId = selectedClipIdRef.current || selectedClipId;
    if (!targetId || !currentClips.some((c) => c.id === targetId)) {
      const active = getActiveClipAtTime(currentClips, currentTimeRef.current);
      targetId = active ? active.id : (currentClips[0]?.id || '');
      if (targetId) {
        setSelectedClipId(targetId);
        selectedClipIdRef.current = targetId;
      }
    }

    // Synchronously update clipsRef.current and setClips
    const nextClips = currentClips.map((c) => (c.id === targetId ? { ...c, camera: cleanedCam } : c));
    clipsRef.current = nextClips;
    setClips(nextClips);
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
  // Core Rule: Compose = Synchronize media duration to Number of Interest Points * 1.0s, master timeline stays 12s
  // If 0 Interest Points exist: DO NOT create zoom keyframes, DO NOT change camera, DO NOT modify timeline.
  const handleCompose = () => {
    if (interestRegions.length > 0) {
      setIsComposed(true);
      isComposedRef.current = true;
      const composedDuration = Number((interestRegions.length * 1.0).toFixed(2));
      // Visual timeline ruler stays 12.0s
      setTotalDuration(12.0);
      totalDurationRef.current = 12.0;

      const targetClipIdx = selectedMediaClipId
        ? mediaClipsRef.current.findIndex((c) => c.id === selectedMediaClipId)
        : 0;
      const actualClipIdx = targetClipIdx !== -1 ? targetClipIdx : 0;
      const targetClip = mediaClipsRef.current[actualClipIdx] || mediaClipsRef.current[0];
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
          if (c.startTime < clipStart - 0.001) {
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

  // Close compose handler: keep visual timeline ruler at 12.0s
  const handleCloseCompose = () => {
    setTotalDuration(12.0);
    totalDurationRef.current = 12.0;
    if (interestRegions.length > 0) {
      setIsComposed(true);
      isComposedRef.current = true;
      const composedDuration = Number((interestRegions.length * 1.0).toFixed(2));

      const targetClipIdx = selectedMediaClipId
        ? mediaClipsRef.current.findIndex((c) => c.id === selectedMediaClipId)
        : 0;
      const actualClipIdx = targetClipIdx !== -1 ? targetClipIdx : 0;
      const targetClip = mediaClipsRef.current[actualClipIdx] || mediaClipsRef.current[0];
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
          if (c.startTime < clipStart - 0.001) {
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
    } else {
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
          videoRef.current.currentTime = targetVidTime;
        } else if (isComposedRef.current) {
          const medDur = mediaDurationRef.current > 0 ? mediaDurationRef.current : 3.0;
          videoRef.current.playbackRate = calculatePlaybackRate(naturalDur, medDur);
          const targetVidTime = Math.min(
            naturalDur,
            (currentTimeRef.current / medDur) * naturalDur
          );
          videoRef.current.currentTime = targetVidTime;
        } else {
          // Normal un-composed playback at 1.0x normal speed throughout full video length
          videoRef.current.playbackRate = 1.0;
          videoRef.current.currentTime = Math.min(naturalDur, currentTimeRef.current);
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
    if (currentClips.length > 0) {
      const targetClip = getActiveClipAtTime(currentClips, time);
      if (targetClip && selectedClipIdRef.current !== targetClip.id) {
        selectedClipIdRef.current = targetClip.id;
        setSelectedClipId(targetClip.id);
      }
    }
    const interpolated = getCameraAtTime(currentClips, time);
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

    const loop = (now: number) => {
      if (!isPlayingRef.current) return;

      const video = videoRef.current;
      const media = activeMediaRef.current;
      const activeProjectDuration = calculateTimelineDuration(clipsRef.current, mediaDurationRef.current);
      const deltaSec = (now - lastTimestamp) / 1000;
      const nextTime = currentTimeRef.current + deltaSec;
      lastTimestamp = now;

      if (nextTime >= activeProjectDuration) {
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
        updateGradientTransitionVisuals(0);
        return;
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
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
      const interpolated = interpolateCameraSpline(currentClips, nextTime);
      setCamera(interpolated);
      setFrameOpacity(1.0);

      // Direct GPU transform update for instantaneous, buttery smooth 60fps response
      if (frameAnchorRef.current) {
        frameAnchorRef.current.style.perspective = `${(interpolated.perspective || 1000) * (stageScaleRef.current || 1.0)}px`;
      }
      if (frameSceneRef.current) {
        frameSceneRef.current.style.transform = calculate3DTransform(interpolated, stageScaleRef.current);
      }

      // Sync video drift gently if needed without stuttering decoder
      if (video && media.type === 'video' && video.duration && !video.seeking) {
        const activeClip = mediaClipsRef.current.length > 0 ? getActiveMediaClipAtTime(mediaClipsRef.current, nextTime) : null;
        if (activeClip && activeClip.type === 'video') {
          const clipSpeed = activeClip.speed || (isComposedRef.current ? calculatePlaybackRate(video.duration, mediaDurationRef.current || 3.0) : 1.0);
          if (video.playbackRate !== clipSpeed) {
            video.playbackRate = clipSpeed;
          }
          const targetVidTime = (nextTime - activeClip.startTime) * clipSpeed + (activeClip.sourceStartTime || 0);
          if (Math.abs(video.currentTime - targetVidTime) > 0.6) {
            video.currentTime = Math.min(video.duration - 0.03, Math.max(0, targetVidTime));
          }
        } else if (isComposedRef.current) {
          const medDur = mediaDurationRef.current > 0 ? mediaDurationRef.current : 3.0;
          if (nextTime <= medDur) {
            const targetVidTime = (nextTime / medDur) * video.duration;
            if (Math.abs(video.currentTime - targetVidTime) > 0.8) {
              video.currentTime = Math.min(video.duration - 0.03, targetVidTime);
            }
          }
        } else {
          if (Math.abs(video.currentTime - nextTime) > 0.8) {
            video.currentTime = Math.min(video.duration - 0.03, nextTime);
          }
        }
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

  // Append a new media item to the multi-clip sequence
  const handleAddMediaClip = useCallback((item: MediaItem) => {
    const isVideo = item.type === 'video';
    const dur = isVideo ? 4.0 : 3.0;

    // Ensure item is registered in library list
    setMediaList((prev) => {
      if (prev.some((m) => m.id === item.id || (m.url && m.url === item.url))) {
        return prev;
      }
      return [item, ...prev.filter((m) => m.id !== 'blank-media')];
    });

    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
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
      };
      const updated = [...prev, newClip];
      mediaClipsRef.current = updated;
      const newSeqDur = calculateMediaSequenceDuration(updated);
      setMediaDuration(newSeqDur);
      mediaDurationRef.current = newSeqDur;
      if (newSeqDur > totalDurationRef.current) {
        setTotalDuration(Math.max(12.0, Math.ceil(newSeqDur)));
        totalDurationRef.current = Math.max(12.0, Math.ceil(newSeqDur));
      }
      setSelectedMediaClipId(newClip.id);
      return updated;
    });

    // Generate new keyframes for the newly uploaded media clip
    // leaving existing composed keyframes intact
    setClips((prevClips) => {
      const nextStart = calculateMediaSequenceDuration(mediaClipsRef.current);
      return generateKeyframesForNewMediaClip(prevClips, nextStart, dur, DEFAULT_STATIC_CAMERA, newClipId);
    });

    if (isVideo) {
      setStudioMode('video');
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.src = item.url;
    }
  }, []);

  // Upload user file
  const handleUploadFile = (file: File) => {
    const isVideo = file.type.startsWith('video');
    const url = URL.createObjectURL(file);
    const newItem: MediaItem = {
      id: `upload_${Date.now()}`,
      name: file.name,
      type: isVideo ? 'video' : 'image',
      url,
      dimensions: 'Custom Media',
      format: file.name.split('.').pop()?.toUpperCase() || 'FILE',
    };

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
        const dur = isVideo ? 4.0 : 3.0;
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
            },
          ];
        }
        if (selectedMediaClipId) {
          return prev.map((c) =>
            c.id === selectedMediaClipId
              ? { ...c, mediaId: newItem.id, name: newItem.name, type: newItem.type, url: newItem.url }
              : c
          );
        }
        return prev.map((c, idx) =>
          idx === 0
            ? { ...c, mediaId: newItem.id, name: newItem.name, type: newItem.type, url: newItem.url }
            : c
        );
      });
    }

    if (isVideo) {
      setStudioMode('video');
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.src = url;
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
      zoom: 0.7,
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
          mediaElement: activeMedia.type === 'video' ? videoRef.current : (document.getElementById('mockup-image-player') as HTMLImageElement | null),
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
          mediaElement: videoRef.current,
          mediaType: activeMedia.type,
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

        confetti({ particleCount: 120, spread: 90 });
        if (isGuideOpen) {
          setGuidePhase('complete');
        }
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export encountered an error. Please try again.');
    } finally {
      setIsProcessing(false);
      setExportProgress(0);
    }
  };

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
    <div className={`studio-root ${theme === 'dark' ? 'dark-theme' : ''}`}>
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
      </div>

      {/* 2. TOP CENTER MODE ISLAND (Unified Operator & Compose matching Screenshot 1) */}
      <div className="top-center-mode-island-wrap" data-guide="top-mode-island">
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
          isGuideOpen={isGuideOpen}
          guidePhase={guidePhase}
          onGuideAdvance={handleGuideAdvance}
        />
      </div>

      {/* 3. TOP-RIGHT TOOLBAR */}
      <div className="top-right-toolbar">
        {/* Beginner Guide / Tour Pill (Strict Black & White) */}
        <button
          type="button"
          className={`top-pill-btn ${isGuideOpen ? 'is-active-guide' : ''}`}
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
          className="top-pill-btn"
          onClick={handleResetScene}
          title="Reset scene"
        >
          <RotateCcw size={14} />
        </button>
        {/* Profile icon removed based on user request */}

        <button
          type="button"
          className="top-pill-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>

        {/* Share Live Link Pill */}
        <button
          type="button"
          className="top-pill-btn"
          onClick={handleShareLink}
          title="Share live studio link (https://zetashot.vercel.app)"
        >
          {isCopiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
          <span>{isCopiedLink ? 'Copied Link!' : 'Share'}</span>
        </button>

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
            <span>
              {isProcessing
                ? `Exporting ${exportFormat.toUpperCase()} (${exportFps}fps) ${exportProgress}%`
                : `Export ${exportFormat.toUpperCase()} • ${exportFps}fps`}
            </span>
          </button>
          <a
            href="https://paypal.me/zetabyteIN"
            target="_blank"
            rel="noopener noreferrer"
            className="support-creator-pill-link"
            title="Support Creator on PayPal (@zetabyteIN)"
          >
            <Heart size={11} stroke="currentColor" fill="none" />
            <span>Support Creator</span>
          </a>
        </div>
      </div>

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
          if (item.type === 'video') setStudioMode('video');

          setMediaClips((prev) => {
            const dur = item.type === 'video' ? 4.0 : 3.0;
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
                },
              ];
            }
            if (selectedMediaClipId) {
              return prev.map((c) =>
                c.id === selectedMediaClipId
                  ? { ...c, mediaId: item.id, name: item.name, type: item.type, url: item.url }
                  : c
              );
            }
            return prev.map((c, idx) =>
              idx === 0
                ? { ...c, mediaId: item.id, name: item.name, type: item.type, url: item.url }
                : c
            );
          });
        }}
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
          style={{
            background: background.type === 'transparent' ? undefined : bgStyle,
            aspectRatio: getAspectRatioCss(aspectRatio),
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
            style={{ perspective: `${(camera.perspective || 1000) * stageScale}px` }}
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
              }`}
              style={{
                transform: transform3D,
                borderRadius: `${borderRadius * stageScale}px`,
                opacity: frameOpacity,
                width: `${mockupDims.width * stageScale}px`,
                height: `${mockupDims.height * stageScale}px`,
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
                      playsInline
                      preload="auto"
                      muted={!soundEnabled}
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        if (!isPlayingRef.current && !isProcessingRef.current) {
                          vid.pause();
                        }
                        if (!isComposedRef.current) {
                          // Standard normal mode: normal 1.0x playback speed, keyframes stay 3.0s (two 1.5s clips)
                          vid.playbackRate = 1.0;
                          setMediaDuration(3.0);
                          mediaDurationRef.current = 3.0;
                        }
                        vid.currentTime = currentTimeRef.current;
                      }}
                      onCanPlay={(e) => {
                        if (!isPlayingRef.current && !isProcessingRef.current) {
                          e.currentTarget.pause();
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
                  ) : (
                    <img
                      id="mockup-image-player"
                      src={activeMedia.url}
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
                      backdropFilter: `blur(${(blurAmount * 1.6).toFixed(1)}px)`,
                      WebkitBackdropFilter: `blur(${(blurAmount * 1.6).toFixed(1)}px)`,
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
            isGuideOpen={isGuideOpen}
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

      {/* 7. BOTTOM CAMERA CONTROLS ISLAND (Rotary Dials & Ruler Sliders) */}
      <div 
        className={`bottom-studio-controls-slot ${studioMode === 'video' ? 'has-timeline' : ''}`}
        data-guide="camera-island"
      >
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
          isGuideOpen={isGuideOpen}
          guidePhase={guidePhase}
          selectedClipId={selectedClipId}
          onGuideAdvance={handleGuideAdvance}
        />
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
            mediaThumbnailUrl={activeMedia.type === 'image' ? activeMedia.url : undefined}
            mediaThumbnails={videoThumbnails}
            mediaDuration={mediaDuration}
            isGuideOpen={isGuideOpen}
            guidePhase={guidePhase}
            onGuideAdvance={handleGuideAdvance}
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
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        currentStepIndex={guideStepIndex}
        onStepChange={setGuideStepIndex}
        onCompleteTour={handleCompleteTour}
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
