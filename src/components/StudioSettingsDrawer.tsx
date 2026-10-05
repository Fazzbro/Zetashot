import React, { useRef } from 'react';
import {
  X,
  SlidersHorizontal,
  Maximize2,
  Grid,
  Sun,
  Moon,
  Video,
  Camera,
  Layers,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Crop,
  Upload,
  FolderOpen,
  RotateCcw,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';
import { BackgroundConfig } from '../utils/gradientUtils';
import { Camera3DState } from '../utils/camera3D';
import { MediaItem } from './MediaLibraryModal';
import { PRESET_BACKGROUND_IMAGES } from './BackgroundSelectorPill';
import { CAMERA_PRESET_ITEMS } from '../utils/cameraPresets';

export type SettingsTab = 'canvas' | 'camera' | 'device' | 'style' | 'export';

interface StudioSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;

  // 1. Canvas
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  background: BackgroundConfig;
  onBackgroundChange: (bg: BackgroundConfig) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;

  // 2. Camera
  camera: Camera3DState;
  onCameraChange: (cam: Camera3DState) => void;
  dragMode: 'move' | 'orbit';
  onDragModeChange: (mode: 'move' | 'orbit') => void;
  blurAmount: number;
  onBlurChange: (b: number) => void;
  autoFocus: boolean;
  onAutoFocusChange: (af: boolean) => void;
  onApplyPreset: (presetId: string) => void;
  onResetCamera: () => void;

  // 3. Device & Media
  activeMedia: MediaItem;
  onOpenMediaLibrary: () => void;
  onUploadFile: (file: File) => void;
  onOpenCrop: () => void;

  // 4. Style
  borderRadius: number;
  onBorderRadiusChange: (r: number) => void;
  shadowDepth: 'none' | 'small' | 'medium' | 'large';
  onShadowDepthChange: (depth: 'none' | 'small' | 'medium' | 'large') => void;
  soundEnabled: boolean;
  onSoundEnabledChange: (s: boolean) => void;

  // 5. Export
  exportFormat: 'mp4' | 'webm';
  onExportFormatChange: (fmt: 'mp4' | 'webm') => void;
  exportFps: 24 | 30 | 60;
  onExportFpsChange: (fps: 24 | 30 | 60) => void;
  isProcessing: boolean;
  exportProgress: number;
  onExport: () => void;
  onCapturePhoto: () => void;
}

