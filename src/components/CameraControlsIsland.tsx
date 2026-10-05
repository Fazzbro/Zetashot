import React, { useState, useEffect } from 'react';
import { CompassDial } from './CompassDial';
import { RulerSliderStrip } from './RulerSliderStrip';
import { BackgroundSelectorPill } from './BackgroundSelectorPill';
import { Camera3DState, PERSPECTIVE_PRESETS, PerspectivePreset } from '../utils/camera3D';
import { BackgroundConfig } from '../utils/gradientUtils';
import {
  Grid,
  Box,
  CornerDownRight,
  Layers,
  Move,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';

interface CameraControlsIslandProps {
  mode: 'photo' | 'video';
  onModeChange: (mode: 'photo' | 'video') => void;
  dragMode?: 'move' | 'orbit';
  onDragModeChange?: (mode: 'move' | 'orbit') => void;
  camera: Camera3DState;
  onCameraChange: (camera: Camera3DState) => void;
  background: BackgroundConfig;
  onBackgroundChange: (bg: BackgroundConfig) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  shadowDepth: 'none' | 'small' | 'medium' | 'large';
  onShadowDepthChange: (depth: 'none' | 'small' | 'medium' | 'large') => void;
  borderRadius: number;
  onBorderRadiusChange: (r: number) => void;
  blurAmount: number;
  onBlurChange: (b: number) => void;
  autoFocus: boolean;
  onAutoFocusChange: (af: boolean) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onCapture: () => void;
  isProcessing: boolean;
  isGuideOpen?: boolean;
  guidePhase?: 'start' | 'end' | 'compose_operator' | 'compose_draw' | 'compose_action' | 'preview' | 'export' | 'complete';
  selectedClipId?: string;
  onGuideAdvance?: () => void;
  onRulerActiveChange?: (active: boolean) => void;
}

export const CameraControlsIsland: React.FC<CameraControlsIslandProps> = ({
  mode,
  onModeChange,
  dragMode = 'move',
  onDragModeChange,
  camera,
  onCameraChange,
  background,
  onBackgroundChange,
  aspectRatio,
  onAspectRatioChange,
  shadowDepth,
  onShadowDepthChange,
  borderRadius,
  onBorderRadiusChange,
  blurAmount,
  onBlurChange,
  autoFocus,
  onAutoFocusChange,
  showGrid,
  onToggleGrid,
  onCapture,
  isProcessing,
  isGuideOpen = false,
  guidePhase = 'start',
  selectedClipId = 'P01',
  onGuideAdvance,
  onRulerActiveChange,
}) => {
  // activeSlider: null | 'blur' | 'perspective' | 'zoom'
  const [activeSlider, setActiveSlider] = useState<'blur' | 'perspective' | 'zoom' | null>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  useEffect(() => {
    onRulerActiveChange?.(activeSlider !== null);
  }, [activeSlider, onRulerActiveChange]);

  const togglePopover = (id: string) => {
    setActivePopover(activePopover === id ? null : id);
  };

  const handlePresetSelect = (preset: PerspectivePreset) => {
    onCameraChange({
      ...camera,
      rotX: preset.rotX,
      rotY: preset.rotY,
      rotZ: preset.rotZ,
      zoom: preset.zoom,
      panX: 0,
      panY: 0,
    });
    setActivePopover(null);
  };

  const cycleShadowDepth = () => {
    const depths: ('none' | 'small' | 'medium' | 'large')[] = ['none', 'small', 'medium', 'large'];
    const nextIdx = (depths.indexOf(shadowDepth) + 1) % depths.length;
    onShadowDepthChange(depths[nextIdx]);
  };

  const cycleAspectRatio = () => {
    const ratios = ['16:9', '4:3', '1:1', '9:16', '21:9'];
    const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
    onAspectRatioChange(ratios[nextIdx]);
  };

  return (
    <div className="bottom-studio-controls">
      <div className="bottom-chrome-row">
        {/* 1. PHOTO / VIDEO Toggle */}
        <div className="studio-mode-toggle" role="group" aria-label="Studio mode">
          <button
            type="button"
            className={mode === 'photo' ? 'is-active' : ''}
            onClick={() => onModeChange('photo')}
          >
            <span className="studio-mode-label">PHOTO</span>
          </button>
          <button
            type="button"
            className={mode === 'video' ? 'is-active' : ''}
            onClick={() => onModeChange('video')}
          >
            <span className="studio-mode-label">VIDEO</span>
          </button>
        </div>

        {/* Drag Tool Mode: Move vs Orbit */}
        {onDragModeChange && (
          <div className="studio-mode-toggle drag-tool-toggle" role="group" aria-label="Drag tool mode">
            <button
              type="button"
              className={dragMode === 'move' ? 'is-active' : ''}
              onClick={() => onDragModeChange('move')}
              title="Move / Pan Media (Drag preview to reposition, press V or hold Space)"
              aria-label="Move Media Tool"
            >
              <Move size={12} style={{ marginRight: '4px' }} />
              <span className="studio-mode-label">MOVE</span>
            </button>
            <button
              type="button"
              className={dragMode === 'orbit' ? 'is-active' : ''}
              onClick={() => onDragModeChange('orbit')}
              title="3D Orbit / Rotate Camera (Drag preview to rotate angles, or press R)"
              aria-label="3D Orbit Tool"
            >
              <RotateCw size={12} style={{ marginRight: '4px' }} />
              <span className="studio-mode-label">ORBIT</span>
            </button>
          </div>
        )}

        {/* 2. X, Y, Z Rotation Compass Dials */}
        <div
          className={`bottom-axis-controls ${isGuideOpen && (guidePhase === 'start' || guidePhase === 'end') ? 'guide-dials-highlight-ring' : ''}`}
          aria-label="Rotation controls"
        >
          <CompassDial
            axis="x"
            value={camera.rotX}
            onChange={(rotX) => onCameraChange({ ...camera, rotX })}
            onReset={() => onCameraChange({ ...camera, rotX: 0 })}
          />
          <CompassDial
            axis="y"
            value={camera.rotY}
            onChange={(rotY) => onCameraChange({ ...camera, rotY })}
            onReset={() => onCameraChange({ ...camera, rotY: 0 })}
          />
          <CompassDial
            axis="z"
            value={camera.rotZ}
            onChange={(rotZ) => onCameraChange({ ...camera, rotZ })}
            onReset={() => onCameraChange({ ...camera, rotZ: 0 })}
          />
        </div>

        {/* Reference Style Guide Pill: Set START / END position (matching Image 2) */}
        {isGuideOpen && guidePhase === 'start' && (
          <button
            type="button"
            className="reference-guide-pill dials-guide-pill"
            onClick={onGuideAdvance}
            title="Adjust camera angles to set START position, then click to proceed"
          >
            Set <strong>START</strong> position
          </button>
        )}

        {isGuideOpen && guidePhase === 'end' && (
          <button
            type="button"
            className="reference-guide-pill dials-guide-pill"
            onClick={onGuideAdvance}
            title="Click to confirm END position and preview animation"
          >
            Set <strong>END</strong> position
          </button>
        )}

        {/* 3. Horizontal Control Strip or Ruler Slider */}
        <div style={{ position: 'relative' }}>
          {activeSlider === 'blur' ? (
            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', zIndex: 100 }}>
              <RulerSliderStrip
                label="DEPTH BLUR"
                valueText={
                  blurAmount > 0
                    ? `ƒ ${(1.4 * Math.pow(2, ((50 - blurAmount) / 50) * 4)).toFixed(1)} · ${
                        blurAmount > 35 ? 'Cinema Bokeh' : blurAmount > 15 ? 'Optical Depth' : 'Subtle Lens'
                      }`
                    : 'OFF'
                }
                value={blurAmount}
                min={0}
                max={50}
                step={0.5}
                onChange={onBlurChange}
                onClose={() => setActiveSlider(null)}
              />
            </div>
          ) : activeSlider === 'perspective' ? (
            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', zIndex: 100 }}>
              <RulerSliderStrip
                label="PERSPECTIVE"
                valueText={`${Math.round(camera.perspective || 1000)}px`}
                value={camera.perspective || 1000}
                min={300}
                max={2500}
                step={50}
                onChange={(perspective) => onCameraChange({ ...camera, perspective: Math.round(perspective) })}
                onClose={() => setActiveSlider(null)}
              />
            </div>
          ) : activeSlider === 'zoom' ? (
            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', zIndex: 100 }}>
              <RulerSliderStrip
                label="ZOOM"
                valueText={`${(typeof camera?.zoom === "number" && !isNaN(camera.zoom) ? camera.zoom : 0.7).toFixed(1)}x`}
                value={typeof camera?.zoom === "number" && !isNaN(camera.zoom) ? camera.zoom : 0.7}
                min={0.25}
                max={2.5}
                step={0.05}
                onChange={(zoom) => onCameraChange({ ...camera, zoom })}
                onClose={() => setActiveSlider(null)}
              />
            </div>
          ) : null}

          <div className="top-settings-island">
            {/* Backdrop Color & Image Swatch Button */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={activePopover === 'backdrop' ? 'is-active' : ''}
                onClick={() => togglePopover('backdrop')}
                title="Backdrop color, color wheel & custom image"
                aria-label="Backdrop selector"
              >
                <span
                  className="island-background-icon"
                  style={{
                    background:
                      background.type === 'solid'
                        ? background.color
                        : background.type === 'image' && background.imageUrl
                        ? `url("${background.imageUrl}") center/cover no-repeat`
                        : 'linear-gradient(135deg, #6366f1, #ec4899)',
                  }}
                />
              </button>
            </span>

            {/* Grid Toggle */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={showGrid ? 'is-active' : ''}
                onClick={onToggleGrid}
                title="3x3 Framing Grid"
                aria-label="3x3 Framing Grid"
              >
                <Grid size={16} />
              </button>
            </span>

            {/* f-stop / Depth of Field Blur -> Opens Ruler */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={blurAmount > 0 || activeSlider === 'blur' ? 'is-active' : ''}
                onClick={() => setActiveSlider(activeSlider === 'blur' ? null : 'blur')}
                title="Depth of Field / Lens Blur Ruler"
                aria-label="Lens Blur Ruler"
              >
                <span className="top-lens-fstop">ƒ</span>
              </button>
            </span>

            {/* Zoom -> Opens Zoom Ruler */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={activeSlider === 'zoom' ? 'is-active' : ''}
                onClick={() => setActiveSlider(activeSlider === 'zoom' ? null : 'zoom')}
                title="Zoom level"
                aria-label="Zoom level"
              >
                <span className="island-zoom-icon">{(typeof camera?.zoom === "number" && !isNaN(camera.zoom) ? camera.zoom : 0.7).toFixed(1)}x</span>
              </button>
            </span>

            {/* 3D Perspective Scale Slider */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={activeSlider === 'perspective' ? 'is-active' : ''}
                onClick={() => setActiveSlider(activeSlider === 'perspective' ? null : 'perspective')}
                title="3D Perspective Scale Slider"
                aria-label="3D Perspective Scale Slider"
              >
                <Box size={16} />
              </button>
            </span>

            {/* Corner Rounding */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={activePopover === 'rounding' ? 'is-active' : ''}
                onClick={() => togglePopover('rounding')}
                title="Frame Corner Radius"
                aria-label="Frame Corner Radius"
              >
                <CornerDownRight size={15} />
              </button>
            </span>

            {/* 3D Box Shadow Depth */}
            <span className="top-setting-hit">
              <button
                type="button"
                className={shadowDepth !== 'none' ? 'is-active' : ''}
                onClick={cycleShadowDepth}
                title={`3D Box Shadow: ${shadowDepth.toUpperCase()}`}
                aria-label="3D Box Shadow"
              >
                <Layers size={16} />
              </button>
            </span>

            {/* Aspect Ratio */}
            <span className="top-setting-hit">
              <button
                type="button"
                onClick={cycleAspectRatio}
                title={`Canvas Aspect Ratio: ${aspectRatio}`}
                aria-label="Canvas Aspect Ratio"
              >
                <span className="island-ratio-icon">{aspectRatio}</span>
              </button>
            </span>
          </div>
        </div>

        {/* 4. Golden Shutter Button (only shown in Photo mode) */}
        {mode === 'photo' && (
          <span className="pill-capture-wrap">
            <button
              type="button"
              className={`pill-capture-button ${isProcessing ? 'is-busy' : ''}`}
              onClick={onCapture}
              disabled={isProcessing}
              title="Capture High-Res Photo"
              aria-label="Capture High-Res Photo"
            >
              <span className="pill-capture-shutter" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#000000', marginLeft: '4px' }}>
                {isProcessing ? 'SAVING...' : 'CAPTURE'}
              </span>
            </button>
          </span>
        )}
      </div>

      {/* FLOATING BACKDROP SELECTOR PILL (Matching Screenshot 2) */}
      {activePopover === 'backdrop' && (
        <BackgroundSelectorPill
          background={background}
          onBackgroundChange={onBackgroundChange}
          onClose={() => setActivePopover(null)}
        />
      )}

      {/* CORNER RADIUS POPOVER */}
      {activePopover === 'rounding' && (
        <div className="control-popover-panel" style={{ width: '200px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Frame Radius</span>
            <span>{borderRadius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="48"
            step="2"
            value={borderRadius}
            onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#ffffff' }}
            aria-label="Frame Radius Slider"
          />
        </div>
      )}
    </div>
  );
};
