import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Trash2, Video, FastForward, RotateCcw, Clock, Sparkles } from 'lucide-react';
import { TimelineConfig, ProjectState } from '../utils/projectSerialization';
import { KeyframePoint, EasingType, interpolateKeyframe } from '../utils/easing';

interface TimelinePanelProps {
  timeline: TimelineConfig;
  onChange: (timeline: TimelineConfig) => void;
  currentZoom: number;
  currentPan: { x: number; y: number };
  currentRotation: number;
  onApplyTransform: (x: number, y: number, zoom: number, rotation: number) => void;
  onRecordPresentation: () => void;
  isRecording: boolean;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  timeline,
  onChange,
  currentZoom,
  currentPan,
  currentRotation,
  onApplyTransform,
  onRecordPresentation,
  isRecording,
}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastPlayTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastPlayTimeRef.current;
      lastPlayTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= timeline.duration) {
          setIsPlaying(false);
          return timeline.duration;
        }

        // Interpolate transform and update canvas
        const state = interpolateKeyframe(timeline.keyframes, next);
        onApplyTransform(state.x, state.y, state.zoom, state.rotation);

        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, timeline.duration, timeline.keyframes, onApplyTransform]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const time = Math.round(percent * timeline.duration);

    setCurrentTime(time);
    const state = interpolateKeyframe(timeline.keyframes, time);
    onApplyTransform(state.x, state.y, state.zoom, state.rotation);
  };

  const handleAddKeyframe = () => {
    const newKf: KeyframePoint = {
      id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: currentTime,
      x: currentPan.x,
      y: currentPan.y,
      zoom: currentZoom,
      rotation: currentRotation,
      easing: 'easeInOut',
    };

    const keyframes = [...timeline.keyframes.filter((k) => Math.abs(k.time - currentTime) > 50), newKf].sort(
      (a, b) => a.time - b.time
    );

    onChange({ ...timeline, keyframes });
    setSelectedKeyframeId(newKf.id);
  };

  const handleDeleteKeyframe = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeline.keyframes.length <= 1) return;
    const keyframes = timeline.keyframes.filter((k) => k.id !== id);
    onChange({ ...timeline, keyframes });
    if (selectedKeyframeId === id) setSelectedKeyframeId(null);
  };

  const handleEasingChange = (easing: EasingType) => {
    if (!selectedKeyframeId) return;
    const keyframes = timeline.keyframes.map((k) =>
      k.id === selectedKeyframeId ? { ...k, easing } : k
    );
    onChange({ ...timeline, keyframes });
  };

  const selectedKf = timeline.keyframes.find((k) => k.id === selectedKeyframeId);
  const progressPercent = (currentTime / timeline.duration) * 100;

  return (
    <div className="timeline-container">
      {/* Timeline Controls Header */}
      <div className="timeline-header">
        <div className="timeline-controls-left">
          <button
            className="btn-icon"
            onClick={() => {
              if (currentTime >= timeline.duration) setCurrentTime(0);
              setIsPlaying(!isPlaying);
            }}
            data-tooltip={isPlaying ? 'Pause (Space)' : 'Play Preview (Space)'}
          >
            {isPlaying ? <Pause size={15} color="#f43f5e" /> : <Play size={15} color="var(--accent-primary)" />}
          </button>

          <button
            className="btn-icon"
            onClick={() => {
              setCurrentTime(0);
              const state = interpolateKeyframe(timeline.keyframes, 0);
              onApplyTransform(state.x, state.y, state.zoom, state.rotation);
            }}
            data-tooltip="Reset to Start"
          >
            <RotateCcw size={14} />
          </button>

          <div className="timeline-time-display">
            {(currentTime / 1000).toFixed(2)}s / {(timeline.duration / 1000).toFixed(1)}s
          </div>

          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleAddKeyframe}>
            <Plus size={13} color="var(--accent-primary)" />
            Add Keyframe
          </button>
        </div>

        {/* Center / Right Keyframe Controls */}
        <div className="timeline-controls-right">
          {selectedKf ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Easing:</span>
              <select
                value={selectedKf.easing}
                onChange={(e) => handleEasingChange(e.target.value as EasingType)}
                style={{ padding: '2px 6px', fontSize: '11px' }}
              >
                <option value="easeInOut">Ease In Out</option>
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="smooth">Smooth Spring</option>
              </select>
              <button
                className="btn-icon"
                style={{ width: '24px', height: '24px', color: '#f43f5e' }}
                onClick={(e) => handleDeleteKeyframe(selectedKf.id, e)}
                data-tooltip="Delete Keyframe"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click a keyframe diamond to edit easing</span>
          )}

          <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />

          {/* Duration Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}>
            <Clock size={12} color="var(--text-muted)" />
            <select
              value={timeline.duration}
              onChange={(e) => onChange({ ...timeline, duration: Number(e.target.value) })}
              style={{ padding: '2px 6px', fontSize: '11px' }}
            >
              <option value={2000}>2.0s</option>
              <option value={4000}>4.0s</option>
              <option value={6000}>6.0s</option>
              <option value={8000}>8.0s</option>
              <option value={12000}>12.0s</option>
            </select>
          </div>

          <button
            className={`btn-primary ${isRecording ? 'recording' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={onRecordPresentation}
            disabled={isRecording}
          >
            <Video size={13} />
            {isRecording ? 'Recording Presentation...' : 'Record Presentation'}
          </button>
        </div>
      </div>

      {/* Timeline Visual Track */}
      <div className="timeline-body">
        <div className="timeline-track" ref={trackRef} onClick={handleTrackClick}>
          {/* Time ticks */}
          <div className="timeline-time-ruler">
            <span>0.0s</span>
            <span>{(timeline.duration / 4000).toFixed(1)}s</span>
            <span>{(timeline.duration / 2000).toFixed(1)}s</span>
            <span>{((timeline.duration * 3) / 4000).toFixed(1)}s</span>
            <span>{(timeline.duration / 1000).toFixed(1)}s</span>
          </div>

          {/* Playhead Marker */}
          <div className="timeline-playhead" style={{ left: `${progressPercent}%` }}>
            <div className="playhead-handle" />
          </div>

          {/* Keyframe Markers */}
          {timeline.keyframes.map((kf) => {
            const leftPct = (kf.time / timeline.duration) * 100;
            const isSelected = kf.id === selectedKeyframeId;

            return (
              <div
                key={kf.id}
                className={`keyframe-marker ${isSelected ? 'selected' : ''}`}
                style={{ left: `${leftPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedKeyframeId(kf.id);
                  setCurrentTime(kf.time);
                  onApplyTransform(kf.x, kf.y, kf.zoom, kf.rotation);
                }}
              >
                {isSelected && (
                  <div className="keyframe-info-tooltip">
                    {(kf.time / 1000).toFixed(1)}s • {Math.round(kf.zoom * 100)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
