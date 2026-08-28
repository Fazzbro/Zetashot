import React from 'react';
import {
  Camera,
  Video,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Folder,
  History,
  HelpCircle,
  Clapperboard,
  Play,
  Square,
  Pause,
} from 'lucide-react';
import { ProjectState } from '../utils/projectSerialization';

interface HeaderProps {
  project: ProjectState;
  onUpdateProjectName: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomPercent: (percent: number) => void;
  onOpenProjects: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  onCaptureScreenshot: () => void;
  isCapturing: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  recordingSeconds: number;
  onStartRecord: () => void;
  onPauseResumeRecord: () => void;
  onStopRecord: () => void;
  showTimeline: boolean;
  onToggleTimeline: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onUpdateProjectName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomPercent,
  onOpenProjects,
  onOpenHistory,
  onOpenShortcuts,
  onCaptureScreenshot,
  isCapturing,
  isRecording,
  isRecordingPaused,
  recordingSeconds,
  onStartRecord,
  onPauseResumeRecord,
  onStopRecord,
  showTimeline,
  onToggleTimeline,
}) => {
  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="app-header">
      {/* 1. Left Section: Logo & Project Management */}
      <div className="header-left">
        <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); onOpenProjects(); }}>
          <div className="brand-icon-wrapper">
            <Camera size={16} />
          </div>
          <span>OpenShot</span>
        </a>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />

        <input
          className="project-title-input"
          value={project.name}
          onChange={(e) => onUpdateProjectName(e.target.value)}
          placeholder="Untitled Project"
          title="Click to rename project"
        />

        <button className="btn-icon" onClick={onOpenProjects} data-tooltip="Projects (Open / Save)">
          <Folder size={15} />
        </button>

        <button className="btn-icon" onClick={onOpenHistory} data-tooltip="Capture History">
          <History size={15} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />

        {/* Undo / Redo */}
        <button className="btn-icon" onClick={onUndo} disabled={!canUndo} data-tooltip="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </button>
        <button className="btn-icon" onClick={onRedo} disabled={!canRedo} data-tooltip="Redo (Ctrl+Shift+Z)">
          <Redo2 size={15} />
        </button>
      </div>

      {/* 2. Center Section: Zoom & Canvas Scale */}
      <div className="header-center">
        <div className="segmented-control" style={{ padding: '1px 3px' }}>
          <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={onZoomOut} data-tooltip="Zoom Out (Ctrl -)">
            <ZoomOut size={13} />
          </button>

          <select
            value={Math.round(zoom * 100)}
            onChange={(e) => onZoomPercent(Number(e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '0 4px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
            <option value={300}>300%</option>
            <option value={400}>400%</option>
          </select>

          <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={onZoomIn} data-tooltip="Zoom In (Ctrl +)">
            <ZoomIn size={13} />
          </button>

          <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={onZoomFit} data-tooltip="Fit Canvas to Screen (Shift 1)">
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Presentation Timeline Toggle */}
        <button
          className={`btn-secondary ${showTimeline ? 'active' : ''}`}
          style={{ padding: '5px 10px', fontSize: '11px' }}
          onClick={onToggleTimeline}
        >
          <Clapperboard size={13} color="var(--accent-secondary)" />
          Timeline
        </button>
      </div>

      {/* 3. Right Section: Primary Actions (Screenshot & Record) */}
      <div className="header-right">
        <button className="btn-icon" onClick={onOpenShortcuts} data-tooltip="Shortcuts & Help (?)">
          <HelpCircle size={16} />
        </button>

        {/* Screenshot Button */}
        <button
          className="btn-primary"
          onClick={onCaptureScreenshot}
          disabled={isCapturing || isRecording}
        >
          <Camera size={14} />
          {isCapturing ? 'Capturing...' : 'Screenshot'}
        </button>

        {/* Video Recording Controls */}
        {!isRecording ? (
          <button className="btn-record" onClick={onStartRecord} disabled={isCapturing}>
            <Video size={14} />
            Record
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: 'var(--radius-sm)', padding: '2px 8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', animation: 'pulseRecording 1s infinite' }} />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#f43f5e', fontWeight: 600 }}>
              {formatSeconds(recordingSeconds)}
            </span>
            <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={onPauseResumeRecord} data-tooltip={isRecordingPaused ? 'Resume' : 'Pause'}>
              {isRecordingPaused ? <Play size={12} color="#f43f5e" /> : <Pause size={12} color="#f43f5e" />}
            </button>
            <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={onStopRecord} data-tooltip="Stop & Save Recording">
              <Square size={12} fill="#f43f5e" color="#f43f5e" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
