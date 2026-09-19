import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  Crop,
  Spline,
  RotateCcw,
  Trash2,
  SkipBack,
  Play,
  Pause,
  Plus,
  ChevronDown,
  Shuffle,
  Focus,
  Download,
  Video,
  X,
  Heart,
  Check,
  Type,
  Music,
  Volume2,
  VolumeX,
  Scissors,
  Image as ImageIcon,
} from 'lucide-react';
import { Camera3DState } from '../utils/camera3D';
import { EasingCurveModal } from './EasingCurveModal';
import { CubicBezierValues } from '../utils/bezierSolver';
import { TransitionType, TransitionScope } from '../types/mediaTimeline';
import { getKeyframeTimesForGroup } from '../utils/splineInterpolation';
import { TextLayerOverlay } from '../types/textLayer';
import { createDefaultTextLayer } from '../utils/textLayer';
import {
  MediaTimelineClip,
  sequenceClipsContiguously,
  calculateMediaSequenceDuration,
  splitMediaClipAtTime,
  getActiveMediaClipAtTime,
} from '../types/mediaTimeline';
import {
  calculatePlaybackRate,
  syncMediaClipsToKeyframeDuration,
  syncKeyframeSequenceToDuration,
  syncKeyframesForResizedMediaClip,
  splitKeyframesAtTime,
  getNextKeyframeIndex,
} from '../utils/keyframeMediaSyncEngine';
import { AudioTrackItem } from '../types/audioTrack';
import { AudioManagerModal } from './AudioManagerModal';

export interface TimelinePositionClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  camera: Camera3DState;
  color?: string; // 'yellow' | 'blue'
  transition?: TransitionType;
  exitTransition?: TransitionType;
  blockId?: string;
  mediaClipId?: string;
}

