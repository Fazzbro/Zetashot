import React, { useRef, useState, useEffect } from 'react';
import { BackgroundConfig } from '../utils/gradientUtils';
import { ImagePlus } from 'lucide-react';
import type { MediaTimelineClip } from '../types/mediaTimeline';

export interface BackgroundPresetImage {
  id: string;
  name: string;
  url: string;
  position?: { x: number; y: number };
  imageScale?: number;
}

export const PRESET_BACKGROUND_IMAGES: BackgroundPresetImage[] = [
  { id: 'hills', name: 'Green Hills', url: '/backgrounds/bg-green-hills.jpg', position: { x: 50, y: 50 }, imageScale: 1.0 },
  { id: 'sunflowers', name: 'Sunflower Meadow', url: '/backgrounds/bg-sunflowers.png', position: { x: 50, y: 100 }, imageScale: 1.0 },
  { id: 'purple-wave', name: 'Purple Wave', url: '/backgrounds/bg-purple-wave.jpg', position: { x: 50, y: 50 }, imageScale: 1.0 },
  { id: 'tulips', name: 'Digital Tulips', url: '/backgrounds/bg-tulips.jpg', position: { x: 50, y: 50 }, imageScale: 1.0 },
  { id: 'clouds', name: 'Halftone Clouds', url: '/backgrounds/bg-halftone-clouds.jpg', position: { x: 50, y: 50 }, imageScale: 1.0 },
];

export interface BackgroundSelectorPillProps {
  background: BackgroundConfig;
  onBackgroundChange: (bg: BackgroundConfig) => void;
  onClose?: () => void;
  selectedClip?: MediaTimelineClip | null;
  onClipBackgroundChange?: (clipId: string, bg: BackgroundConfig | null) => void;
  onApplyToAllClips?: (bg: BackgroundConfig) => void;
  allClipsCount?: number;
  hideScopeBar?: boolean;
}

