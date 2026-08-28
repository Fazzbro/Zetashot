import React, { useRef } from 'react';
import { BackgroundConfig } from '../utils/gradientUtils';
import { ImagePlus } from 'lucide-react';

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
  const isImage = background.type === 'image';

  const handleSelectSolid = (color: string) => {
    onBackgroundChange({
      type: 'solid',
      color,
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

        {/* 4. Color Wheel (3rd option requested) */}
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

        {/* 5. Custom Background Image (4th option requested) */}
        <div className={`bg-pill-slot ${isImage ? 'is-active' : ''}`}>
          <button
            type="button"
            className="bg-image-upload-btn"
            onClick={handleImageUploadClick}
            title={isImage ? 'Change custom background image' : 'Upload custom background image'}
            aria-label="Upload custom background image"
          >
            {isImage && background.imageUrl ? (
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
    </div>
  );
};