interface VideoTimelineProps {
  clips: TimelinePositionClip[];
  onClipsChange: (clips: TimelinePositionClip[]) => void;
  selectedClipId: string;
  onSelectClip: (clipId: string) => void;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onResetScene: () => void;
  onExportVideo: (format: 'mp4' | 'webm', fps?: 24 | 30 | 60) => void;
  isExporting: boolean;
  exportProgress?: number;
  exportFormat: 'mp4' | 'webm';
  onExportFormatChange: (fmt: 'mp4' | 'webm') => void;
  exportFps?: 24 | 30 | 60;
  onExportFpsChange?: (fps: 24 | 30 | 60) => void;
  onOpenCrop: () => void;
  onOpenMediaLibrary: (mode?: 'select' | 'add') => void;
  easingValues: CubicBezierValues;
  onEasingValuesChange: (vals: CubicBezierValues) => void;
  onCompose?: () => void;
  onTotalDurationChange?: (duration: number) => void;
  onMediaDurationChange?: (duration: number) => void;
  mediaThumbnailUrl?: string;
  mediaThumbnails?: string[];
  mediaDuration?: number;
  isGuideOpen?: boolean;
  guidePhase?: 'start' | 'end' | 'compose_operator' | 'compose_draw' | 'compose_action' | 'preview' | 'export' | 'complete';
  onGuideAdvance?: () => void;
  textLayers?: TextLayerOverlay[];
  onTextLayersChange?: (layers: TextLayerOverlay[]) => void;
  selectedTextLayerId?: string | null;
  onSelectTextLayer?: (id: string | null) => void;
  mediaClips?: MediaTimelineClip[];
  onMediaClipsChange?: (clips: MediaTimelineClip[]) => void;
  selectedMediaClipId?: string | null;
  onSelectMediaClip?: (clipId: string | null) => void;
  audioTracks?: AudioTrackItem[];
  onAudioTracksChange?: (tracks: AudioTrackItem[]) => void;
  selectedAudioTrackId?: string | null;
  onSelectAudioTrack?: (trackId: string | null) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  clips,
  onClipsChange,
  selectedClipId,
  onSelectClip,
  currentTime,
  totalDuration,
  isPlaying,
  onPlayPause,
  onSeek,
  onResetScene,
  onExportVideo,
  isExporting,
  exportProgress = 0,
  exportFormat,
  onExportFormatChange,
  exportFps = 60,
  onExportFpsChange,
  onOpenCrop,
  onOpenMediaLibrary,
  easingValues,
  onEasingValuesChange,
  onCompose,
  onTotalDurationChange,
  onMediaDurationChange,
  mediaThumbnailUrl,
  mediaThumbnails,
  mediaDuration = 3.0,
  isGuideOpen = false,
  guidePhase = 'start',
  onGuideAdvance,
  textLayers,
  onTextLayersChange,
  selectedTextLayerId,
  onSelectTextLayer,
  mediaClips,
  onMediaClipsChange,
  selectedMediaClipId,
  onSelectMediaClip,
  audioTracks,
  onAudioTracksChange,
  selectedAudioTrackId,
  onSelectAudioTrack,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Dynamically sync timeline tray height to CSS variable --timeline-height
  // Ensures floating control panel (CameraControlsIsland) and canvas stage adapt seamlessly
  // when extra tracks (SFX, music, text overlays, multi-clips) are added or removed
  useLayoutEffect(() => {
    const el = trayRef.current;
    if (!el) return;

    let rafId: number;
    const syncHeight = () => {
      const h = el.offsetHeight;
      if (h > 0) {
        document.documentElement.style.setProperty('--timeline-height', `${h}px`);
      }
    };

    syncHeight();

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncHeight);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      document.documentElement.style.removeProperty('--timeline-height');
    };
  }, []);
  const [showEasingModal, setShowEasingModal] = useState(false);
  const [isAudioManagerOpen, setIsAudioManagerOpen] = useState(false);
  const [activeVolumePopoverTrackId, setActiveVolumePopoverTrackId] = useState<string | null>(null);

  // Outside click listener to dismiss audio volume popover
  useEffect(() => {
    if (!activeVolumePopoverTrackId) return;
    const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.audio-volume-popover-card') && !target?.closest('.audio-volume-btn')) {
        setActiveVolumePopoverTrackId(null);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [activeVolumePopoverTrackId]);

  // Visible Timeline Ruler Duration: at least 12.0s by default for expansive workspace view
  const rulerDuration = Math.max(12.0, totalDuration || 12.0);

  // Popovers for Transitions
  const [activeTransitionPopover, setActiveTransitionPopover] = useState<{
    type: 'start' | 'exit';
    clipId: string;
  } | null>(null);
  const [activeMediaTransitionPopover, setActiveMediaTransitionPopover] = useState<{
    clipId: string;
  } | null>(null);

  // High-performance snapshot refs to eliminate drag jitter and listener churn
  const clipsRef = useRef(clips);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  const rulerDurationRef = useRef(rulerDuration);
  useEffect(() => {
    rulerDurationRef.current = rulerDuration;
  }, [rulerDuration]);

  const textLayersRef = useRef(textLayers || []);
  useEffect(() => {
    textLayersRef.current = textLayers || [];
  }, [textLayers]);

  const handleAddTextLayer = useCallback(() => {
    const newLayer = createDefaultTextLayer(currentTime);
    const updated = [...(textLayersRef.current || []), newLayer];
    onTextLayersChange?.(updated);
    onSelectTextLayer?.(newLayer.id);
  }, [currentTime, onSelectTextLayer, onTextLayersChange]);

  const startTextLayerResize = useCallback(
    (e: React.PointerEvent, layerId: string, handle: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();

      const targetElem = e.currentTarget as HTMLElement;
      try {
        targetElem.setPointerCapture(e.pointerId);
      } catch {}

      const currentLayers = textLayersRef.current.map((l) => ({ ...l }));
      const targetLayer = currentLayers.find((l) => l.id === layerId);
      if (!targetLayer) return;

      const initialStart = targetLayer.startTime;
      const initialDuration = targetLayer.duration;
      const initialEnd = initialStart + initialDuration;
      const startX = e.clientX;
      const initialRulerDuration = rulerDurationRef.current;

      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const onPointerMove = (ev: PointerEvent) => {
        if (!trackRef.current) return;
        const trackRect = trackRef.current.getBoundingClientRect();
        if (trackRect.width <= 0) return;

        const deltaX = ev.clientX - startX;
        const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;

        const updated = currentLayers.map((l) => {
          if (l.id !== layerId) return l;
          if (handle === 'right') {
            const newDuration = Math.max(0.3, Math.min(initialRulerDuration - initialStart, Number((initialDuration + deltaSec).toFixed(2))));
            return { ...l, duration: newDuration };
          } else {
            const newStart = Math.max(0, Math.min(initialEnd - 0.3, Number((initialStart + deltaSec).toFixed(2))));
            const newDuration = Math.max(0.3, Number((initialEnd - newStart).toFixed(2)));
            return { ...l, startTime: newStart, duration: newDuration };
          }
        });

        onTextLayersChange?.(updated);
      };

      const onPointerUp = (ev: PointerEvent) => {
        try {
          targetElem.releasePointerCapture(ev.pointerId);
        } catch {}
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [onTextLayersChange]
  );

  const startTextLayerDrag = useCallback(
    (e: React.PointerEvent, layerId: string) => {
      e.preventDefault();
      e.stopPropagation();

      onSelectTextLayer?.(layerId);

      const targetElem = e.currentTarget as HTMLElement;
      try {
        targetElem.setPointerCapture(e.pointerId);
      } catch {}

      const currentLayers = textLayersRef.current.map((l) => ({ ...l }));
      const targetLayer = currentLayers.find((l) => l.id === layerId);
      if (!targetLayer) return;

      const initialStart = targetLayer.startTime;
      const dur = targetLayer.duration;
      const startX = e.clientX;
      const initialRulerDuration = rulerDurationRef.current;

      document.body.style.cursor = 'grab';
      document.body.style.userSelect = 'none';

      const onPointerMove = (ev: PointerEvent) => {
        if (!trackRef.current) return;
        const trackRect = trackRef.current.getBoundingClientRect();
        if (trackRect.width <= 0) return;

        const deltaX = ev.clientX - startX;
        const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;
        const newStart = Math.max(0, Math.min(initialRulerDuration - dur, Number((initialStart + deltaSec).toFixed(2))));

        const updated = currentLayers.map((l) => (l.id === layerId ? { ...l, startTime: newStart } : l));
        onTextLayersChange?.(updated);
      };

      const onPointerUp = (ev: PointerEvent) => {
        try {
          targetElem.releasePointerCapture(ev.pointerId);
        } catch {}
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [onSelectTextLayer, onTextLayersChange]
  );

  const mediaClipsRef = useRef(mediaClips || []);
  useEffect(() => {
    mediaClipsRef.current = mediaClips || [];
  }, [mediaClips]);

  const audioTracksRef = useRef(audioTracks || []);
  useEffect(() => {
    audioTracksRef.current = audioTracks || [];
  }, [audioTracks]);

  // Media Clip Resize Handler (with vice-versa keyframe sync)
  const startMediaClipResize = useCallback((
    e: React.PointerEvent,
    clipId: string,
    handle: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture(e.pointerId);
    } catch {}

    const currentClips = mediaClipsRef.current.map((c) => ({ ...c }));
    const clipIdx = currentClips.findIndex((c) => c.id === clipId);
    if (clipIdx === -1) return;

    const targetClip = currentClips[clipIdx];
    const initialStart = targetClip.startTime;
    const initialDuration = targetClip.duration;
    const startX = e.clientX;
    const initialRulerDuration = rulerDurationRef.current;

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const deltaX = ev.clientX - startX;
      const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;

      if (handle === 'right') {
        const newDur = Math.max(0.5, Number((initialDuration + deltaSec).toFixed(2)));
        currentClips[clipIdx].duration = newDur;
        const naturalDur = currentClips[clipIdx].sourceDuration || mediaDuration;
        currentClips[clipIdx].speed = calculatePlaybackRate(naturalDur, newDur);
        const resequenced = sequenceClipsContiguously(currentClips);
        onMediaClipsChange?.(resequenced);

        // Vice-versa: sync keyframe sequence for the resized media clip
        if (clipsRef.current.length > 0) {
          const syncedClips = syncKeyframesForResizedMediaClip(
            clipsRef.current,
            mediaClipsRef.current,
            clipIdx,
            newDur
          );
          onClipsChange(syncedClips);
        }
        const totalMediaDuration = calculateMediaSequenceDuration(resequenced);
        onMediaDurationChange?.(totalMediaDuration);
      } else {
        const minDur = 0.5;
        const clampedDelta = Math.min(initialDuration - minDur, deltaSec);
        const newDur = Math.max(minDur, Number((initialDuration - clampedDelta).toFixed(2)));
        currentClips[clipIdx].duration = newDur;
        const naturalDur = currentClips[clipIdx].sourceDuration || mediaDuration;
        currentClips[clipIdx].speed = calculatePlaybackRate(naturalDur, newDur);
        currentClips[clipIdx].sourceStartTime = Math.max(0, Number(((targetClip.sourceStartTime || 0) + clampedDelta).toFixed(2)));
        const resequenced = sequenceClipsContiguously(currentClips);
        onMediaClipsChange?.(resequenced);

        // Vice-versa: sync keyframe sequence for the resized media clip
        if (clipsRef.current.length > 0) {
          const syncedClips = syncKeyframesForResizedMediaClip(
            clipsRef.current,
            mediaClipsRef.current,
            clipIdx,
            newDur
          );
          onClipsChange(syncedClips);
        }
        const totalMediaDuration = calculateMediaSequenceDuration(resequenced);
        onMediaDurationChange?.(totalMediaDuration);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetElem.releasePointerCapture(ev.pointerId);
      } catch {}
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [mediaDuration, onClipsChange, onMediaClipsChange, onMediaDurationChange]);

  const handleNudgeMediaClipDuration = useCallback(
    (clipId: string, delta: number) => {
      const currentClips = mediaClipsRef.current.map((c) => ({ ...c }));
      const clipIdx = currentClips.findIndex((c) => c.id === clipId);
      if (clipIdx === -1) return;

      const initialDuration = currentClips[clipIdx].duration;
      const newDur = Math.max(0.5, Number((initialDuration + delta).toFixed(2)));
      if (newDur === initialDuration) return;

      currentClips[clipIdx].duration = newDur;
      const naturalDur = currentClips[clipIdx].sourceDuration || mediaDuration;
      currentClips[clipIdx].speed = calculatePlaybackRate(naturalDur, newDur);
      const resequenced = sequenceClipsContiguously(currentClips);
      onMediaClipsChange?.(resequenced);

      if (clipsRef.current.length > 0) {
        const syncedClips = syncKeyframesForResizedMediaClip(
          clipsRef.current,
          mediaClipsRef.current,
          clipIdx,
          newDur
        );
        onClipsChange(syncedClips);
      }
      const totalMediaDuration = calculateMediaSequenceDuration(resequenced);
      onMediaDurationChange?.(totalMediaDuration);
    },
    [mediaDuration, onClipsChange, onMediaClipsChange, onMediaDurationChange]
  );

  const handleDeleteMediaClip = useCallback((clipId: string) => {
    const currentClips = mediaClipsRef.current.filter((c) => c.id !== clipId);
    const resequenced = sequenceClipsContiguously(currentClips);
    onMediaClipsChange?.(resequenced);
    if (selectedMediaClipId === clipId && resequenced.length > 0) {
      onSelectMediaClip?.(resequenced[0].id);
    }
  }, [onMediaClipsChange, onSelectMediaClip, selectedMediaClipId]);

  // Cut / Split Media Clip at current playhead
  const canSplitMedia = Boolean(
    mediaClipsRef.current &&
    mediaClipsRef.current.some(
      (c) => currentTime >= c.startTime + 0.15 && currentTime <= c.startTime + c.duration - 0.15
    )
  );

  const handleSplitMediaClip = useCallback(() => {
    if (!mediaClipsRef.current || mediaClipsRef.current.length === 0) return;
    const { updatedClips, splitClipId } = splitMediaClipAtTime(mediaClipsRef.current, currentTime);
    if (splitClipId) {
      const targetClip = mediaClipsRef.current.find(
        (c) => currentTime >= c.startTime + 0.15 && currentTime <= c.startTime + c.duration - 0.15
      );
      if (targetClip) {
        const updatedKeyframes = splitKeyframesAtTime(clipsRef.current, currentTime, targetClip.id, splitClipId);
        onClipsChange(updatedKeyframes);
      }
      onMediaClipsChange?.(updatedClips);
      onSelectMediaClip?.(splitClipId);
    }
  }, [currentTime, onClipsChange, onMediaClipsChange, onSelectMediaClip]);

  // Keyboard shortcut: S key splits media at playhead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplitMediaClip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSplitMediaClip]);

  // Audio Track Resize Handler
  const startAudioTrackResize = useCallback((
    e: React.PointerEvent,
    trackId: string,
    handle: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture(e.pointerId);
    } catch {}

    const currentTracks = audioTracksRef.current.map((t) => ({ ...t }));
    const targetTrack = currentTracks.find((t) => t.id === trackId);
    if (!targetTrack) return;

    const initialStart = targetTrack.startTime;
    const initialDuration = targetTrack.duration;
    const initialEnd = initialStart + initialDuration;
    const startX = e.clientX;
    const initialRulerDuration = rulerDurationRef.current;

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const deltaX = ev.clientX - startX;
      const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;

      const updated = currentTracks.map((t) => {
        if (t.id !== trackId) return t;
        if (handle === 'right') {
          const newDuration = Math.max(0.2, Math.min(initialRulerDuration - initialStart, Number((initialDuration + deltaSec).toFixed(2))));
          return { ...t, duration: newDuration };
        } else {
          const newStart = Math.max(0, Math.min(initialEnd - 0.2, Number((initialStart + deltaSec).toFixed(2))));
          const newDuration = Math.max(0.2, Number((initialEnd - newStart).toFixed(2)));
          return { ...t, startTime: newStart, duration: newDuration };
        }
      });

      onAudioTracksChange?.(updated);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetElem.releasePointerCapture(ev.pointerId);
      } catch {}
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [onAudioTracksChange]);

  const startAudioTrackDrag = useCallback((
    e: React.PointerEvent,
    trackId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    onSelectAudioTrack?.(trackId);

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture(e.pointerId);
    } catch {}

    const currentTracks = audioTracksRef.current.map((t) => ({ ...t }));
    const targetTrack = currentTracks.find((t) => t.id === trackId);
    if (!targetTrack) return;

    const initialStart = targetTrack.startTime;
    const dur = targetTrack.duration;
    const startX = e.clientX;
    const initialRulerDuration = rulerDurationRef.current;

    document.body.style.cursor = 'grab';
    document.body.style.userSelect = 'none';

    const onPointerMove = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const deltaX = ev.clientX - startX;
      const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;
      const newStart = Math.max(0, Math.min(initialRulerDuration - dur, Number((initialStart + deltaSec).toFixed(2))));

      const updated = currentTracks.map((t) => (t.id === trackId ? { ...t, startTime: newStart } : t));
      onAudioTracksChange?.(updated);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetElem.releasePointerCapture(ev.pointerId);
      } catch {}
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [onAudioTracksChange, onSelectAudioTrack]);

  const handleDeleteAudioTrack = useCallback((trackId: string) => {
    const updated = (audioTracksRef.current || []).filter((t) => t.id !== trackId);
    onAudioTracksChange?.(updated);
    if (selectedAudioTrackId === trackId) {
      onSelectAudioTrack?.(null);
    }
  }, [onAudioTracksChange, onSelectAudioTrack, selectedAudioTrackId]);

  const handleToggleMuteAudioTrack = useCallback((trackId: string) => {
    const updated = (audioTracksRef.current || []).map((t) =>
      t.id === trackId ? { ...t, isMuted: !t.isMuted } : t
    );
    onAudioTracksChange?.(updated);
  }, [onAudioTracksChange]);

  const handleSetAudioTrackVolume = useCallback((trackId: string, volume: number) => {
    const updated = (audioTracksRef.current || []).map((t) =>
      t.id === trackId ? { ...t, volume: Math.max(0, Math.min(1, Number(volume.toFixed(2)))) } : t
    );
    onAudioTracksChange?.(updated);
  }, [onAudioTracksChange]);

  // Window-level Pointer Drag Resizing for Sequence / Keyframe Blocks
  const startSequenceResize = useCallback((
    e: React.PointerEvent,
    groupStartIndex: number,
    subCount: number,
    initialStart: number,
    initialDuration: number,
    handle: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture(e.pointerId);
    } catch {}

    const capturedClips = clipsRef.current.map((c) => ({ ...c }));
    const startX = e.clientX;
    const initialRulerDuration = rulerDurationRef.current;

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const deltaX = ev.clientX - startX;
      const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;

      const updated = capturedClips.map((c) => ({ ...c }));

      if (handle === 'right') {
        const minDuration = Math.max(0.4, subCount * 0.25);
        const newDuration = Math.max(minDuration, Math.min(60, Number((initialDuration + deltaSec).toFixed(2))));
        const durationDelta = Number((newDuration - initialDuration).toFixed(2));

        if (subCount === 1) {
          const idx = groupStartIndex;
          if (updated[idx]) {
            updated[idx].duration = newDuration;
          }
        } else {
          const subClips = capturedClips.slice(groupStartIndex, groupStartIndex + subCount);
          const origDurs = subClips.map((c) => (typeof c.duration === 'number' ? c.duration : 1.5));
          const sumOrigDur = origDurs.reduce((a, b) => a + b, 0);

          // Calculate strictly proportional raw scaled durations
          const rawDurs = origDurs.map((d) => {
            if (d === 0) return 0;
            const ratio = sumOrigDur > 0 ? d / sumOrigDur : 1 / subCount;
            return newDuration * ratio;
          });

          // Round with minimum 0.1s for active clips
          const newDurs = rawDurs.map((d) => (d === 0 ? 0 : Math.max(0.1, Number(d.toFixed(2)))));

          // Eliminate rounding drift so sum(newDurs) matches newDuration exactly
          const currentSum = Number(newDurs.reduce((a, b) => a + b, 0).toFixed(2));
          const drift = Number((newDuration - currentSum).toFixed(2));

          if (drift !== 0) {
            let maxIdx = 0;
            let maxVal = -1;
            for (let i = 0; i < newDurs.length; i++) {
              if (newDurs[i] > maxVal) {
                maxVal = newDurs[i];
                maxIdx = i;
              }
            }
            newDurs[maxIdx] = Math.max(0.1, Number((newDurs[maxIdx] + drift).toFixed(2)));
          }

          let accStart = initialStart;
          for (let s = 0; s < subCount; s++) {
            const clipIdx = groupStartIndex + s;
            if (!updated[clipIdx]) continue;
            updated[clipIdx].startTime = Number(accStart.toFixed(2));
            updated[clipIdx].duration = newDurs[s];
            accStart += newDurs[s];
          }
        }

        // If immediately adjacent downstream block exists, adjust it so it occupies that position without gap/overlap
        const nextBlockFirstClip = capturedClips[groupStartIndex + subCount];
        if (nextBlockFirstClip && Math.abs(nextBlockFirstClip.startTime - (initialStart + initialDuration)) < 0.05) {
          const newBlockEnd = Number((initialStart + newDuration).toFixed(2));
          const nextBlockInitialEnd = Number((nextBlockFirstClip.startTime + (nextBlockFirstClip.duration || 1.5)).toFixed(2));
          const newNextDuration = Math.max(0.3, Number((nextBlockInitialEnd - newBlockEnd).toFixed(2)));
          updated[groupStartIndex + subCount].startTime = newBlockEnd;
          updated[groupStartIndex + subCount].duration = newNextDuration;
        } else {
          // Shift downstream clips forward/backward by durationDelta
          for (let k = groupStartIndex + subCount; k < updated.length; k++) {
            updated[k].startTime = Math.max(0, Number((capturedClips[k].startTime + durationDelta).toFixed(2)));
          }
        }

        // If immediately adjacent upstream block exists, adjust it so it occupies that position up to newStart
        if (groupStartIndex > 0) {
          const prevBlockLastClip = capturedClips[groupStartIndex - 1];
          if (prevBlockLastClip && Math.abs((prevBlockLastClip.startTime + (prevBlockLastClip.duration || 1.5)) - initialStart) < 0.05) {
            const prevNewDuration = Math.max(0.3, Number((newStart - prevBlockLastClip.startTime).toFixed(2)));
            updated[groupStartIndex - 1].duration = prevNewDuration;
          }
        }

        onClipsChange(updated);

        // Synchronously stretch media track below with keyframes
        let maxClipsEnd = 0;
        for (const c of updated) {
          const end = (c.startTime || 0) + (c.duration || 0);
          if (end > maxClipsEnd) maxClipsEnd = end;
        }
        if (onMediaDurationChange && maxClipsEnd > 0) {
          onMediaDurationChange(Number(maxClipsEnd.toFixed(2)));
        }
        if (onTotalDurationChange && maxClipsEnd > initialRulerDuration) {
          onTotalDurationChange(Number((maxClipsEnd + 1.0).toFixed(2)));
        }
        if (mediaClipsRef.current.length > 0 && onMediaClipsChange && maxClipsEnd > 0) {
          if (mediaClipsRef.current.length === 1) {
            const syncedMediaClips = syncMediaClipsToKeyframeDuration(
              mediaClipsRef.current,
              maxClipsEnd,
              mediaDuration
            );
            onMediaClipsChange(syncedMediaClips);
          } else {
            const firstSubClip = capturedClips[groupStartIndex];
            const targetMediaClip = mediaClipsRef.current.find(
              (m) => (firstSubClip?.mediaClipId && m.id === firstSubClip.mediaClipId) || Math.abs(m.startTime - initialStart) < 0.1
            );
            if (targetMediaClip) {
              const updatedMedia = mediaClipsRef.current.map((m) =>
                m.id === targetMediaClip.id ? { ...m, duration: newDuration } : m
              );
              const resequenced = sequenceClipsContiguously(updatedMedia);
              onMediaClipsChange(resequenced);
            }
          }
        }
      } else if (handle === 'left') {
        const minDuration = Math.max(0.4, subCount * 0.25);
        const maxDelta = initialDuration - minDuration;
        const clampedDelta = Math.min(maxDelta, Math.max(-initialStart, deltaSec));
        const newStart = Math.max(0, Number((initialStart + clampedDelta).toFixed(2)));
        const newDuration = Math.max(minDuration, Number((initialDuration - clampedDelta).toFixed(2)));

        if (subCount === 1) {
          const idx = groupStartIndex;
          if (updated[idx]) {
            updated[idx].startTime = newStart;
            updated[idx].duration = newDuration;
          }
        } else {
          const subClips = capturedClips.slice(groupStartIndex, groupStartIndex + subCount);
          const origDurs = subClips.map((c) => (typeof c.duration === 'number' ? c.duration : 1.5));
          const sumOrigDur = origDurs.reduce((a, b) => a + b, 0);

          const rawDurs = origDurs.map((d) => {
            if (d === 0) return 0;
            const ratio = sumOrigDur > 0 ? d / sumOrigDur : 1 / subCount;
            return newDuration * ratio;
          });

          const newDurs = rawDurs.map((d) => (d === 0 ? 0 : Math.max(0.1, Number(d.toFixed(2)))));
          const currentSum = Number(newDurs.reduce((a, b) => a + b, 0).toFixed(2));
          const drift = Number((newDuration - currentSum).toFixed(2));

          if (drift !== 0) {
            let maxIdx = 0;
            let maxVal = -1;
            for (let i = 0; i < newDurs.length; i++) {
              if (newDurs[i] > maxVal) {
                maxVal = newDurs[i];
                maxIdx = i;
              }
            }
            newDurs[maxIdx] = Math.max(0.1, Number((newDurs[maxIdx] + drift).toFixed(2)));
          }

          let accStart = newStart;
          for (let s = 0; s < subCount; s++) {
            const clipIdx = groupStartIndex + s;
            if (!updated[clipIdx]) continue;
            updated[clipIdx].startTime = Number(accStart.toFixed(2));
            updated[clipIdx].duration = newDurs[s];
            accStart += newDurs[s];
          }
        }

        onClipsChange(updated);

        let maxClipsEnd = 0;
        for (const c of updated) {
          const end = (c.startTime || 0) + (c.duration || 0);
          if (end > maxClipsEnd) maxClipsEnd = end;
        }
        if (onMediaDurationChange && maxClipsEnd > 0) {
          onMediaDurationChange(Number(maxClipsEnd.toFixed(2)));
        }
        if (mediaClipsRef.current.length > 0 && onMediaClipsChange && maxClipsEnd > 0) {
          if (mediaClipsRef.current.length === 1) {
            const syncedMediaClips = syncMediaClipsToKeyframeDuration(
              mediaClipsRef.current,
              maxClipsEnd,
              mediaDuration
            );
            onMediaClipsChange(syncedMediaClips);
          } else {
            const firstSubClip = capturedClips[groupStartIndex];
            const targetMediaClip = mediaClipsRef.current.find(
              (m) => (firstSubClip?.mediaClipId && m.id === firstSubClip.mediaClipId) || Math.abs(m.startTime - initialStart) < 0.1
            );
            if (targetMediaClip) {
              const updatedMedia = mediaClipsRef.current.map((m) =>
                m.id === targetMediaClip.id ? { ...m, duration: newDuration } : m
              );
              const resequenced = sequenceClipsContiguously(updatedMedia);
              onMediaClipsChange(resequenced);
            }
          }
        }
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetElem.releasePointerCapture(ev.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [mediaDuration, onClipsChange, onMediaClipsChange, onMediaDurationChange, onTotalDurationChange]);

  // Intra-Sequence Divider Drag Handler between Adjacent Keyframe Sub-blocks
  const startDividerResize = useCallback((
    e: React.PointerEvent,
    groupStartIndex: number,
    subIdx: number,
    _subClips: TimelinePositionClip[]
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture(e.pointerId);
    } catch {}

    const capturedClips = clipsRef.current.map((c) => ({ ...c }));
    const leftIdx = groupStartIndex + subIdx;
    const rightIdx = leftIdx + 1;
    if (!capturedClips[leftIdx] || !capturedClips[rightIdx]) return;

    const leftInitialStart = capturedClips[leftIdx].startTime;
    const leftInitialDur = typeof capturedClips[leftIdx].duration === 'number' ? capturedClips[leftIdx].duration : 1.5;
    const rightInitialDur = typeof capturedClips[rightIdx].duration === 'number' ? capturedClips[rightIdx].duration : 1.5;
    const combinedDur = Number((leftInitialDur + rightInitialDur).toFixed(2));
    const startX = e.clientX;
    const initialRulerDuration = rulerDurationRef.current;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;

      const deltaX = ev.clientX - startX;
      const deltaSec = (deltaX / trackRect.width) * initialRulerDuration;

      const minDur = 0.2;
      // If right clip is a 0-duration end keyframe (e.g. compose mode), keep its duration 0
      if (rightInitialDur === 0) {
        const newLeftDur = Math.max(minDur, Number((leftInitialDur + deltaSec).toFixed(2)));
        const updated = capturedClips.map((c) => ({ ...c }));
        updated[leftIdx].duration = newLeftDur;
        updated[rightIdx].startTime = Number((leftInitialStart + newLeftDur).toFixed(2));
        onClipsChange(updated);
        return;
      }

      const maxLeftDur = Math.max(minDur, Number((combinedDur - minDur).toFixed(2)));
      const newLeftDur = Math.max(minDur, Math.min(maxLeftDur, Number((leftInitialDur + deltaSec).toFixed(2))));
      const newRightDur = Math.max(minDur, Number((combinedDur - newLeftDur).toFixed(2)));

      const updated = capturedClips.map((c) => ({ ...c }));
      updated[leftIdx].duration = newLeftDur;
      updated[rightIdx].startTime = Number((leftInitialStart + newLeftDur).toFixed(2));
      updated[rightIdx].duration = newRightDur;

      onClipsChange(updated);
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        targetElem.releasePointerCapture(ev.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }, [onClipsChange]);

  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const handleScrubMove = (e: MouseEvent) => {
      if (!isScrubbing || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(percent * rulerDuration);
    };

    const handleScrubEnd = () => {
      setIsScrubbing(false);
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleScrubMove);
      window.addEventListener('mouseup', handleScrubEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleScrubMove);
      window.removeEventListener('mouseup', handleScrubEnd);
    };
  }, [isScrubbing, rulerDuration, onSeek]);

  const handleTrackMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    if ((e.target as HTMLElement).closest('.sequence-drag-handle')) return;
    if ((e.target as HTMLElement).closest('.clip-triangle-btn')) return;
    if ((e.target as HTMLElement).closest('.transition-popover-card')) return;
    setIsScrubbing(true);
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(percent * rulerDuration);
  };


  // Add ONE keyframe to the sequence on '+' click
  const handleAddSingleKeyframe = () => {
    const nextNum = getNextKeyframeIndex(clips);
    const pad = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    const stepDur = 1.5;

    // Find active media clip at current playhead or selected media clip
    const currentMediaClips = mediaClipsRef.current || [];
    const activeMediaClip = currentMediaClips.length > 0
      ? (getActiveMediaClipAtTime(currentMediaClips, currentTime) || currentMediaClips.find((m) => m.id === selectedMediaClipId) || currentMediaClips[0])
      : null;

    let newStartTime = currentTime;
    const isVideoClip = activeMediaClip?.type === 'video';
    let defaultCamera: Camera3DState = isVideoClip
      ? { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }
      : { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };
    let mediaClipId: string | undefined = undefined;
    let blockId = `block_${Date.now()}`;

    if (activeMediaClip) {
      mediaClipId = activeMediaClip.id;
      blockId = `block_${activeMediaClip.id}`;

      // Keyframes belonging to this media clip
      const clipKeyframes = clips.filter((c) => c.mediaClipId === activeMediaClip.id || (!c.mediaClipId && c.startTime >= activeMediaClip.startTime - 0.05 && c.startTime < activeMediaClip.startTime + activeMediaClip.duration));

      // If the clip has exactly 1 keyframe, split it cleanly into a 2-keyframe block occupying the full clip duration
      if (clipKeyframes.length === 1) {
        const firstInClip = clipKeyframes[0];
        const clipDur = activeMediaClip.duration;
        const halfDur = Number((clipDur / 2).toFixed(2));
        const remDur = Number((clipDur - halfDur).toFixed(2));

        const updatedFirst: TimelinePositionClip = {
          ...firstInClip,
          duration: halfDur,
          blockId: firstInClip.blockId || `block_${activeMediaClip.id}`,
        };

        newStartTime = Number((activeMediaClip.startTime + halfDur).toFixed(2));
        defaultCamera = { ...firstInClip.camera };
        blockId = updatedFirst.blockId;

        const newClip: TimelinePositionClip = {
          id: `P${pad}_${Date.now()}`,
          name: `P${pad}`,
          startTime: newStartTime,
          duration: remDur,
          camera: defaultCamera,
          color: 'yellow',
          transition: 'cut',
          exitTransition: 'cut',
          mediaClipId,
          blockId,
        };

        const updated = clips.map((c) => (c.id === firstInClip.id ? updatedFirst : c));
        updated.push(newClip);
        updated.sort((a, b) => a.startTime - b.startTime);
        onClipsChange(updated);
        onSelectClip(newClip.id);
        onSeek(newStartTime);
        return;
      } else if (clipKeyframes.length > 1) {
        const lastInClip = clipKeyframes[clipKeyframes.length - 1];
        newStartTime = Number((lastInClip.startTime + (lastInClip.duration || stepDur)).toFixed(2));
        if (newStartTime >= activeMediaClip.startTime + activeMediaClip.duration) {
          const step = Math.max(0.3, Number((activeMediaClip.duration / (clipKeyframes.length + 1)).toFixed(2)));
          newStartTime = Number((activeMediaClip.startTime + activeMediaClip.duration - step).toFixed(2));
        }
        defaultCamera = { ...lastInClip.camera };
        if (lastInClip.blockId) blockId = lastInClip.blockId;
      } else {
        // First keyframe for this media clip starts at the media clip's start time and uses the clean imported pose!
        newStartTime = Number(activeMediaClip.startTime.toFixed(2));
        defaultCamera = isVideoClip
          ? { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 }
          : { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };
      }
    } else {
      const lastClip = clips[clips.length - 1];
      if (lastClip) {
        newStartTime = Number((lastClip.startTime + (lastClip.duration || stepDur)).toFixed(2));
        defaultCamera = { ...lastClip.camera };
      }
    }

    const newClip: TimelinePositionClip = {
      id: `P${pad}_${Date.now()}`,
      name: `P${pad}`,
      startTime: newStartTime,
      duration: stepDur,
      camera: defaultCamera,
      color: 'yellow',
      transition: 'cut',
      exitTransition: 'cut',
      mediaClipId,
      blockId,
    };

    const updated = [...clips, newClip].sort((a, b) => a.startTime - b.startTime);
    onClipsChange(updated);
    const newSpan = Number((newStartTime + stepDur).toFixed(2));
    if (onMediaDurationChange) {
      onMediaDurationChange(newSpan);
    }
    onSelectClip(newClip.id);
    onSeek(newStartTime);
  };

  const handleDeleteClip = (idToDelete?: string) => {
    const targetId = idToDelete || selectedClipId;
    const updated = clips.filter((c) => c.id !== targetId);
    onClipsChange(updated);
    if (onMediaDurationChange && updated.length > 0) {
      let maxEnd = 0;
      for (const c of updated) {
        const end = (c.startTime || 0) + (c.duration || 0);
        if (end > maxEnd) maxEnd = end;
      }
      if (maxEnd > 0) onMediaDurationChange(Number(maxEnd.toFixed(2)));
    }
    if (targetId === selectedClipId) {
      onSelectClip(updated[0]?.id || '');
    }
  };

  const handleUpdateTransition = (clipId: string, type: 'start' | 'exit', trans: TransitionType) => {
    const updated = clips.map((c) => {
      if (c.id === clipId) {
        return type === 'start' ? { ...c, transition: trans } : { ...c, exitTransition: trans };
      }
      return c;
    });
    onClipsChange(updated);
    setActiveTransitionPopover(null);
  };

  const handleUpdateMediaTransition = (clipId: string, trans: TransitionType) => {
    if (!mediaClipsRef.current || !onMediaClipsChange) return;
    const updated = mediaClipsRef.current.map((c) => {
      if (c.id === clipId) {
        return {
          ...c,
          transition: trans,
          transitionScope: c.transitionScope || 'canvas',
        };
      }
      return c;
    });
    onMediaClipsChange(updated);
    if (trans === 'cut') {
      setActiveMediaTransitionPopover(null);
    }
  };

  const handleUpdateMediaTransitionScope = (clipId: string, scope: TransitionScope) => {
    if (!mediaClipsRef.current || !onMediaClipsChange) return;
    const updated = mediaClipsRef.current.map((c) => {
      if (c.id === clipId) {
        return { ...c, transitionScope: scope };
      }
      return c;
    });
    onMediaClipsChange(updated);
  };

  const progressPercent = Math.max(0, Math.min(100, (currentTime / rulerDuration) * 100));

  // Group clips into multi-set sequence blocks
  type RenderGroup =
    | { type: 'multi'; clips: TimelinePositionClip[]; startIndex: number }
    | { type: 'single'; clip: TimelinePositionClip; index: number };

  const renderGroups: RenderGroup[] = [];
  let i = 0;
  while (i < clips.length) {
    const current = clips[i];
    if (current.blockId) {
      const blockClips: TimelinePositionClip[] = [current];
      let j = i + 1;
      while (j < clips.length && clips[j].blockId === current.blockId) {
        blockClips.push(clips[j]);
        j++;
      }
      renderGroups.push({
        type: 'multi',
        clips: blockClips,
        startIndex: i,
      });
      i = j;
    } else {
      // Sequential keyframe chain (P01, P02, P03, P04...)
      const seqClips: TimelinePositionClip[] = [current];
      let j = i + 1;
      while (j < clips.length && !clips[j].blockId) {
        if (current.mediaClipId && clips[j].mediaClipId && clips[j].mediaClipId !== current.mediaClipId) {
          break;
        }
        seqClips.push(clips[j]);
        j++;
      }
      renderGroups.push({
        type: 'multi',
        clips: seqClips,
        startIndex: i,
      });
      i = j;
    }
  }

  return (
    <div
      ref={trayRef}
      className="ui-camera-timeline-tray"
      onClick={() => {
        setShowEasingModal(false);
        setActiveTransitionPopover(null);
        setActiveMediaTransitionPopover(null);
      }}
    >
      {/* 1. Top Action Controls */}
      <div className="timeline-action-bar">
        <div className="timeline-left-section-container" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="timeline-tool-btn is-media-thumb"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMediaLibrary('select');
            }}
            title="Replace Media / Open Media Library"
          >
            <span
              className="thumb-mini-deck"
              style={
                mediaThumbnailUrl
                  ? { backgroundImage: `url(${mediaThumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : undefined
              }
            />
          </button>
          <div className="timeline-left-tools">
          <button
            type="button"
            className="timeline-tool-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCrop();
            }}
            title="Crop photo / video"
          >
            <Crop size={14} />
          </button>
          <button
            type="button"
            className={`timeline-tool-btn ${showEasingModal ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowEasingModal(!showEasingModal);
            }}
            title="Motion easing curve graph"
          >
            <Spline size={14} />
          </button>
          <button type="button" className="timeline-tool-btn" onClick={onResetScene} title="Reset camera angle">
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className={`timeline-tool-btn ${selectedTextLayerId ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleAddTextLayer();
            }}
            title="Add text overlay layer (T)"
            data-testid="add-text-layer-btn"
          >
            <Type size={14} />
          </button>
          <button
            type="button"
            className={`timeline-tool-btn ${isAudioManagerOpen ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsAudioManagerOpen(true);
            }}
            title="Add background music or SFX track"
            data-testid="add-audio-track-btn"
          >
            <Music size={14} />
          </button>
          <button
            type="button"
            className={`timeline-tool-btn ${canSplitMedia ? 'is-split-ready' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSplitMediaClip();
            }}
            disabled={!canSplitMedia}
            title={canSplitMedia ? "Split / Cut media clip at playhead (S)" : "Position playhead inside media clip to cut (S)"}
            data-testid="split-media-clip-btn"
          >
            <Scissors size={14} />
          </button>
          <button
            type="button"
            className="timeline-tool-btn"
            onClick={() => handleDeleteClip()}
            disabled={clips.length === 0}
            title={clips.length === 0 ? 'No clips to delete' : 'Delete selected camera clip'}
          >
            <Trash2 size={14} />
          </button>
        </div>
        </div>

        {/* Center Playback Controls */}
        <div
          className={`timeline-center-controls ${isGuideOpen && guidePhase === 'preview' ? 'guide-play-highlight-ring' : ''}`}
          style={{ position: 'relative' }}
        >
          <button type="button" className="timeline-playback-btn" onClick={() => onSeek(0)} title="Skip to Start">
            <SkipBack size={15} />
          </button>
          <button
            type="button"
            className={`timeline-playback-btn is-play-main ${isPlaying ? 'is-playing' : ''}`}
            onClick={() => {
              onPlayPause();
              if (isGuideOpen && guidePhase === 'preview' && onGuideAdvance) {
                onGuideAdvance();
              }
            }}
            title={isPlaying ? 'Pause Preview (Space)' : 'Play / Preview Animation (Space)'}
            data-testid="timeline-preview-btn"
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            <span className="timeline-preview-label">{isPlaying ? 'PAUSE' : 'PREVIEW'}</span>
          </button>
          {isGuideOpen && guidePhase === 'preview' && (
            <button
              type="button"
              className="reference-guide-pill play-guide-pill"
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
                if (onGuideAdvance) onGuideAdvance();
              }}
              title="Press Spacebar or Click Play to preview motion"
            >
              Press <strong>Space</strong> to preview
            </button>
          )}
        </div>

        {/* Right Actions: Export & Star on GitHub */}
        <div className="timeline-right-actions" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {/* Reference Style Guide Pill: Click to Export 60 FPS video */}
          {isGuideOpen && guidePhase === 'export' && (
            <button
              type="button"
              className="reference-guide-pill export-guide-pill"
              onClick={(e) => {
                e.stopPropagation();
                onExportVideo(exportFormat, exportFps);
                if (onGuideAdvance) onGuideAdvance();
              }}
              title="Click to render and download video"
            >
              Click to <strong>Export</strong> 60 FPS video
            </button>
          )}

          {/* Export Button */}
          <div className={`export-split-btn-group ${isGuideOpen && guidePhase === 'export' ? 'guide-export-highlight-ring' : ''}`}>
            <button
              type="button"
              className="timeline-export-btn"
              onClick={() => {
                onExportVideo(exportFormat, exportFps);
                if (isGuideOpen && guidePhase === 'export' && onGuideAdvance) {
                  onGuideAdvance();
                }
              }}
              disabled={isExporting}
              title={`Export as ${exportFormat.toUpperCase()} at ${exportFps} FPS`}
            >
              <Download size={14} />
              <span>{isExporting ? `${exportProgress}%` : `${exportFormat.toUpperCase()} • ${exportFps}fps`}</span>
            </button>
            <button
              type="button"
              className="timeline-format-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowFormatMenu(!showFormatMenu);
              }}
              disabled={isExporting}
              title="Export Settings (Format & Framerate)"
            >
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Support Creator link */}
          <a
            href="https://paypal.me/zetabyteIN"
            target="_blank"
            rel="noopener noreferrer"
            className="timeline-support-creator-link"
            title="Support Creator on PayPal (@zetabyteIN)"
          >
            <Heart size={11} stroke="currentColor" fill="none" />
            <span>Support Creator</span>
          </a>

          {showFormatMenu && (
            <div className="timeline-format-dropdown-menu">
              <div className="format-dropdown-section-title">FORMAT</div>
              <button
                type="button"
                className={`format-option-row ${exportFormat === 'mp4' ? 'is-active' : ''}`}
                onClick={() => {
                  onExportFormatChange('mp4');
                }}
              >
                <div className="format-option-content">
                  <span className="format-option-name">MP4 Video</span>
                  <small>High compatibility H.264</small>
                </div>
                {exportFormat === 'mp4' && <Check size={13} color="#818cf8" />}
              </button>
              <button
                type="button"
                className={`format-option-row ${exportFormat === 'webm' ? 'is-active' : ''}`}
                onClick={() => {
                  onExportFormatChange('webm');
                }}
              >
                <div className="format-option-content">
                  <span className="format-option-name">WEBM Video</span>
                  <small>VP9 / Web stream</small>
                </div>
                {exportFormat === 'webm' && <Check size={13} color="#818cf8" />}
              </button>

              <div className="format-dropdown-divider" />
              <div className="format-dropdown-section-title">FRAME RATE</div>
              <div className="format-fps-grid">
                {([24, 30, 60] as const).map((fpsVal) => (
                  <button
                    key={fpsVal}
                    type="button"
                    className={`fps-option-chip ${exportFps === fpsVal ? 'is-active' : ''}`}
                    onClick={() => {
                      if (onExportFpsChange) onExportFpsChange(fpsVal);
                    }}
                    title={`${fpsVal} Frames Per Second`}
                  >
                    <span>{fpsVal} FPS</span>
                    <small>{fpsVal === 24 ? 'Film' : fpsVal === 30 ? 'Web' : 'Smooth'}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EasingCurveModal
        isOpen={showEasingModal}
        onClose={() => setShowEasingModal(false)}
        values={easingValues}
        onChange={onEasingValuesChange}
      />

      <AudioManagerModal
        isOpen={isAudioManagerOpen}
        onClose={() => setIsAudioManagerOpen(false)}
        onAddTrack={(newTrack) => {
          const updated = [...(audioTracksRef.current || []), newTrack];
          onAudioTracksChange?.(updated);
          onSelectAudioTrack?.(newTrack.id);
        }}
        currentTimelineDuration={totalDuration}
        currentTime={currentTime}
      />

      {/* 2. Main Timeline Track */}
      <div className="timeline-track-container">
        <div 
          className="timeline-track-scroll-area" 
          ref={trackRef} 
          onMouseDown={handleTrackMouseDown} 
          style={{ position: 'relative', width: '100%' }}
        >
          {/* TOP ROW: Keyframe Blocks & Sequence Sets */}
          <div className="timeline-clips-track">
            {renderGroups.map((group, gIdx) => {
              if (group.type === 'multi') {
                const subClips = group.clips;
                const firstClip = subClips[0];
                const lastClip = subClips[subClips.length - 1];
                const seqDuration = Math.max(0.1, lastClip.startTime + (lastClip.duration ?? 0) - firstClip.startTime);
                const seqStart = firstClip.startTime;
                const seqLeftPct = (seqStart / rulerDuration) * 100;
                const seqWidthPct = Math.min(100 - seqLeftPct, (seqDuration / rulerDuration) * 100);
                const isBlue = subClips.some((c) => c.color === 'blue');

                return (
                  <div
                    key={`seq_multi_${gIdx}_${firstClip.id}`}
                    className={`sequence-capsule-container ${isBlue ? 'is-blue' : 'is-yellow'}`}
                    style={{
                      position: 'absolute',
                      left: `${seqLeftPct}%`,
                      width: `${seqWidthPct}%`,
                      minWidth: `${Math.max(48, Math.min(300, subClips.length * 28))}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Left Drag Handle */}
                    <div
                      className="sequence-drag-handle handle-left"
                      title="Drag to resize sequence duration"
                      onPointerDown={(e) =>
                        startSequenceResize(e, group.startIndex, subClips.length, seqStart, seqDuration, 'left')
                      }
                    />

                    {/* All Sub-blocks (P01, P02, P03, P04...) */}
                    {(() => {
                      const subClipTimes = getKeyframeTimesForGroup(subClips);
                      return subClips.map((subClip, subIdx) => {
                        const isFirst = subIdx === 0;
                        const isLast = subIdx === subClips.length - 1;
                        const isSelected = subClip.id === selectedClipId;
                        const isPairLast = subClips.length === 2 && isLast;
                        const isGuideP02Highlight = isGuideOpen && guidePhase === 'start' && isPairLast;
                        const seekTime = isLast
                          ? Number((firstClip.startTime + seqDuration).toFixed(2))
                          : (subClipTimes[subIdx] ?? subClip.startTime);

                        return (
                          <React.Fragment key={subClip.id}>
                          <div
                            className={`sequence-keyframe-subblock ${isSelected ? 'is-active-subblock' : ''} ${isGuideP02Highlight ? 'guide-subblock-highlight-ring' : ''}`}
                            style={{
                              flex: `${Math.max(0.2, subClip.duration || (seqDuration / subClips.length))} 1 0%`,
                              minWidth: 0,
                              overflow: 'hidden',
                              borderRight: !isLast ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                            }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(subClip.id);
                            onSeek(seekTime);
                          }}
                        >
                          {/* Start Transition Triangle on first subblock */}
                          {isFirst && (
                            <>
                              <button
                                type="button"
                                className={`clip-triangle-btn start-triangle ${subClip.transition && subClip.transition !== 'cut' ? 'has-transition' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTransitionPopover(
                                    activeTransitionPopover?.clipId === subClip.id && activeTransitionPopover?.type === 'start'
                                      ? null
                                      : { type: 'start', clipId: subClip.id }
                                  );
                                }}
                                title="Start Transition animation"
                              >
                                <span className="triangle-shape triangle-right-pointing" />
                              </button>

                              {activeTransitionPopover?.clipId === subClip.id && activeTransitionPopover?.type === 'start' && (
                                <div className="transition-popover-card" onClick={(e) => e.stopPropagation()}>
                                  <div className="popover-header-row">
                                    <span className="popover-title-label">TRANSITION</span>
                                    <span className="popover-current-name">
                                      {subClip.transition ? subClip.transition.charAt(0).toUpperCase() + subClip.transition.slice(1) : 'Cut'}
                                    </span>
                                    <button
                                      type="button"
                                      className="popover-trash-icon-btn"
                                      onClick={() => handleUpdateTransition(subClip.id, 'start', 'cut')}
                                      title="Reset transition"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                  <div className="popover-pills-row">
                                    {(['cut', 'gradient', 'blocks', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                                      const isCurrent = (subClip.transition || 'cut') === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          className={`transition-option-pill ${t === 'gradient' ? 'is-gradient-pill' : t === 'blocks' ? 'is-blocks-pill' : ''} ${isCurrent ? 'is-selected-pill' : ''}`}
                                          onClick={() => handleUpdateTransition(subClip.id, 'start', t)}
                                        >
                                          {t === 'blocks' ? '▦ BLOCKS' : t.toUpperCase()}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          <span className="clip-name-label" style={{ margin: isFirst ? '0 auto 0 8px' : isLast ? '0 8px 0 auto' : '0 auto' }}>
                            {subClip.name}
                          </span>

                          {/* Exit Transition Triangle on last subblock */}
                          {isLast && (
                            <>
                              <button
                                type="button"
                                className={`clip-triangle-btn exit-triangle ${subClip.exitTransition && subClip.exitTransition !== 'cut' ? 'has-transition' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTransitionPopover(
                                    activeTransitionPopover?.clipId === subClip.id && activeTransitionPopover?.type === 'exit'
                                      ? null
                                      : { type: 'exit', clipId: subClip.id }
                                  );
                                }}
                                title="Exit Transition animation"
                              >
                                <span className="triangle-shape triangle-left-pointing" />
                              </button>

                              {activeTransitionPopover?.clipId === subClip.id && activeTransitionPopover?.type === 'exit' && (
                                <div className="transition-popover-card is-exit-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="popover-header-row">
                                    <span className="popover-title-label">TRANSITION</span>
                                    <span className="popover-current-name">
                                      {subClip.exitTransition ? subClip.exitTransition.charAt(0).toUpperCase() + subClip.exitTransition.slice(1) : 'Cut'}
                                    </span>
                                    <button
                                      type="button"
                                      className="popover-trash-icon-btn"
                                      onClick={() => handleUpdateTransition(subClip.id, 'exit', 'cut')}
                                      title="Reset transition"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                  <div className="popover-pills-row">
                                    {(['cut', 'gradient', 'blocks', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                                      const isCurrent = (subClip.exitTransition || 'cut') === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          className={`transition-option-pill ${t === 'gradient' ? 'is-gradient-pill' : t === 'blocks' ? 'is-blocks-pill' : ''} ${isCurrent ? 'is-selected-pill' : ''}`}
                                          onClick={() => handleUpdateTransition(subClip.id, 'exit', t)}
                                        >
                                          {t === 'blocks' ? '▦ BLOCKS' : t.toUpperCase()}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          </div>

                          {/* Intra-Sequence Divider Drag Handle between sub-blocks */}
                          {!isLast && (
                            <div
                              className="sequence-divider-drag-handle"
                              title="Drag to adjust keyframe timing"
                              onPointerDown={(e) =>
                                startDividerResize(e, group.startIndex, subIdx, subClips)
                              }
                            />
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}

                    {/* Right Drag Handle */}
                    <div
                      className="sequence-drag-handle handle-right"
                      title="Drag to resize sequence duration"
                      onPointerDown={(e) =>
                        startSequenceResize(e, group.startIndex, subClips.length, seqStart, seqDuration, 'right')
                      }
                    />

                    {/* Reference Style Guide Pill: Click to set END position (matching Image 1) */}
                    {isGuideOpen && guidePhase === 'start' && subClips.length === 2 && (
                      <button
                        type="button"
                        className="reference-guide-pill timeline-guide-pill floating-guide-pill"
                        style={{
                          left: 'calc(100% + 10px)',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const p02 = subClips[1];
                          if (p02) {
                            onSelectClip(p02.id);
                            onSeek(Number((firstClip.startTime + seqDuration).toFixed(2)));
                            if (onGuideAdvance) onGuideAdvance();
                          }
                        }}
                        title="Click to select P02 and configure END camera angle"
                      >
                        Click to set <strong>END</strong> position
                      </button>
                    )}
                  </div>
                );
              } else if (group.type === 'single') {
                const c = group.clip;
                const dur = c.duration ?? 1.5;
                const leftPct = (c.startTime / rulerDuration) * 100;
                const widthPct = Math.min(100 - leftPct, (dur / rulerDuration) * 100);
                const isBlue = c.color === 'blue';

                return (
                  <div
                    key={`seq_single_${gIdx}`}
                    className={`sequence-capsule-container ${isBlue ? 'is-blue' : 'is-yellow'} is-single`}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '80px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(c.id);
                      onSeek(c.startTime);
                    }}
                  >
                    {/* Left Drag Handle */}
                    <div
                      className="sequence-drag-handle handle-left"
                      title="Drag to resize duration"
                      onPointerDown={(e) =>
                        startSequenceResize(e, group.index, 1, c.startTime, dur, 'left')
                      }
                    />

                    {/* Only Sub-block */}
                    <div className={`sequence-keyframe-subblock ${c.id === selectedClipId ? 'is-active-subblock' : ''}`}>
                      <button
                        type="button"
                        className={`clip-triangle-btn start-triangle ${c.transition && c.transition !== 'cut' ? 'has-transition' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTransitionPopover(
                            activeTransitionPopover?.clipId === c.id && activeTransitionPopover?.type === 'start'
                              ? null
                              : { type: 'start', clipId: c.id }
                          );
                        }}
                        title="Start Transition animation"
                      >
                        <span className="triangle-shape triangle-right-pointing" />
                      </button>

                      <span className="clip-name-label">{c.name}</span>

                      {/* Start Transition Popover */}
                      {activeTransitionPopover?.clipId === c.id && activeTransitionPopover?.type === 'start' && (
                        <div className="transition-popover-card" onClick={(e) => e.stopPropagation()}>
                          <div className="popover-header-row">
                            <span className="popover-title-label">TRANSITION</span>
                            <span className="popover-current-name">
                              {c.transition ? c.transition.charAt(0).toUpperCase() + c.transition.slice(1) : 'Cut'}
                            </span>
                            <button
                              type="button"
                              className="popover-trash-icon-btn"
                              onClick={() => handleUpdateTransition(c.id, 'start', 'cut')}
                              title="Reset transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="popover-pills-row">
                            {(['cut', 'gradient', 'blocks', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                              const isCurrent = (c.transition || 'cut') === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  className={`transition-option-pill ${t === 'gradient' ? 'is-gradient-pill' : t === 'blocks' ? 'is-blocks-pill' : ''} ${isCurrent ? 'is-selected-pill' : ''}`}
                                  onClick={() => handleUpdateTransition(c.id, 'start', t)}
                                >
                                  {t === 'blocks' ? '▦ BLOCKS' : t.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Drag Handle */}
                    <div
                      className="sequence-drag-handle handle-right"
                      title="Drag to resize duration"
                      onPointerDown={(e) =>
                        startSequenceResize(e, group.index, 1, c.startTime, dur, 'right')
                      }
                    />
                  </div>
                );
              }
            })}

            {/* Dotted Plus (+) Button to Add ONLY ONE Keyframe */}
            {(() => {
              let maxEnd = 0;
              for (const c of clips) {
                const end = (c.startTime || 0) + (c.duration || 0);
                if (end > maxEnd) maxEnd = end;
              }
              const addBtnLeft = Math.min(94, (maxEnd / rulerDuration) * 100);
              return (
                <button
                  type="button"
                  className="timeline-add-sequence-btn"
                  style={{
                    position: 'absolute',
                    left: `calc(${addBtnLeft}% + 8px)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSingleKeyframe();
                  }}
                  title="Add Next Keyframe Block"
                >
                  <Plus size={16} />
                </button>
              );
            })()}
          </div>

          {/* MIDDLE ROW: Layer-Based Text Overlays Track */}
          {textLayers && textLayers.length > 0 && (
            <div className="timeline-text-layers-track" data-testid="timeline-text-track">
              {textLayers.map((tLayer) => {
                const isSelected = tLayer.id === selectedTextLayerId;
                const leftPct = (tLayer.startTime / rulerDuration) * 100;
                const widthPct = Math.min(100 - leftPct, (tLayer.duration / rulerDuration) * 100);

                return (
                  <div
                    key={tLayer.id}
                    className={`text-layer-capsule ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '55px',
                    }}
                    onPointerDown={(e) => startTextLayerDrag(e, tLayer.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTextLayer?.(tLayer.id);
                      onSeek(tLayer.startTime);
                    }}
                    title={`Text: "${tLayer.text}" (${tLayer.duration.toFixed(1)}s) - Drag edges to stretch`}
                  >
                    {/* Left Stretch Handle */}
                    <div
                      className="sequence-drag-handle handle-left"
                      title="Drag to stretch / shift start time"
                      onPointerDown={(e) => startTextLayerResize(e, tLayer.id, 'left')}
                    />

                    <div className="text-layer-capsule-content">
                      <Type size={11} className="text-capsule-icon" />
                      <span className="text-capsule-label">{tLayer.text || 'Text Layer'}</span>
                      {(tLayer.inAnimation !== 'none' || tLayer.outAnimation !== 'none') && (
                        <span className="text-capsule-anim-tag">
                          {tLayer.inAnimation !== 'none' ? tLayer.inAnimation : ''}
                          {tLayer.inAnimation !== 'none' && tLayer.outAnimation !== 'none' ? ' · ' : ''}
                          {tLayer.outAnimation !== 'none' ? tLayer.outAnimation : ''}
                        </span>
                      )}
                    </div>

                    {/* Right Stretch Handle */}
                    <div
                      className="sequence-drag-handle handle-right"
                      title="Drag to stretch / adjust duration"
                      onPointerDown={(e) => startTextLayerResize(e, tLayer.id, 'right')}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* AUDIO TRACK (Background music / SFX) */}
          {audioTracks && audioTracks.length > 0 && (
            <div className="timeline-audio-track" data-testid="timeline-audio-track">
              {audioTracks.map((aTrack) => {
                const isSelected = aTrack.id === selectedAudioTrackId;
                const leftPct = (aTrack.startTime / rulerDuration) * 100;
                const widthPct = Math.min(100 - leftPct, (aTrack.duration / rulerDuration) * 100);

                const isVolumeOpen = activeVolumePopoverTrackId === aTrack.id;
                const volumeVal = aTrack.volume ?? 1.0;
                const volumePct = Math.round(volumeVal * 100);

                return (
                  <div
                    key={aTrack.id}
                    className={`audio-track-capsule ${aTrack.type === 'sfx' ? 'is-sfx' : ''} ${aTrack.isMuted ? 'is-muted' : ''} ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '70px',
                      zIndex: isVolumeOpen ? 60 : undefined,
                    }}
                    onPointerDown={(e) => startAudioTrackDrag(e, aTrack.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAudioTrack?.(aTrack.id);
                      onSeek(aTrack.startTime);
                      if (!aTrack.isMuted && aTrack.url) {
                        try {
                          const sample = new Audio(aTrack.url);
                          sample.volume = volumeVal;
                          sample.play().catch(() => {});
                          setTimeout(() => { sample.pause(); }, 1200);
                        } catch {}
                      }
                    }}
                    title={`Audio: "${aTrack.name}" (${aTrack.duration.toFixed(1)}s, ${volumePct}% vol) - Drag edges to stretch, drag center to move`}
                  >
                    {/* Left Stretch Handle */}
                    <div
                      className="sequence-drag-handle handle-left"
                      title="Drag to adjust start time"
                      onPointerDown={(e) => startAudioTrackResize(e, aTrack.id, 'left')}
                    />

                    <div className="audio-capsule-content">
                      <Music size={11} className="audio-capsule-icon" />
                      <span className="audio-capsule-label">{aTrack.name}</span>
                      <span className="audio-capsule-dur">{aTrack.duration.toFixed(1)}s</span>
                    </div>

                    {/* Volume Adjustment Button */}
                    <button
                      type="button"
                      className={`audio-action-btn audio-volume-btn ${isVolumeOpen ? 'is-active' : ''} ${aTrack.isMuted ? 'is-muted' : ''}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVolumePopoverTrackId((prev) => (prev === aTrack.id ? null : aTrack.id));
                      }}
                      title={aTrack.isMuted ? 'Unmute / Adjust Volume' : `Volume: ${volumePct}% (Click to adjust)`}
                    >
                      {aTrack.isMuted || volumeVal === 0 ? <VolumeX size={11} /> : <Volume2 size={11} />}
                    </button>

                    {/* Delete Audio Track Button */}
                    <button
                      type="button"
                      className="audio-action-btn audio-delete-btn"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeVolumePopoverTrackId === aTrack.id) {
                          setActiveVolumePopoverTrackId(null);
                        }
                        handleDeleteAudioTrack(aTrack.id);
                      }}
                      title="Delete audio track"
                    >
                      <Trash2 size={11} />
                    </button>

                    {/* Right Stretch Handle */}
                    <div
                      className="sequence-drag-handle handle-right"
                      title="Drag to adjust duration"
                      onPointerDown={(e) => startAudioTrackResize(e, aTrack.id, 'right')}
                    />

                    {/* Volume Popover Card */}
                    {isVolumeOpen && (
                      <div
                        className="audio-volume-popover-card"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="audio-volume-popover-header">
                          <span className="audio-volume-popover-title">Track Volume</span>
                          <span className="audio-volume-popover-value">{aTrack.isMuted ? 'Muted' : `${volumePct}%`}</span>
                          <button
                            type="button"
                            className="audio-volume-popover-close"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVolumePopoverTrackId(null);
                            }}
                            title="Close"
                          >
                            <X size={11} />
                          </button>
                        </div>

                        <div className="audio-volume-slider-row">
                          <button
                            type="button"
                            className={`volume-mute-toggle-btn ${aTrack.isMuted ? 'is-muted' : ''}`}
                            onClick={() => handleToggleMuteAudioTrack(aTrack.id)}
                            title={aTrack.isMuted ? 'Unmute' : 'Mute'}
                          >
                            {aTrack.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={aTrack.isMuted ? 0 : volumeVal}
                            className="audio-volume-slider"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (aTrack.isMuted && val > 0) {
                                handleToggleMuteAudioTrack(aTrack.id);
                              }
                              handleSetAudioTrackVolume(aTrack.id, val);
                            }}
                          />
                        </div>

                        <div className="audio-volume-presets-row">
                          {[
                            { label: '0%', val: 0 },
                            { label: '25%', val: 0.25 },
                            { label: '50%', val: 0.5 },
                            { label: '75%', val: 0.75 },
                            { label: '100%', val: 1.0 },
                          ].map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className={`audio-volume-preset-chip ${!aTrack.isMuted && Math.abs(volumeVal - p.val) < 0.03 ? 'is-active' : ''}`}
                              onClick={() => {
                                if (aTrack.isMuted && p.val > 0) {
                                  handleToggleMuteAudioTrack(aTrack.id);
                                }
                                handleSetAudioTrackVolume(aTrack.id, p.val);
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* BOTTOM ROW: Multi-Clip Media Track or Single Media Shot Strip */}
          {mediaClips && mediaClips.length > 0 ? (
            <div className="timeline-multiclip-track" data-testid="timeline-multiclip-track">
              {mediaClips.map((mClip, idx) => {
                const isSelected = mClip.id === selectedMediaClipId;
                const leftPct = (mClip.startTime / rulerDuration) * 100;
                const widthPct = Math.min(100 - leftPct, (mClip.duration / rulerDuration) * 100);

                return (
                  <React.Fragment key={mClip.id}>
                    {/* Transition junction badge between adjacent clips */}
                    {idx > 0 && (
                      <div
                        className="multiclip-transition-junction-container"
                        style={{ left: `${leftPct}%` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={`multiclip-transition-btn ${
                            mClip.transition && mClip.transition !== 'cut' ? 'has-transition' : ''
                          } ${mClip.transition === 'gradient' ? 'is-gradient-transition' : ''} ${
                            mClip.transition === 'blocks' ? 'is-blocks-transition' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMediaTransitionPopover(
                              activeMediaTransitionPopover?.clipId === mClip.id ? null : { clipId: mClip.id }
                            );
                          }}
                          title={`Transition to ${mClip.name}: ${mClip.transition || 'cut'} (${(mClip.transitionScope || 'canvas') === 'canvas' ? 'Fill Canvas' : 'Clip Only'})`}
                        >
                          {mClip.transition === 'gradient' ? (
                            <span className="transition-badge-fx-label">
                              ⚡ Grad{mClip.transitionScope === 'clip' ? ' • Clip' : ''}
                            </span>
                          ) : mClip.transition === 'blocks' ? (
                            <span className="transition-badge-fx-label">
                              ▦ Blocks{mClip.transitionScope === 'clip' ? ' • Clip' : ''}
                            </span>
                          ) : mClip.transition && mClip.transition !== 'cut' ? (
                            <span className="transition-badge-fx-label">
                              {mClip.transition.toUpperCase()}{mClip.transitionScope === 'clip' ? ' • Clip' : ''}
                            </span>
                          ) : (
                            <span className="transition-badge-cut-icon">⧗</span>
                          )}
                        </button>

                        {/* Media Transition Popover Card */}
                        {activeMediaTransitionPopover?.clipId === mClip.id && (
                          <div className="transition-popover-card is-media-transition-popover" onClick={(e) => e.stopPropagation()}>
                            <div className="popover-header-row">
                              <span className="popover-title-label">TRANSITION</span>
                              <span className="popover-current-name">
                                {mClip.transition ? mClip.transition.charAt(0).toUpperCase() + mClip.transition.slice(1) : 'Cut'}
                              </span>
                              <button
                                type="button"
                                className="popover-trash-icon-btn"
                                onClick={() => handleUpdateMediaTransition(mClip.id, 'cut')}
                                title="Reset transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div className="popover-pills-row">
                              {(['cut', 'gradient', 'blocks', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                                const isCurrent = (mClip.transition || 'cut') === t;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    className={`transition-option-pill ${t === 'gradient' ? 'is-gradient-pill' : t === 'blocks' ? 'is-blocks-pill' : ''} ${isCurrent ? 'is-selected-pill' : ''}`}
                                    onClick={() => handleUpdateMediaTransition(mClip.id, t)}
                                  >
                                    {t === 'blocks' ? '▦ BLOCKS' : t.toUpperCase()}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Coverage Selector: Fill Canvas vs Clip Only */}
                            {mClip.transition && mClip.transition !== 'cut' && (
                              <div className="popover-scope-section">
                                <div className="popover-scope-header">
                                  <span className="popover-scope-label">COVERAGE</span>
                                  <span className="popover-scope-sublabel">
                                    {(mClip.transitionScope || 'canvas') === 'canvas' ? 'Fill Canvas' : 'Clip Only'}
                                  </span>
                                </div>
                                <div className="popover-scope-pills-row">
                                  <button
                                    type="button"
                                    className={`transition-scope-pill ${(mClip.transitionScope || 'canvas') === 'canvas' ? 'is-selected-pill' : ''}`}
                                    onClick={() => handleUpdateMediaTransitionScope(mClip.id, 'canvas')}
                                    title="Fill entire canvas including stage and background"
                                  >
                                    ⛶ Fill Canvas
                                  </button>
                                  <button
                                    type="button"
                                    className={`transition-scope-pill ${mClip.transitionScope === 'clip' ? 'is-selected-pill' : ''}`}
                                    onClick={() => handleUpdateMediaTransitionScope(mClip.id, 'clip')}
                                    title="Constrain transition effect inside the clip / device frame only"
                                  >
                                    ◻ Clip Only
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`multiclip-card ${isSelected ? 'is-active-clip' : ''}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: '70px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMediaClip?.(mClip.id);
                        onSeek(mClip.startTime);
                      }}
                      title={`Clip: ${mClip.name} (${mClip.duration.toFixed(1)}s) - Drag edges to trim`}
                    >
                      {/* Left Trim Handle */}
                      <div
                        className="sequence-drag-handle handle-left"
                        title="Trim clip start"
                        onPointerDown={(e) => startMediaClipResize(e, mClip.id, 'left')}
                      />

                      <div className="multiclip-card-content">
                        <div
                          className="multiclip-thumb-preview"
                          style={
                            mClip.thumbnails?.[0] || (mClip.type === 'image' ? mClip.url : undefined)
                              ? { backgroundImage: `url(${mClip.thumbnails?.[0] || mClip.url})` }
                              : {}
                          }
                        >
                          {mClip.type === 'video' ? (
                            <Video size={10} color="#94a3b8" />
                          ) : (
                            <ImageIcon size={10} color="#94a3b8" />
                          )}
                        </div>
                        <span className="multiclip-card-name">{mClip.name}</span>
                        {isSelected ? (
                          <div className="multiclip-dur-stepper" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="multiclip-dur-step-btn"
                              title="Decrease duration by 0.5s"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNudgeMediaClipDuration(mClip.id, -0.5);
                              }}
                            >
                              -
                            </button>
                            <span className="multiclip-card-dur">{mClip.duration.toFixed(1)}s</span>
                            <button
                              type="button"
                              className="multiclip-dur-step-btn"
                              title="Increase duration by 0.5s"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNudgeMediaClipDuration(mClip.id, 0.5);
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="multiclip-card-dur">{mClip.duration.toFixed(1)}s</span>
                        )}
                      </div>

                      {mediaClips.length > 1 && (
                        <button
                          type="button"
                          className="multiclip-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMediaClip(mClip.id);
                          }}
                          title="Remove clip from sequence"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}

                      {/* Right Trim Handle */}
                      <div
                        className="sequence-drag-handle handle-right"
                        title="Trim clip duration"
                        onPointerDown={(e) => startMediaClipResize(e, mClip.id, 'right')}
                      />
                    </div>
                  </React.Fragment>
                );
              })}

              {/* + Add Clip Button at the end of clips */}
              {(() => {
                const lastClip = mediaClips[mediaClips.length - 1];
                const nextStart = lastClip ? lastClip.startTime + lastClip.duration : 0;
                const nextLeftPct = Math.min(94, (nextStart / rulerDuration) * 100);

                return (
                  <button
                    type="button"
                    className="multiclip-add-btn"
                    style={{ left: `${nextLeftPct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMediaLibrary('add');
                    }}
                    title="Add another video or image clip to sequence"
                  >
                    <Plus size={12} />
                    <span>Clip</span>
                  </button>
                );
              })()}
            </div>
          ) : (
            <div
              className="timeline-camera-shots-strip"
              style={{
                width: `${Math.max(3, Math.min(100, (mediaDuration / rulerDuration) * 100))}%`,
              }}
            >
              {Array.from({ length: Math.max(1, Math.round((mediaDuration / rulerDuration) * 13)) }).map((_, i) => {
                const thumb = mediaThumbnails && mediaThumbnails[i] ? mediaThumbnails[i] : mediaThumbnailUrl;
                return (
                  <div
                    key={i}
                    className="media-shot-card"
                    style={thumb ? { backgroundImage: `url(${thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {!thumb && <Video size={11} color="#64748b" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Red Playhead Line & Time Bubble */}
          <div className="timeline-red-playhead" style={{ left: `${progressPercent}%` }}>
            <div className="playhead-time-bubble">{currentTime.toFixed(1)}</div>
          </div>

          {/* Time Ruler Ticks (0s to 12s workspace view) */}
          <div className="timeline-time-ruler-row">
            {Array.from({ length: 13 }).map((_, i) => {
              const rawVal = (i / 12) * rulerDuration;
              const secVal = Math.round(rawVal).toString();
              return <span key={i}>{secVal}s</span>;
            })}
          </div>
        </div>
      </div>
      <div className="timeline-bottom-handle" />
    </div>
  );
};