export const BackgroundSelectorPill: React.FC<BackgroundSelectorPillProps> = ({
  background,
  onBackgroundChange,
  selectedClip,
  onClipBackgroundChange,
  onApplyToAllClips,
  allClipsCount = 1,
  hideScopeBar = false,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scope, setScope] = useState<'clip' | 'all'>(selectedClip ? 'clip' : 'all');

  useEffect(() => {
    if (selectedClip) {
      setScope('clip');
    }
  }, [selectedClip?.id]);

  // Primary Presets
  const COLOR_WHITE = '#ffffff';
  const COLOR_LIGHT = '#f4f4f5';
  const COLOR_BLACK = '#09090b';

  // Determine active background configuration
  const isTargetingClip = scope === 'clip' && !!selectedClip;
  const activeBg: BackgroundConfig = isTargetingClip && selectedClip?.background
    ? selectedClip.background
    : background;

  // Determine current active selection
  const isWhite = activeBg.type === 'solid' && activeBg.color?.toLowerCase() === COLOR_WHITE;
  const isLight = activeBg.type === 'solid' && activeBg.color?.toLowerCase() === COLOR_LIGHT;
  const isBlack = activeBg.type === 'solid' && (activeBg.color?.toLowerCase() === COLOR_BLACK || activeBg.color?.toLowerCase() === '#000000');
  const isCustomSolid = activeBg.type === 'solid' && !isWhite && !isLight && !isBlack;
  const isPresetImage = activeBg.type === 'image' && PRESET_BACKGROUND_IMAGES.some(p => p.url === activeBg.imageUrl);
  const isCustomImage = activeBg.type === 'image' && !isPresetImage;

  const updateActiveBg = (newBg: BackgroundConfig) => {
    if (isTargetingClip && selectedClip && onClipBackgroundChange) {
      onClipBackgroundChange(selectedClip.id, newBg);
    } else {
      onBackgroundChange(newBg);
    }
  };

  const handleSelectSolid = (color: string) => {
    updateActiveBg({
      type: 'solid',
      color,
    });
  };

  const handleSelectPreset = (preset: BackgroundPresetImage) => {
    updateActiveBg({
      type: 'image',
      imageUrl: preset.url,
      imageFit: activeBg.imageFit || 'cover',
      position: preset.position || { x: 50, y: 50 },
      imageScale: activeBg.imageScale ?? 1.0,
    });
  };

  const handleColorWheelClick = () => {
    colorInputRef.current?.click();
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      updateActiveBg({
        type: 'solid',
        color: val,
      });
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        updateActiveBg({
          type: 'image',
          imageUrl: result,
          imageFit: 'cover',
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="backdrop-selector-pill-wrap">
      {/* 0. Scope Selector Switch (When editing multi-clip or specific clip) */}
      {selectedClip && allClipsCount > 1 && !hideScopeBar && (
        <div className="bg-pill-scope-bar">
          <div className="bg-pill-scope-pill" role="tablist">
            <button
              type="button"
              className={`bg-scope-btn ${scope === 'clip' ? 'is-active' : ''}`}
              onClick={() => setScope('clip')}
              role="tab"
              aria-selected={scope === 'clip'}
            >
              <span
                className="bg-scope-dot"
                style={{ backgroundColor: selectedClip.background ? '#ffffff' : '#71717a' }}
              />
              <span className="bg-scope-text">
                Clip: <strong>{selectedClip.name}</strong>
              </span>
              {selectedClip.background ? (
                <span className="bg-scope-tag custom">Custom</span>
              ) : (
                <span className="bg-scope-tag">Default</span>
              )}
            </button>
            <button
              type="button"
              className={`bg-scope-btn ${scope === 'all' ? 'is-active' : ''}`}
              onClick={() => setScope('all')}
              role="tab"
              aria-selected={scope === 'all'}
            >
              <span className="bg-scope-text">All Clips (Global)</span>
            </button>
          </div>

          {scope === 'clip' && selectedClip.background && onClipBackgroundChange && (
            <div className="bg-clip-actions">
              <button
                type="button"
                className="bg-clip-action-link"
                onClick={() => onClipBackgroundChange(selectedClip.id, null)}
                title="Reset this clip to use project default background"
              >
                Reset to Default
              </button>
              {onApplyToAllClips && (
                <button
                  type="button"
                  className="bg-clip-action-link highlight"
                  onClick={() => onApplyToAllClips(selectedClip.background!)}
                  title="Apply this clip's background to all clips in the sequence"
                >
                  Apply to All
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="backdrop-selector-pill" role="toolbar" aria-label="Background style selector">
        {/* 1. Primary Solid Option 1: White */}
        <div className={`bg-pill-slot ${isWhite ? 'is-active' : ''}`}>
          <button
            type="button"
            className="bg-color-swatch-btn is-white"
            style={{ backgroundColor: COLOR_WHITE }}
            onClick={() => handleSelectSolid(COLOR_WHITE)}
            title="White background"
            aria-label="White background"
          />
        </div>

        {/* 2. Primary Solid Option 2: Light Gray */}
        <div className={`bg-pill-slot ${isLight ? 'is-active' : ''}`}>
          <button
            type="button"
            className="bg-color-swatch-btn is-light"
            style={{ backgroundColor: COLOR_LIGHT }}
            onClick={() => handleSelectSolid(COLOR_LIGHT)}
            title="Light Gray background"
            aria-label="Light Gray background"
          />
        </div>

        {/* 3. Primary Solid Option 3: Black */}
        <div className={`bg-pill-slot ${isBlack ? 'is-active' : ''}`}>
          <button
            type="button"
            className="bg-color-swatch-btn is-black"
            style={{ backgroundColor: COLOR_BLACK }}
            onClick={() => handleSelectSolid(COLOR_BLACK)}
            title="Black background"
            aria-label="Black background"
          />
        </div>

        {/* 4. Color Wheel (Custom solid color) */}
        <div className={`bg-pill-slot ${isCustomSolid ? 'is-active' : ''}`}>
          <button
            type="button"
            className="bg-color-swatch-btn color-wheel-btn"
            style={{
              backgroundColor: isCustomSolid ? activeBg.color : '#ffffff',
            }}
            onClick={handleColorWheelClick}
            title="Choose custom background color"
            aria-label="Choose custom background color"
          >
            <span className="color-wheel-badge" />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="bg-hidden-color-input"
            value={activeBg.type === 'solid' ? activeBg.color : '#6366f1'}
            onChange={handleColorInputChange}
            aria-hidden="true"
          />
        </div>

        {/* Divider separating colors and background image gallery */}
        <div className="bg-pill-divider" role="separator" />

        {/* 5 Preset Background Images Gallery */}
        {PRESET_BACKGROUND_IMAGES.map((preset) => {
          const isSelected = activeBg.type === 'image' && activeBg.imageUrl === preset.url;
          return (
            <div key={preset.id} className={`bg-pill-slot ${isSelected ? 'is-active' : ''}`}>
              <button
                type="button"
                className="bg-preset-thumb-btn"
                onClick={() => handleSelectPreset(preset)}
                title={preset.name}
                aria-label={preset.name}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="bg-preset-thumb-img"
                  loading="lazy"
                />
              </button>
            </div>
          );
        })}

        {/* Custom Background Image Upload */}
        <div className={`bg-pill-slot ${isCustomImage ? 'is-active' : ''}`}>
          <button
            type="button"
            className="bg-image-upload-btn"
            onClick={handleImageUploadClick}
            title={isCustomImage ? 'Change custom background image' : 'Upload custom background image'}
            aria-label="Upload custom background image"
          >
            {isCustomImage && activeBg.imageUrl ? (
              <img src={activeBg.imageUrl} alt="Custom background" className="bg-image-mini-thumb" />
            ) : (
              <ImagePlus className="bg-image-icon" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="bg-hidden-file-input"
            onChange={handleFileChange}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Secondary Adjustment Strip: Fit, Alignment & Zoom Slider */}
      {activeBg.type === 'image' && (
        <div className="backdrop-image-adjust-strip" role="group" aria-label="Wallpaper adjustments">
          {/* Fit Mode Toggle */}
          <div className="bg-adjust-group">
            <button
              type="button"
              className={`bg-adjust-btn ${(activeBg.imageFit || 'cover') === 'cover' ? 'is-active' : ''}`}
              onClick={() => updateActiveBg({ ...activeBg, imageFit: 'cover' })}
              title="Cover (Fill entire stage)"
            >
              Cover
            </button>
            <button
              type="button"
              className={`bg-adjust-btn ${activeBg.imageFit === 'contain' ? 'is-active' : ''}`}
              onClick={() => updateActiveBg({ ...activeBg, imageFit: 'contain' })}
              title="Fit (Show entire image without cropping)"
            >
              Fit
            </button>
          </div>

          <div className="bg-adjust-divider" />

          {/* Position Selector: Top, Center, Bottom */}
          <div className="bg-adjust-group">
            <button
              type="button"
              className={`bg-adjust-btn ${(activeBg.position?.y ?? 50) === 0 ? 'is-active' : ''}`}
              onClick={() => updateActiveBg({ ...activeBg, position: { x: activeBg.position?.x ?? 50, y: 0 } })}
              title="Align Top"
            >
              Top
            </button>
            <button
              type="button"
              className={`bg-adjust-btn ${(activeBg.position?.y ?? 50) === 50 ? 'is-active' : ''}`}
              onClick={() => updateActiveBg({ ...activeBg, position: { x: activeBg.position?.x ?? 50, y: 50 } })}
              title="Align Center"
            >
              Center
            </button>
            <button
              type="button"
              className={`bg-adjust-btn ${(activeBg.position?.y ?? 50) === 100 ? 'is-active' : ''}`}
              onClick={() => updateActiveBg({ ...activeBg, position: { x: activeBg.position?.x ?? 50, y: 100 } })}
              title="Align Bottom"
            >
              Bottom
            </button>
          </div>

          <div className="bg-adjust-divider" />

          {/* Zoom / Scale Slider */}
          <div className="bg-adjust-zoom">
            <span className="bg-adjust-zoom-label">Zoom</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={activeBg.imageScale ?? 1.0}
              onChange={(e) => updateActiveBg({ ...activeBg, imageScale: parseFloat(e.target.value) })}
              className="bg-adjust-zoom-slider"
              title="Adjust Wallpaper Zoom"
            />
            <span className="bg-adjust-zoom-val">{Math.round((activeBg.imageScale ?? 1.0) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

