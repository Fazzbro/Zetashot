import React, { useRef, useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Camera3DState } from '../utils/camera3D';
import { EasingCurveModal } from './EasingCurveModal';
import { CubicBezierValues } from '../utils/bezierSolver';
import { TransitionType } from '../utils/transitionMath';

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
  onOpenMediaLibrary: () => void;
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
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showEasingModal, setShowEasingModal] = useState(false);

  // Visible Timeline Ruler Duration: at least 12.0s by default for expansive workspace view
  const rulerDuration = Math.max(12.0, totalDuration || 12.0);

  // Popovers for Transitions
  const [activeTransitionPopover, setActiveTransitionPopover] = useState<{
    type: 'start' | 'exit';
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

        let accStart = initialStart;
        for (let s = 0; s < subCount; s++) {
          const clipIdx = groupStartIndex + s;
          if (!updated[clipIdx]) continue;

          if (subCount === 1) {
            updated[clipIdx].duration = newDuration;
          } else {
            const origDur = capturedClips[clipIdx]?.duration || (initialDuration / subCount);
            const ratio = initialDuration > 0 ? origDur / initialDuration : 1 / subCount;
            const isLastSub = s === subCount - 1;
            const sDur = isLastSub
              ? Math.max(0.2, Number((initialStart + newDuration - accStart).toFixed(2)))
              : Math.max(0.2, Number((newDuration * ratio).toFixed(2)));

            updated[clipIdx].startTime = Number(accStart.toFixed(2));
            updated[clipIdx].duration = sDur;
            accStart += sDur;
          }
        }

        // Shift downstream clips forward/backward by durationDelta
        for (let k = groupStartIndex + subCount; k < updated.length; k++) {
          updated[k].startTime = Math.max(0, Number((capturedClips[k].startTime + durationDelta).toFixed(2)));
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
      } else if (handle === 'left') {
        const minDuration = Math.max(0.4, subCount * 0.25);
        const maxDelta = initialDuration - minDuration;
        const clampedDelta = Math.min(maxDelta, Math.max(-initialStart, deltaSec));
        const newStart = Math.max(0, Number((initialStart + clampedDelta).toFixed(2)));
        const newDuration = Math.max(minDuration, Number((initialDuration - clampedDelta).toFixed(2)));

        let accStart = newStart;
        for (let s = 0; s < subCount; s++) {
          const clipIdx = groupStartIndex + s;
          if (!updated[clipIdx]) continue;

          if (subCount === 1) {
            updated[clipIdx].startTime = newStart;
            updated[clipIdx].duration = newDuration;
          } else {
            const origDur = capturedClips[clipIdx]?.duration || (initialDuration / subCount);
            const ratio = initialDuration > 0 ? origDur / initialDuration : 1 / subCount;
            const isLastSub = s === subCount - 1;
            const sDur = isLastSub
              ? Math.max(0.2, Number((newStart + newDuration - accStart).toFixed(2)))
              : Math.max(0.2, Number((newDuration * ratio).toFixed(2)));

            updated[clipIdx].startTime = Number(accStart.toFixed(2));
            updated[clipIdx].duration = sDur;
            accStart += sDur;
          }
        }

        onClipsChange(updated);
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
  }, [onClipsChange, onMediaDurationChange, onTotalDurationChange]);

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
    const leftInitialDur = capturedClips[leftIdx].duration || 1.5;
    const rightInitialDur = capturedClips[rightIdx].duration || 1.5;
    const combinedDur = leftInitialDur + rightInitialDur;
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

      const minDur = 0.3;
      const newLeftDur = Math.max(minDur, Math.min(combinedDur - minDur, Number((leftInitialDur + deltaSec).toFixed(2))));
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
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
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
    const lastClip = clips[clips.length - 1];
    const nextNum = clips.length + 1;
    const pad = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;

    const stepDur = 1.5;
    let newStartTime = 0;
    if (lastClip) {
      newStartTime = Number((lastClip.startTime + (lastClip.duration || stepDur)).toFixed(2));
    }

    // Default camera inherits previous keyframe angle
    const defaultCamera: Camera3DState = lastClip
      ? { ...lastClip.camera }
      : { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.7, panX: 0, panY: 0, perspective: 1000 };

    const newClip: TimelinePositionClip = {
      id: `P${pad}_${Date.now()}`,
      name: `P${pad}`,
      startTime: newStartTime,
      duration: stepDur,
      camera: defaultCamera,
      color: 'yellow',
      transition: 'cut',
      exitTransition: 'cut',
    };

    const updated = [...clips, newClip];
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
      className="ui-camera-timeline-tray"
      onClick={() => {
        setShowEasingModal(false);
        setActiveTransitionPopover(null);
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
              onOpenMediaLibrary();
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
            className="timeline-playback-btn is-play-main"
            onClick={() => {
              onPlayPause();
              if (isGuideOpen && guidePhase === 'preview' && onGuideAdvance) {
                onGuideAdvance();
              }
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
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
            <Heart size={11} fill="#ec4899" color="#ec4899" />
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
                      width: `${seqWidthPct}%`,
                      marginLeft: gIdx === 0 ? `${seqLeftPct}%` : '0%',
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
                    {subClips.map((subClip, subIdx) => {
                      const isFirst = subIdx === 0;
                      const isLast = subIdx === subClips.length - 1;
                      const isSelected = subClip.id === selectedClipId;
                      const isPairLast = subClips.length === 2 && isLast;
                      const isGuideP02Highlight = isGuideOpen && guidePhase === 'start' && isPairLast;
                      const seekTime = isPairLast
                        ? Number((firstClip.startTime + seqDuration).toFixed(2))
                        : subClip.startTime;

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
                                    {(['cut', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                                      const isCurrent = (subClip.transition || 'cut') === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          className={`transition-option-pill ${isCurrent ? 'is-selected-pill' : ''}`}
                                          onClick={() => handleUpdateTransition(subClip.id, 'start', t)}
                                        >
                                          {t.toUpperCase()}
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
                                    {(['cut', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                                      const isCurrent = (subClip.exitTransition || 'cut') === t;
                                      return (
                                        <button
                                          key={t}
                                          type="button"
                                          className={`transition-option-pill ${isCurrent ? 'is-selected-pill' : ''}`}
                                          onClick={() => handleUpdateTransition(subClip.id, 'exit', t)}
                                        >
                                          {t.toUpperCase()}
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
                    })}

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
                      width: `${widthPct}%`,
                      marginLeft: gIdx === 0 ? `${leftPct}%` : '0%',
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
                            {(['cut', 'fade', 'push', 'zoom'] as TransitionType[]).map((t) => {
                              const isCurrent = (c.transition || 'cut') === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  className={`transition-option-pill ${isCurrent ? 'is-selected-pill' : ''}`}
                                  onClick={() => handleUpdateTransition(c.id, 'start', t)}
                                >
                                  {t.toUpperCase()}
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
            <button
              type="button"
              className="timeline-add-sequence-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSingleKeyframe();
              }}
              title="Add Next Keyframe Block"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* BOTTOM ROW: Media Shots Strip (Width proportional to media duration e.g. 3s of 12s = 25%) */}
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
