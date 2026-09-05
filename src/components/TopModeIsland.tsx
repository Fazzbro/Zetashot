import React from 'react';
import { Sliders, Shuffle, Trash2, X } from 'lucide-react';

interface TopModeIslandProps {
  isComposeActive: boolean;
  onToggleCompose: () => void;
  onCloseCompose: () => void;
  onComposeMacro: () => void;
  isMarkingRegion: boolean;
  onToggleMarkingRegion: () => void;
  onClearRegions?: () => void;
  regionsCount: number;
  isGuideOpen?: boolean;
  guidePhase?: 'start' | 'end' | 'compose_operator' | 'compose_draw' | 'compose_action' | 'preview' | 'export' | 'complete';
  onGuideAdvance?: () => void;
}

export const TopModeIsland: React.FC<TopModeIslandProps> = ({
  isComposeActive,
  onToggleCompose,
  onCloseCompose,
  onComposeMacro,
  isMarkingRegion,
  onToggleMarkingRegion,
  onClearRegions,
  regionsCount,
  isGuideOpen = false,
  guidePhase = 'start',
  onGuideAdvance,
}) => {
  const isOperatorGuideActive = isGuideOpen && guidePhase === 'compose_operator';
  const isComposeGuideActive = isGuideOpen && (guidePhase === 'compose_action' || (isComposeActive && regionsCount > 0));

  if (!isComposeActive) {
    return (
      <div className="top-center-mode-island" style={{ position: 'relative' }}>
        <button
          type="button"
          className={`top-operator-pill-btn ${isOperatorGuideActive ? 'guide-operator-highlight-ring' : ''}`}
          onClick={() => {
            onToggleCompose();
            if (isOperatorGuideActive && onGuideAdvance) {
              onGuideAdvance();
            }
          }}
          title="Open Compose & Choreography Mode"
          aria-label="Open Compose Mode"
        >
          <Sliders size={14} className="top-operator-icon" />
          <span>Operator</span>
        </button>

        {isOperatorGuideActive && (
          <button
            type="button"
            className="reference-guide-pill operator-guide-pill"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompose();
              if (onGuideAdvance) onGuideAdvance();
            }}
            title="Click Operator to open Compose Mode"
          >
            Click <strong>Operator</strong> to open Compose
          </button>
        )}
      </div>
    );
  }

  // Unified Compose Pill matching user screenshot 1:
  // [ 🔀 Compose (Blue) ]  [ ⛶ ⁵ (Focus) ]  [ 🗑️ (Trash) ]  |  [ ✕ (Close) ]
  return (
    <div className="top-center-mode-island" style={{ position: 'relative' }}>
      <div className="unified-compose-island-pill" role="group" aria-label="Compose Mode Controls">
        {/* 1. Primary Vibrant Blue Compose Button */}
        <button
          type="button"
          className={`compose-primary-action-btn ${isComposeGuideActive ? 'guide-compose-highlight-ring' : ''}`}
          onClick={() => {
            onComposeMacro();
            if (isGuideOpen && onGuideAdvance) {
              onGuideAdvance();
            }
          }}
          title={
            regionsCount > 0
              ? `Choreograph motion through ${regionsCount} interest region${regionsCount > 1 ? 's' : ''}`
              : 'Generate automated camera choreography'
          }
        >
          <Shuffle size={16} className="compose-shuffle-icon" />
          <span className="compose-text-label">Compose</span>
        </button>

        {isComposeGuideActive && (
          <button
            type="button"
            className="reference-guide-pill compose-action-guide-pill"
            onClick={(e) => {
              e.stopPropagation();
              onComposeMacro();
              if (onGuideAdvance) onGuideAdvance();
            }}
            title="Click to choreograph camera motion"
          >
            Click <strong>Compose</strong> to animate
          </button>
        )}

        {/* 2. Target / Interest Region Focus Tool Button (Viewfinder icon with badge) */}
        <button
          type="button"
          className={`compose-target-tool-btn ${isMarkingRegion ? 'is-tool-active' : ''}`}
          onClick={onToggleMarkingRegion}
          title={
            isMarkingRegion
              ? 'Click to stop marking interest regions'
              : 'Click on media to add interest points / rectangular regions'
          }
          aria-pressed={isMarkingRegion}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="compose-focus-icon"
          >
            <path d="M4 8V6a2 2 0 0 1 2-2h2" />
            <path d="M16 4h2a2 2 0 0 1 2 2v2" />
            <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
            <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="2.5" fill="#ffffff" stroke="none" />
          </svg>
          {regionsCount > 0 && <span className="regions-count-badge">{regionsCount}</span>}
        </button>

        {/* 3. Delete / Clear Interest Regions Button */}
        <button
          type="button"
          className="compose-trash-tool-btn"
          onClick={onClearRegions}
          title="Clear all interest regions"
          aria-label="Clear all interest regions"
        >
          <Trash2 size={18} color="#cbd5e1" />
        </button>

        {/* 4. Subtle Vertical Divider */}
        <div className="compose-island-divider" />

        {/* 5. Close / Exit Compose Mode Button */}
        <button
          type="button"
          className="compose-close-pill-btn"
          onClick={onCloseCompose}
          title="Exit Compose Mode"
          aria-label="Exit Compose Mode"
        >
          <X size={18} color="#cbd5e1" />
        </button>
      </div>
    </div>
  );
};