export const StudioSettingsDrawer: React.FC<StudioSettingsDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  aspectRatio,
  onAspectRatioChange,
  background,
  onBackgroundChange,
  showGrid,
  onToggleGrid,
  theme,
  onThemeChange,
  camera,
  onCameraChange,
  dragMode,
  onDragModeChange,
  blurAmount,
  onBlurChange,
  autoFocus,
  onAutoFocusChange,
  onApplyPreset,
  onResetCamera,
  activeMedia,
  onOpenMediaLibrary,
  onUploadFile,
  onOpenCrop,
  borderRadius,
  onBorderRadiusChange,
  shadowDepth,
  onShadowDepthChange,
  soundEnabled,
  onSoundEnabledChange,
  exportFormat,
  onExportFormatChange,
  exportFps,
  onExportFpsChange,
  isProcessing,
  exportProgress,
  onExport,
  onCapturePhoto,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const ASPECT_RATIO_OPTIONS = [
    { id: '16:9', label: '16:9', subtitle: 'Landscape / YouTube', width: '16', height: '9' },
    { id: '9:16', label: '9:16', subtitle: 'Reels / TikTok / Shorts', width: '9', height: '16' },
    { id: '1:1', label: '1:1', subtitle: 'Square Feed', width: '1', height: '1' },
    { id: '4:3', label: '4:3', subtitle: 'Standard Desktop', width: '4', height: '3' },
    { id: '21:9', label: '21:9', subtitle: 'Cinematic Ultrawide', width: '21', height: '9' },
  ];

  return (
    <div className="studio-settings-backdrop" onClick={onClose}>
      <aside
        className="studio-settings-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Studio Settings Hierarchy"
      >
        {/* DRAWER HEADER */}
        <header className="settings-drawer-header">
          <div className="settings-header-title">
            <SlidersHorizontal size={18} className="settings-header-icon" />
            <div>
              <h3>Studio Settings</h3>
              <p>Configure canvas, 3D camera, media & render</p>
            </div>
          </div>
          <button
            type="button"
            className="settings-drawer-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </header>

        {/* TOP SEGMENTED NAVIGATION TABS */}
        <nav className="settings-tabs-bar" aria-label="Settings categories">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'canvas' ? 'is-active' : ''}`}
            onClick={() => onTabChange('canvas')}
          >
            <Maximize2 size={14} />
            <span>Canvas</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'camera' ? 'is-active' : ''}`}
            onClick={() => onTabChange('camera')}
          >
            <Camera size={14} />
            <span>Camera</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'device' ? 'is-active' : ''}`}
            onClick={() => onTabChange('device')}
          >
            <Layers size={14} />
            <span>Device</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'style' ? 'is-active' : ''}`}
            onClick={() => onTabChange('style')}
          >
            <Sparkles size={14} />
            <span>Styling</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'export' ? 'is-active' : ''}`}
            onClick={() => onTabChange('export')}
          >
            <Zap size={14} />
            <span>Export</span>
          </button>
        </nav>

        {/* TAB BODY */}
        <div className="settings-drawer-body">
          {/* TAB 1: CANVAS & STAGE */}
          {activeTab === 'canvas' && (
            <div className="settings-section-stack">
              {/* Aspect Ratio */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Aspect Ratio</h4>
                  <span className="settings-badge">{aspectRatio}</span>
                </div>
                <div className="settings-grid-ratios">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`settings-ratio-card ${aspectRatio === opt.id ? 'is-selected' : ''}`}
                      onClick={() => onAspectRatioChange(opt.id)}
                    >
                      <span className="ratio-title">{opt.label}</span>
                      <span className="ratio-sub">{opt.subtitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper & Backdrop */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Backdrop & Wallpapers</h4>
                  <span className="settings-badge">
                    {background.type === 'solid' ? background.color : 'Wallpaper'}
                  </span>
                </div>

                <div className="settings-wallpaper-scroll">
                  {PRESET_BACKGROUND_IMAGES.map((img) => {
                    const isSelected = background.type === 'image' && background.imageUrl === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        className={`settings-wallpaper-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() =>
                          onBackgroundChange({
                            type: 'image',
                            imageUrl: img.url,
                            imageFit: 'cover',
                            position: img.position || { x: 50, y: 50 },
                            imageScale: img.imageScale || 1.0,
                          })
                        }
                      >
                        <img src={img.url} alt={img.name} loading="lazy" />
                        <span className="wallpaper-label">{img.name}</span>
                        {isSelected && <span className="wallpaper-check"><Check size={12} /></span>}
                      </button>
                    );
                  })}
                </div>

                {/* Solid Color Palette */}
                <div className="settings-color-row">
                  <span className="settings-row-label">Solid Color:</span>
                  <div className="settings-color-chips">
                    {[
                      { hex: '#09090b', label: 'Dark Void' },
                      { hex: '#18181b', label: 'Zinc' },
                      { hex: '#ffffff', label: 'Pure White' },
                      { hex: '#f4f4f5', label: 'Light Studio' },
                      { hex: '#3b82f6', label: 'Blue' },
                      { hex: '#8b5cf6', label: 'Purple' },
                      { hex: '#ec4899', label: 'Pink' },
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        className={`settings-color-chip ${
                          background.type === 'solid' && background.color === col.hex ? 'is-selected' : ''
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                        onClick={() => onBackgroundChange({ type: 'solid', color: col.hex })}
                      />
                    ))}
                    <button
                      type="button"
                      className="settings-custom-color-chip"
                      title="Custom color picker"
                      onClick={() => colorPickerRef.current?.click()}
                    >
                      <span>Custom</span>
                    </button>
                    <input
                      ref={colorPickerRef}
                      type="color"
                      style={{ display: 'none' }}
                      value={background.color || '#09090b'}
                      onChange={(e) => onBackgroundChange({ type: 'solid', color: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Framing & Theme */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Framing & Studio Environment</h4>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-text">
                    <span className="toggle-title">3x3 Rule-of-Thirds Grid</span>
                    <span className="toggle-desc">Overlay visual alignment guides on stage</span>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch ${showGrid ? 'is-on' : ''}`}
                    onClick={onToggleGrid}
                    aria-label="Toggle framing grid"
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>

                <div className="settings-toggle-row">
                  <div className="settings-toggle-text">
                    <span className="toggle-title">Studio Workspace Theme</span>
                    <span className="toggle-desc">High-contrast desk appearance</span>
                  </div>
                  <div className="settings-segmented-group">
                    <button
                      type="button"
                      data-testid="theme-dark-btn"
                      className={`segmented-opt ${theme === 'dark' ? 'is-active' : ''}`}
                      onClick={() => onThemeChange('dark')}
                    >
                      <Moon size={13} />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      data-testid="theme-light-btn"
                      className={`segmented-opt ${theme === 'light' ? 'is-active' : ''}`}
                      onClick={() => onThemeChange('light')}
                    >
                      <Sun size={13} />
                      <span>Light</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAMERA & MOTION */}
          {activeTab === 'camera' && (
            <div className="settings-section-stack">
              {/* Presets */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Camera Movement Presets</h4>
                  <button type="button" className="settings-ghost-action" onClick={onResetCamera}>
                    <RotateCcw size={12} />
                    <span>Reset 0°</span>
                  </button>
                </div>
                <div className="settings-presets-grid">
                  {CAMERA_PRESET_ITEMS.slice(0, 8).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="settings-preset-chip"
                      onClick={() => onApplyPreset(preset.id)}
                    >
                      <span className="preset-name">{preset.name}</span>
                      <span className="preset-desc">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Rotations */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>3D Camera Angles</h4>
                  <div className="settings-segmented-group">
                    <button
                      type="button"
                      className={`segmented-opt ${dragMode === 'orbit' ? 'is-active' : ''}`}
                      onClick={() => onDragModeChange('orbit')}
                    >
                      <span>Orbit 3D</span>
                    </button>
                    <button
                      type="button"
                      className={`segmented-opt ${dragMode === 'move' ? 'is-active' : ''}`}
                      onClick={() => onDragModeChange('move')}
                    >
                      <span>Pan Move</span>
                    </button>
                  </div>
                </div>

                {/* Pitch X */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Pitch (Vertical Tilt)</span>
                    <span className="slider-val-badge">{(camera?.rotX || 0).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={camera?.rotX || 0}
                    onChange={(e) => onCameraChange({ ...camera, rotX: Number(e.target.value) })}
                    className="settings-range-input"
                  />
                </div>

                {/* Yaw Y */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Yaw (Horizontal Turn)</span>
                    <span className="slider-val-badge">{(camera?.rotY || 0).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-75}
                    max={75}
                    step={1}
                    value={camera?.rotY || 0}
                    onChange={(e) => onCameraChange({ ...camera, rotY: Number(e.target.value) })}
                    className="settings-range-input"
                  />
                </div>

                {/* Roll Z */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Roll (Dutch Angle)</span>
                    <span className="slider-val-badge">{(camera?.rotZ || 0).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={camera?.rotZ || 0}
                    onChange={(e) => onCameraChange({ ...camera, rotZ: Number(e.target.value) })}
                    className="settings-range-input"
                  />
                </div>
              </div>

              {/* Optics & Lens */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Optics & Focal Lens</h4>
                </div>

                {/* Zoom */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Optical Zoom</span>
                    <span className="slider-val-badge">{(camera?.zoom || 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={2.5}
                    step={0.05}
                    value={camera?.zoom || 1.0}
                    onChange={(e) => onCameraChange({ ...camera, zoom: Number(e.target.value) })}
                    className="settings-range-input"
                  />
                </div>

                {/* Perspective */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Perspective (Focal Length)</span>
                    <span className="slider-val-badge">{(camera?.perspective || 1000).toFixed(0)}px</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={1400}
                    step={25}
                    value={camera?.perspective || 1000}
                    onChange={(e) => onCameraChange({ ...camera, perspective: Number(e.target.value) })}
                    className="settings-range-input"
                  />
                </div>

                {/* Depth Blur */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Depth of Field (Tilt-Shift Blur)</span>
                    <span className="slider-val-badge">{blurAmount > 0 ? `ƒ ${(blurAmount / 10).toFixed(1)}` : 'Off'}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={blurAmount}
                    onChange={(e) => onBlurChange(Number(e.target.value))}
                    className="settings-range-input"
                  />
                </div>

                {/* Cursor Follower */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-text">
                    <span className="toggle-title">Cursor Follower Laser Focus</span>
                    <span className="toggle-desc">Dynamic yellow follower tracker on mockup</span>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch ${autoFocus ? 'is-on' : ''}`}
                    onClick={() => onAutoFocusChange(!autoFocus)}
                    aria-label="Toggle cursor tracker"
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEVICE & MEDIA */}
          {activeTab === 'device' && (
            <div className="settings-section-stack">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Active Media Subject</h4>
                  <span className="settings-badge">{activeMedia.type.toUpperCase()}</span>
                </div>

                <div className="settings-media-summary-card">
                  <div className="media-preview-box">
                    {activeMedia.type === 'image' ? (
                      <img src={activeMedia.url} alt={activeMedia.name} />
                    ) : (
                      <div className="media-placeholder-icon">
                        <Video size={24} />
                      </div>
                    )}
                  </div>
                  <div className="media-summary-info">
                    <span className="media-filename">{activeMedia.name}</span>
                    <span className="media-type-tag">Type: {activeMedia.type}</span>
                  </div>
                </div>

                <div className="settings-action-buttons-grid">
                  <button
                    type="button"
                    className="settings-primary-action-btn"
                    onClick={() => {
                      onClose();
                      onOpenMediaLibrary();
                    }}
                  >
                    <FolderOpen size={14} />
                    <span>Open Media Library</span>
                  </button>

                  <button
                    type="button"
                    className="settings-secondary-action-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>Upload New File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".fbx,.obj,.gltf,.glb,video/*,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadFile(file);
                      e.target.value = '';
                    }}
                  />

                  <button
                    type="button"
                    className="settings-secondary-action-btn"
                    onClick={() => {
                      onClose();
                      onOpenCrop();
                    }}
                  >
                    <Crop size={14} />
                    <span>Crop & Fit Media</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STYLING & FINISH */}
          {activeTab === 'style' && (
            <div className="settings-section-stack">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Mockup Frame Styling</h4>
                </div>

                {/* Corner Radius */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Frame Corner Radius</span>
                    <span className="slider-val-badge">{borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={2}
                    value={borderRadius}
                    onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
                    className="settings-range-input"
                  />
                </div>

                {/* Box Shadow */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>3D Drop Shadow Depth</span>
                    <span className="slider-val-badge">{shadowDepth.toUpperCase()}</span>
                  </div>
                  <div className="settings-segmented-group shadow-segmented">
                    {(['none', 'small', 'medium', 'large'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`segmented-opt ${shadowDepth === d ? 'is-active' : ''}`}
                        onClick={() => onShadowDepthChange(d)}
                      >
                        <span>{d}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Effects */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-text">
                    <span className="toggle-title">Studio Sound Effects</span>
                    <span className="toggle-desc">Dial tick, camera click & transition audio</span>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch ${soundEnabled ? 'is-on' : ''}`}
                    onClick={() => onSoundEnabledChange(!soundEnabled)}
                    aria-label="Toggle sound effects"
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EXPORT & RENDER */}
          {activeTab === 'export' && (
            <div className="settings-section-stack">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h4>Video Rendering Output</h4>
                </div>

                {/* Format */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Container Format</span>
                  </div>
                  <div className="settings-segmented-group">
                    <button
                      type="button"
                      className={`segmented-opt ${exportFormat === 'mp4' ? 'is-active' : ''}`}
                      onClick={() => onExportFormatChange('mp4')}
                    >
                      <span>MP4 (H.264 Universal)</span>
                    </button>
                    <button
                      type="button"
                      className={`segmented-opt ${exportFormat === 'webm' ? 'is-active' : ''}`}
                      onClick={() => onExportFormatChange('webm')}
                    >
                      <span>WebM (VP9)</span>
                    </button>
                  </div>
                </div>

                {/* FPS */}
                <div className="settings-slider-row">
                  <div className="slider-label-row">
                    <span>Render Framerate</span>
                  </div>
                  <div className="settings-segmented-group">
                    {[
                      { fps: 60 as const, label: '60 FPS (Ultra Smooth)' },
                      { fps: 30 as const, label: '30 FPS (Standard)' },
                      { fps: 24 as const, label: '24 FPS (Cinematic)' },
                    ].map((item) => (
                      <button
                        key={item.fps}
                        type="button"
                        className={`segmented-opt ${exportFps === item.fps ? 'is-active' : ''}`}
                        onClick={() => onExportFpsChange(item.fps)}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Render Button */}
                <div className="settings-export-cta-wrap">
                  <button
                    type="button"
                    className={`settings-render-btn ${isProcessing ? 'is-busy' : ''}`}
                    onClick={onExport}
                    disabled={isProcessing}
                  >
                    <Zap size={16} />
                    <span>
                      {isProcessing
                        ? `Rendering ${exportFormat.toUpperCase()} (${exportProgress}%)`
                        : `Export ${exportFormat.toUpperCase()} at ${exportFps} FPS`}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="settings-snapshot-btn"
                    onClick={onCapturePhoto}
                    disabled={isProcessing}
                  >
                    <Camera size={14} />
                    <span>Download High-Res 4K PNG Photo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
