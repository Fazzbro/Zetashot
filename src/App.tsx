import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CameraControlsIsland } from './components/CameraControlsIsland';
import { VideoTimeline, TimelinePositionClip } from './components/VideoTimeline';
import { TopModeIsland } from './components/TopModeIsland';
import { InterestRegionOverlay } from './components/InterestRegionOverlay';
import { MediaLibraryModal, BUILTIN_MEDIA_ITEMS, MediaItem } from './components/MediaLibraryModal';
import { CropModal, CropRect } from './components/CropModal';
import { InteractiveDemoUI } from './components/InteractiveDemoUI';
import { Camera3DState, calculate3DTransform, clampRotation } from './utils/camera3D';
import { BackgroundConfig, generateBackgroundCss } from './utils/gradientUtils';
import { CaptureEngine } from './services/captureEngine';
import { exportMockupVideo, getCameraAtTime } from './services/videoExportEngine';
import { storageService } from './services/storageService';
import { CubicBezierValues } from './utils/bezierSolver';
import { interpolateCameraSpline } from './utils/splineInterpolation';
import { playGearSound, setSoundEnabled as setGlobalSoundEnabled } from './utils/soundEffects';
import { getMockupDimensions, getAspectRatioCss, getStageDimensions } from './utils/aspectRatioHelper';
import { generateVideoThumbnails } from './utils/thumbnailGenerator';
import {
  InterestRegion,
  generateClipsFromInterestRegions,
  calculateCameraForRegion,
  STAGE_BASE_DIMS,
} from './utils/interestRegionEngine';
import { calculateTimelineDuration } from './utils/timelineDurationEngine';
import {
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

import './styles/index.css';
import './styles/uicamera.css';

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
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setGlobalSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // 2. Studio Mode (Photo vs Video)
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

  const handleBlurChange = (val: number) => {
    setBlurAmount(val);
    setShowLaserFocusIndicator(true);
    playGearSound();
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

  // 9. Interactive Dragging State on Stage
  const [isDraggingScene, setIsDraggingScene] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; rotX: number; rotY: number }>({
    x: 0,
    y: 0,
    rotX: 0,
    rotY: 0,
  });

  // 10. Cursor Follower
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 380, y: 220 });

  // 11. Export Status & Format (Default MP4)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // DOM Refs
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameSceneRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 12. Dynamic Stage Reference Scale for 100% Identical Preview-to-Export Framing
  const [stageScale, setStageScale] = useState<number>(1.0);

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

  // When selected clip changes, load its camera angle and seek to its keyframe point (0s for 1st set, 3s for 2nd set)
  const handleSelectClip = (clipId: string) => {
    setSelectedClipId(clipId);
    const clipIdx = clips.findIndex((c) => c.id === clipId);
    const found = clips[clipIdx];
    if (found) {
      setCamera(found.camera);
      const isSecondSet = clipIdx % 2 === 1;
      const targetTime = isSecondSet ? found.startTime + (found.duration || 1.5) : found.startTime;
      currentTimeRef.current = targetTime;
      setCurrentTime(targetTime);
      if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
        if (!isPlayingRef.current) {
          videoRef.current.pause();
        }
      }
    }
  };

  // Helper to update camera and sync with active clip
  const handleCameraChange = (newCamera: Camera3DState) => {
    const cleanedCam: Camera3DState = {
      ...newCamera,
      rotX: Math.round(newCamera.rotX),
      rotY: Math.round(newCamera.rotY),
      rotZ: Math.round(newCamera.rotZ),
      zoom: Number(newCamera.zoom.toFixed(2)),
    };
    setCamera(cleanedCam);
    playGearSound();

    // Sync changes to selected clip in timeline
    setClips((prevClips) =>
      prevClips.map((c) => (c.id === selectedClipId ? { ...c, camera: cleanedCam } : c))
    );
  };

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

      // Media duration extends/syncs to composedDuration (e.g. 4.0s)
      setMediaDuration(composedDuration);
      mediaDurationRef.current = composedDuration;

      const generated = generateClipsFromInterestRegions(
        interestRegions,
        composedDuration,
        STAGE_BASE_DIMS,
        camera
      );
      setClips(generated);
      setInterestRegions([]);
      if (generated.length > 0) {
        setSelectedClipId(generated[0].id);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        setCamera(generated[0].camera);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          const natDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
            ? videoRef.current.duration
            : composedDuration;
          videoRef.current.playbackRate = Math.max(0.1, Math.min(4.0, natDur / composedDuration));
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
      setMediaDuration(composedDuration);
      mediaDurationRef.current = composedDuration;
      const generated = generateClipsFromInterestRegions(
        interestRegions,
        composedDuration,
        STAGE_BASE_DIMS,
        camera
      );
      setClips(generated);
      setInterestRegions([]);
      if (generated.length > 0) {
        setSelectedClipId(generated[0].id);
      }
    }
    setIsMarkingRegion(false);
    setTopMode('operator');
  };

  // Explicit Play / Pause handler with guaranteed immediate synchronous execution
  const handlePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      document.querySelectorAll('video').forEach((v) => v.pause());
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (videoRef.current) {
        const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
          ? videoRef.current.duration
          : mediaDurationRef.current;

        if (isComposedRef.current) {
          const medDur = mediaDurationRef.current > 0 ? mediaDurationRef.current : 3.0;
          videoRef.current.playbackRate = Math.max(0.1, Math.min(4.0, naturalDur / medDur));
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
    }
  }, []);

  // Explicit Seek handler with instant video & camera update
  const handleSeek = useCallback((time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
    if (videoRef.current && activeMediaRef.current.type === 'video') {
      const naturalDur = (videoRef.current.duration && isFinite(videoRef.current.duration) && videoRef.current.duration > 0)
        ? videoRef.current.duration
        : mediaDurationRef.current;

      if (isComposedRef.current) {
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
    const interpolated = getCameraAtTime(clipsRef.current, time);
    setCamera(interpolated);
  }, []);

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
        currentTimeRef.current = 0;
        setCurrentTime(0);
        return;
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      // Canonical camera evaluation matching export 1:1 with Catmull-Rom spline
      const currentClips = clipsRef.current;
      const interpolated = interpolateCameraSpline(currentClips, nextTime);
      setCamera(interpolated);
      setFrameOpacity(1.0);

      // Direct GPU transform update for instantaneous, buttery smooth 60fps response
      if (frameSceneRef.current) {
        frameSceneRef.current.style.transform = calculate3DTransform(interpolated);
      }

      // Sync video drift gently if needed without stuttering decoder
      if (video && media.type === 'video' && video.duration && !video.seeking) {
        if (isComposedRef.current) {
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

  // Direct 3D Scene Dragging with smooth pointer tracking
  const handleSceneMouseDown = (e: React.MouseEvent) => {
    if (isMarkingRegion) return;
    e.preventDefault();
    setIsDraggingScene(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: camera.rotX,
      rotY: camera.rotY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      const deltaY = moveEvent.clientY - dragStartRef.current.y;

      const newRotY = clampRotation(dragStartRef.current.rotY + deltaX * 0.35, -85, 85);
      const newRotX = clampRotation(dragStartRef.current.rotX - deltaY * 0.35, -85, 85);

      handleCameraChange({
        ...camera,
        rotX: newRotX,
        rotY: newRotY,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingScene(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
    setIsComposed(false);
    isComposedRef.current = false;
    setInterestRegions([]);
    setMediaList((prev) => [newItem, ...prev.filter((item) => item.id !== 'blank-media')]);
    setActiveMedia(newItem);
    setCropRect({ x: 0, y: 0, width: 100, height: 100 });
    if (isVideo) {
      setStudioMode('video');
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.src = url;
    }
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

  // Capture / Video Export Handler (Supports MP4 & WebM)
  const handleExport = async (format: 'mp4' | 'webm' = exportFormat) => {
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
        // Video Mockup Rendering via VideoExportEngine (MP4 / WebM)
        // Strictly exports the active length of the video/composition (e.g. 3.0s, 4.0s, etc.)
        const activeExportDuration = calculateTimelineDuration(clips, mediaDuration);
        const stageDims = getStageDimensions(aspectRatio, 1920, 1080);
        const result = await exportMockupVideo({
          clips,
          totalDuration: activeExportDuration,
          mediaDuration,
          fps: 60,
          format,
          width: stageDims.width,
          height: stageDims.height,
          background,
          mediaElement: videoRef.current,
          mediaType: activeMedia.type,
          cropRect,
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
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export encountered an error. Please try again.');
    } finally {
      setIsProcessing(false);
      setExportProgress(0);
    }
  };

  const bgStyle = generateBackgroundCss(background);
  const transform3D = calculate3DTransform(camera, stageScale);
  const mockupDims = getMockupDimensions(aspectRatio);

  // Compute crop transform
  const isCropped = cropRect.width < 100 || cropRect.height < 100 || cropRect.x > 0 || cropRect.y > 0;

  return (
    <div className={`studio-root ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* 1. TOP-LEFT TOOLBAR */}
      <div className="top-left-toolbar">
        <button
          type="button"
          className="top-pill-btn"
          onClick={() => setIsMediaLibraryOpen(true)}
        >
          <Plus size={14} />
          <span>Add media</span>
        </button>
      </div>

      {/* 2. TOP CENTER MODE ISLAND (Unified Operator & Compose matching Screenshot 1) */}
      <TopModeIsland
        isComposeActive={topMode === 'compose'}
        onToggleCompose={() => {
          const nextMode = topMode === 'operator' ? 'compose' : 'operator';
          setTopMode(nextMode);
          if (nextMode === 'compose') {
            setIsMarkingRegion(true);
          } else {
            setIsMarkingRegion(false);
          }
        }}
        onCloseCompose={handleCloseCompose}
        onComposeMacro={handleCompose}
        isMarkingRegion={isMarkingRegion}
        onToggleMarkingRegion={() => setIsMarkingRegion(!isMarkingRegion)}
        onClearRegions={() => setInterestRegions([])}
        regionsCount={interestRegions.length}
      />

      {/* 3. TOP-RIGHT TOOLBAR */}
      <div className="top-right-toolbar">
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

        {/* Upgrade / Export Pill */}
        <button
          type="button"
          className="top-pill-btn top-upgrade-btn"
          onClick={() => handleExport(exportFormat)}
          disabled={isProcessing}
        >
          <Zap size={13} />
          <span>
            {isProcessing
              ? `Exporting ${exportFormat.toUpperCase()} ${exportProgress}%`
              : `Export ${exportFormat.toUpperCase()}`}
          </span>
        </button>
      </div>

      {/* 4. MEDIA LIBRARY MODAL */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        activeMediaId={activeMedia.id}
        mediaItems={mediaList}
        onSelectMedia={(item) => {
          setIsComposed(false);
          isComposedRef.current = false;
          setInterestRegions([]);
          setActiveMedia(item);
          setCropRect({ x: 0, y: 0, width: 100, height: 100 });
          if (item.type === 'video') setStudioMode('video');
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
            className={`frame-anchor ${isDraggingScene ? 'is-dragging' : ''}`}
            onMouseDown={handleSceneMouseDown}
            style={{ perspective: `${(camera.perspective || 1000) * stageScale}px` }}
          >
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
              {/* Edge / Periphery Tilt-Shift Blur: Center stays 100% sharp, edges get blurred */}
              {blurAmount > 0 && (
                <div
                  className="edge-tilt-shift-blur-overlay"
                  style={{
                    backdropFilter: `blur(${blurAmount}px)`,
                    WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    maskImage: 'radial-gradient(circle at center, transparent 40%, black 85%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, transparent 40%, black 85%)',
                  }}
                />
              )}

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
                    width: isCropped ? `${(100 / cropRect.width) * 100}%` : '100%',
                    height: isCropped ? `${(100 / cropRect.height) * 100}%` : '100%',
                    transform: isCropped
                      ? `translate(-${(cropRect.x / 100) * mockupDims.width * stageScale}px, -${(cropRect.y / 100) * mockupDims.height * stageScale}px)`
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
            }}
            selectedRegionId={selectedRegionId}
            onSelectRegion={(id) => {
              setSelectedRegionId(id);
            }}
            width={STAGE_BASE_DIMS.width}
            height={STAGE_BASE_DIMS.height}
          />
        </div>
      </div>

      {/* 7. BOTTOM CAMERA CONTROLS ISLAND (Rotary Dials & Ruler Sliders) */}
      <div className={`bottom-studio-controls-slot ${studioMode === 'video' ? 'has-timeline' : ''}`}>
        <CameraControlsIsland
          mode={studioMode}
          onModeChange={setStudioMode}
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
        />
      </div>

      {/* 8. BOTTOM VIDEO TIMELINE TRAY (when in VIDEO mode) */}
      {studioMode === 'video' && (
        <VideoTimeline
          clips={clips}
          onClipsChange={setClips}
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
          onOpenCrop={() => setIsCropModalOpen(true)}
          onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
          easingValues={easingValues}
          onEasingValuesChange={setEasingValues}
          onCompose={handleCompose}
          onTotalDurationChange={(newDur) => setTotalDuration(newDur)}
          mediaThumbnailUrl={activeMedia.type === 'image' ? activeMedia.url : undefined}
          mediaThumbnails={videoThumbnails}
          mediaDuration={mediaDuration}
        />
      )}
    </div>
  );
}

export default App;
