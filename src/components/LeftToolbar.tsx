import React from 'react';
import {
  Camera,
  Maximize,
  Crosshair,
  Crop,
  Move,
  MousePointer,
  Grid,
  Ruler,
  Shield,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';

export type CaptureMode = 'viewport' | 'fullpage' | 'element' | 'region';

interface LeftToolbarProps {
  captureMode: CaptureMode;
  onSelectCaptureMode: (mode: CaptureMode) => void;
  interactiveMode: boolean;
  onToggleInteractiveMode: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  onCenterCanvas: () => void;
  onResetTransform: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  captureMode,
  onSelectCaptureMode,
  interactiveMode,
  onToggleInteractiveMode,
  showRulers,
  onToggleRulers,
  showGuides,
  onToggleGuides,
  showSafeArea,
  onToggleSafeArea,
  onCenterCanvas,
  onResetTransform,
}) => {
  return (
    <div className="left-toolbar">
      {/* 1. Modes Section */}
      <div className="toolbar-group">
        <button
          className={`btn-icon ${captureMode === 'viewport' ? 'active' : ''}`}
          onClick={() => onSelectCaptureMode('viewport')}
          data-tooltip="Viewport Capture"
        >
          <Camera size={18} />
        </button>

        <button
          className={`btn-icon ${captureMode === 'fullpage' ? 'active' : ''}`}
          onClick={() => onSelectCaptureMode('fullpage')}
          data-tooltip="Full Page Stitch Capture"
        >
          <Maximize size={18} />
        </button>

        <button
          className={`btn-icon ${captureMode === 'element' ? 'active' : ''}`}
          onClick={() => onSelectCaptureMode('element')}
          data-tooltip="Element Inspector (E)"
        >
          <Crosshair size={18} />
        </button>

        <button
          className={`btn-icon ${captureMode === 'region' ? 'active' : ''}`}
          onClick={() => onSelectCaptureMode('region')}
          data-tooltip="Marquee Region Capture (R)"
        >
          <Crop size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* 2. Interaction Toggle */}
      <div className="toolbar-group">
        <button
          className={`btn-icon ${interactiveMode ? 'active' : ''}`}
          onClick={onToggleInteractiveMode}
          data-tooltip={interactiveMode ? 'Interactive Mode: ON (Click/Scroll Webpage) [I]' : 'Transform Mode: ON (Pan/Zoom Canvas) [I]'}
          style={interactiveMode ? { color: '#10b981', borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.15)' } : {}}
        >
          {interactiveMode ? <MousePointer size={18} /> : <Move size={18} />}
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* 3. Guides & View Utilities */}
      <div className="toolbar-group">
        <button
          className={`btn-icon ${showRulers ? 'active' : ''}`}
          onClick={onToggleRulers}
          data-tooltip="Toggle Pixel Rulers"
        >
          <Ruler size={17} />
        </button>

        <button
          className={`btn-icon ${showGuides ? 'active' : ''}`}
          onClick={onToggleGuides}
          data-tooltip="Toggle Snapping Guides"
        >
          <Grid size={17} />
        </button>

        <button
          className={`btn-icon ${showSafeArea ? 'active' : ''}`}
          onClick={onToggleSafeArea}
          data-tooltip="Toggle Safe Area Overlay"
        >
          <Shield size={17} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* 4. Canvas Positioning */}
      <div className="toolbar-group">
        <button
          className="btn-icon"
          onClick={onCenterCanvas}
          data-tooltip="Center Content"
        >
          <Layers size={17} />
        </button>

        <button
          className="btn-icon"
          onClick={onResetTransform}
          data-tooltip="Reset Zoom & Rotation"
        >
          <RotateCcw size={17} />
        </button>
      </div>
    </div>
  );
};
