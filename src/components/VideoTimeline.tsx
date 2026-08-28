import React, { useRef, useState, useEffect } from 'react';
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
  Star,
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
  onExportVideo: (format: 'mp4' | 'webm') => void;
  isExporting: boolean;
  exportProgress?: number;
  exportFormat: 'mp4' | 'webm';
  onExportFormatChange: (fmt: 'mp4' | 'webm') => void;
  onOpenCrop: () => void;
  onOpenMediaLibrary: () => void;
  easingValues: CubicBezierValues;
  onEasingValuesChange: (vals: CubicBezierValues) => void;
  onCompose?: () => void;
  onTotalDurationChange?: (duration: number) => void;
  mediaThumbnailUrl?: string;
  mediaThumbnails?: string[];
  mediaDuration?: number;
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
  onOpenCrop,
  onOpenMediaLibrary,
  easingValues,
  onEasingValuesChange,
  onCompose,
  onTotalDurationChange,
  mediaThumbnailUrl,
  mediaThumbnails,
  mediaDuration = 3.0,
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

  // Resizing state
  const [isResizing, setIsResizing] = useState<{
    clipIndex: number;
    subCount: number;
    initialBlockStart: number;
    initialBlockDuration: number;
    initialTotalDuration: number;
    startX: number;
    handle: 'left' | 'right';
  } | null>(null);
  
  const dragNewTotalRef = useRef<number | null>(null);

  // Handle Drag Resizing of Sequence / Keyframe Block
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      if (trackRect.width <= 0) return;
      const deltaX = e.clientX - isResizing.startX;
      const deltaSec = (deltaX / trackRect.width) * isResizing.initialTotalDuration;

      const updated = [...clips];
      const idx = isResizing.clipIndex;
      const subCount = isResizing.subCount;

      if (isResizing.handle === 'right') {
        const newTotal = Math.max(0.6, Math.min(60, Number((isResizing.initialBlockDuration + deltaSec).toFixed(2))));
        const numSteps = Math.max(1, subCount - 1);
        const step = Number((newTotal / numSteps).toFixed(2));
        const baseStart = isResizing.initialBlockStart;

        for (let s = 0; s < subCount; s++) {
          if (updated[idx + s]) {
            const isLastSub = s === subCount - 1;
            updated[idx + s] = {
              ...updated[idx + s],
              startTime: Number((baseStart + s * step).toFixed(2)),
              duration: (isLastSub && subCount > 1) ? 0 : step,
            };
          }
        }
        onClipsChange(updated);
        dragNewTotalRef.current = newTotal;
      } else {
        // Left handle: resize starting from left
        const newTotal = Math.max(0.6, Math.min(60, Number((isResizing.initialBlockDuration - deltaSec).toFixed(2))));
        const numSteps = Math.max(1, subCount - 1);
        const step = Number((newTotal / numSteps).toFixed(2));
        const newStart = Math.max(0, Number((isResizing.initialBlockStart + deltaSec).toFixed(2)));

        for (let s = 0; s < subCount; s++) {
          if (updated[idx + s]) {
            const isLastSub = s === subCount - 1;
            updated[idx + s] = {
              ...updated[idx + s],
              startTime: Number((newStart + s * step).toFixed(2)),
              duration: (isLastSub && subCount > 1) ? 0 : step,
            };
          }
        }
        onClipsChange(updated);
        dragNewTotalRef.current = newTotal;
      }
    };

    const handleMouseUp = () => {
      dragNewTotalRef.current = null;
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, clips, totalDuration, onClipsChange, onTotalDurationChange]);

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
    if (isResizing || !trackRef.current) return;
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
    onSelectClip(newClip.id);
    onSeek(newStartTime);
  };

  const handleDeleteClip = (idToDelete?: string) => {
    const targetId = idToDelete || selectedClipId;
    const updated = clips.filter((c) => c.id !== targetId);
    onClipsChange(updated);
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
        <div className="timeline-center-controls">
          <button type="button" className="timeline-playback-btn" onClick={() => onSeek(0)} title="Skip to Start">
            <SkipBack size={15} />
          </button>
          <button type="button" className="timeline-playback-btn is-play-main" onClick={onPlayPause} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>

        {/* Right Actions: Export & Star on GitHub */}
        <div className="timeline-right-actions" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {/* Export Button */}
          <div className="export-split-btn-group">
            <button
              type="button"
              className="timeline-export-btn"
              onClick={() => onExportVideo(exportFormat)}
              disabled={isExporting}
              title={`Export as ${exportFormat.toUpperCase()}`}
            >
              <Download size={14} />
              {isExporting ? `${exportProgress}%` : ''}
            </button>
            <button
              type="button"
              className="timeline-format-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowFormatMenu(!showFormatMenu);
              }}
              disabled={isExporting}
              title="Select video export format (MP4 or WEBM)"
            >
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Star on GitHub link */}
          <a
            href="https://github.com/Fazzbro/Zetashot"
            target="_blank"
            rel="noopener noreferrer"
            className="timeline-star-github-link"
            title="Star Zetashot on GitHub"
          >
            <Star size={11} fill="#eab308" color="#eab308" />
            <span>Star on GitHub</span>
          </a>

          {showFormatMenu && (
            <div className="timeline-format-dropdown-menu">
              <button
                type="button"
                className={`format-option-row ${exportFormat === 'mp4' ? 'is-active' : ''}`}
                onClick={() => {
                  onExportFormatChange('mp4');
                  setShowFormatMenu(false);
                }}
              >
                <span>MP4 Video</span>
                <small>High compatibility H.264</small>
              </button>
              <button
                type="button"
                className={`format-option-row ${exportFormat === 'webm' ? 'is-active' : ''}`}
                onClick={() => {
                  onExportFormatChange('webm');
                  setShowFormatMenu(false);
                }}
              >
                <span>WEBM Video</span>
                <small>VP9 / Web stream</small>
              </button>
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
                const isPair = subClips.length === 2 && !firstClip.blockId;
                const seqDuration = isPair
                  ? (firstClip.duration ?? 1.5) + (lastClip.duration ?? 1.5)
                  : Math.max(0.1, lastClip.startTime + (lastClip.duration ?? 0) - firstClip.startTime);
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
                      minWidth: `${Math.max(140, subClips.length * 60)}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Left Drag Handle */}
                    <div
                      className="sequence-drag-handle handle-left"
                      title="Drag to resize sequence duration"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsResizing({
                          clipIndex: group.startIndex,
                          subCount: subClips.length,
                          initialBlockStart: seqStart,
                          initialBlockDuration: seqDuration,
                          initialTotalDuration: rulerDuration,
                          startX: e.clientX,
                          handle: 'left',
                        });
                      }}
                    />

                    {/* All Sub-blocks (P01, P02, P03, P04...) */}
                    {subClips.map((subClip, subIdx) => {
                      const isFirst = subIdx === 0;
                      const isLast = subIdx === subClips.length - 1;
                      const isSelected = subClip.id === selectedClipId;
                      const seekTime = isPair && isLast
                        ? firstClip.startTime + seqDuration
                        : subClip.startTime;

                      return (
                        <div
                          key={subClip.id}
                          className={`sequence-keyframe-subblock ${isSelected ? 'is-active-subblock' : ''}`}
                          style={{
                            flex: 1,
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
                      );
                    })}

                    {/* Right Drag Handle */}
                    <div
                      className="sequence-drag-handle handle-right"
                      title="Drag to resize sequence duration"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsResizing({
                          clipIndex: group.startIndex,
                          subCount: subClips.length,
                          initialBlockStart: seqStart,
                          initialBlockDuration: seqDuration,
                          initialTotalDuration: rulerDuration,
                          startX: e.clientX,
                          handle: 'right',
                        });
                      }}
                    />
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
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsResizing({
                          clipIndex: group.index,
                          subCount: 1,
                          initialBlockStart: c.startTime,
                          initialBlockDuration: dur,
                          initialTotalDuration: rulerDuration,
                          startX: e.clientX,
                          handle: 'left',
                        });
                      }}
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
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsResizing({
                          clipIndex: group.index,
                          subCount: 1,
                          initialBlockStart: c.startTime,
                          initialBlockDuration: dur,
                          initialTotalDuration: rulerDuration,
                          startX: e.clientX,
                          handle: 'right',
                        });
                      }}
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
