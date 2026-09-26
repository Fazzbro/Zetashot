import React, { useRef } from 'react';
import { BackgroundConfig } from '../utils/gradientUtils';
import { ImagePlus } from 'lucide-react';

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

interface BackgroundSelectorPillProps {
  background: BackgroundConfig;
  onBackgroundChange: (bg: BackgroundConfig) => void;
  onClose?: () => void;
}

export const BackgroundSelectorPill: React.FC<BackgroundSelectorPillProps> = ({
  background,
  onBackgroundChange,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Primary Presets
  const COLOR_WHITE = '#ffffff';
  const COLOR_LIGHT = '#f4f4f5';
  const COLOR_BLACK = '#09090b';

  // Determine current active selection
  const isWhite = background.type === 'solid' && background.color?.toLowerCase() === COLOR_WHITE;
  const isLight = background.type === 'solid' && background.color?.toLowerCase() === COLOR_LIGHT;
  const isBlack = background.type === 'solid' && (background.color?.toLowerCase() === COLOR_BLACK || background.color?.toLowerCase() === '#000000');
  const isCustomSolid = background.type === 'solid' && !isWhite && !isLight && !isBlack;
  const isPresetImage = background.type === 'image' && PRESET_BACKGROUND_IMAGES.some(p => p.url === background.imageUrl);
  const isCustomImage = background.type === 'image' && !isPresetImage;

  const handleSelectSolid = (color: string) => {
    onBackgroundChange({
      type: 'solid',
      color,
    });
  };

  const handleSelectPreset = (preset: BackgroundPresetImage) => {
    onBackgroundChange({
      type: 'image',
      imageUrl: preset.url,
      imageFit: background.imageFit || 'cover',
      position: preset.position || { x: 50, y: 50 },
      imageScale: background.imageScale ?? 1.0,
    });
  };

  const handleColorWheelClick = () => {
    colorInputRef.current?.click();
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      onBackgroundChange({
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
        onBackgroundChange({
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
              backgroundColor: isCustomSolid ? background.color : '#ffffff',
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
            value={background.type === 'solid' ? background.color : '#6366f1'}
            onChange={handleColorInputChange}
            aria-hidden="true"
          />
        </div>

        {/* Divider separating colors and background image gallery */}
        <div className="bg-pill-divider" role="separator" />

        {/* 5 Preset Background Images Gallery */}
        {PRESET_BACKGROUND_IMAGES.map((preset) => {
          const isSelected = background.type === 'image' && background.imageUrl === preset.url;
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
            {isCustomImage && background.imageUrl ? (
              <img src={background.imageUrl} alt="Custom background" className="bg-image-mini-thumb" />
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
      {background.type === 'image' && (
        <div className="backdrop-image-adjust-strip" role="group" aria-label="Wallpaper adjustments">
          {/* Fit Mode Toggle */}
          <div className="bg-adjust-group">
            <button
              type="button"
              className={`bg-adjust-btn ${(background.imageFit || 'cover') === 'cover' ? 'is-active' : ''}`}
              onClick={() => onBackgroundChange({ ...background, imageFit: 'cover' })}
              title="Cover (Fill entire stage)"
            >
              Cover
            </button>
            <button
              type="button"
              className={`bg-adjust-btn ${background.imageFit === 'contain' ? 'is-active' : ''}`}
              onClick={() => onBackgroundChange({ ...background, imageFit: 'contain' })}
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
              className={`bg-adjust-btn ${(background.position?.y ?? 50) === 0 ? 'is-active' : ''}`}
              onClick={() => onBackgroundChange({ ...background, position: { x: background.position?.x ?? 50, y: 0 } })}
              title="Align Top"
            >
              Top
            </button>
            <button
              type="button"
              className={`bg-adjust-btn ${(background.position?.y ?? 50) === 50 ? 'is-active' : ''}`}
              onClick={() => onBackgroundChange({ ...background, position: { x: background.position?.x ?? 50, y: 50 } })}
              title="Align Center"
            >
              Center
            </button>
            <button
              type="button"
              className={`bg-adjust-btn ${(background.position?.y ?? 50) === 100 ? 'is-active' : ''}`}
              onClick={() => onBackgroundChange({ ...background, position: { x: background.position?.x ?? 50, y: 100 } })}
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
              value={background.imageScale ?? 1.0}
              onChange={(e) => onBackgroundChange({ ...background, imageScale: parseFloat(e.target.value) })}
              className="bg-adjust-zoom-slider"
              title="Adjust Wallpaper Zoom"
            />
            <span className="bg-adjust-zoom-val">{Math.round((background.imageScale ?? 1.0) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
