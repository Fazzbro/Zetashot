import React, { useState, useRef } from 'react';
import {
  X,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Sparkles,
  Layers,
  Scissors,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Upload,
  Plus,
  Check,
} from 'lucide-react';
import { TextLayerOverlay, TextFontFamily, TextAnimationType, TextAnimationScope, TextFontWeight } from '../types/textLayer';
import { getFontFamilyCss } from '../utils/textLayer';
import {
  registerCustomFontFile,
  getRegisteredCustomFonts,
  unregisterCustomFont,
  CustomFontItem,
} from '../utils/customFontHelper';

const MOTION_PRESETS: { type: TextAnimationType; label: string }[] = [
  { type: 'fade-in-blur', label: 'Blur Fade' },
  { type: 'blur', label: 'Blur' },
  { type: 'blur-sm', label: 'Blur Sm' },
  { type: 'scale', label: 'Scale' },
  { type: 'slide', label: 'Slide Up' },
  { type: 'slide-down', label: 'Slide Down' },
  { type: 'pop', label: 'Pop' },
  { type: 'scramble', label: 'Scramble' },
  { type: 'shimmer', label: 'Shimmer' },
  { type: 'roll', label: 'Roll 3D' },
  { type: 'fade', label: 'Fade' },
  { type: 'none', label: 'None' },
];

const SCOPE_OPTIONS: { scope: TextAnimationScope; label: string }[] = [
  { scope: 'word', label: 'Word' },
  { scope: 'char', label: 'Char' },
  { scope: 'line', label: 'Line' },
  { scope: 'all', label: 'All' },
];

interface TextLayerInspectorProps {
  layer: TextLayerOverlay;
  onChange: (updated: TextLayerOverlay) => void;
  onDelete: (id: string) => void;
  onDuplicate: (layer: TextLayerOverlay) => void;
  onClose: () => void;
  onSplitLines?: (layer: TextLayerOverlay) => void;
}

const BUILTIN_FONTS: { name: TextFontFamily; label: string; isDefault?: boolean }[] = [
  { name: 'Sora', label: 'Sora', isDefault: true },
  { name: 'SF Pro Display', label: 'SF Pro' },
  { name: 'Helvetica', label: 'Helvetica' },
  { name: 'Poppins', label: 'Poppins' },
];

const COLOR_PRESETS = [
  { label: 'Black', color: '#000000' },
  { label: 'White', color: '#ffffff' },
  { label: 'Silver', color: '#e4e4e7' },
  { label: 'Zinc', color: '#a1a1aa' },
  { label: 'Dark', color: '#18181b' },
  { label: 'Amber', color: '#facc15' },
  { label: 'Sky Blue', color: '#38bdf8' },
  { label: 'Purple', color: '#c084fc' },
  { label: 'Emerald', color: '#4ade80' },
  { label: 'Coral', color: '#f43f5e' },
];

export const TextLayerInspector: React.FC<TextLayerInspectorProps> = ({
  layer,
  onChange,
  onDelete,
  onDuplicate,
  onClose,
  onSplitLines,
}) => {
  const isMultiLine = layer.text.includes('\n');
  const [customFonts, setCustomFonts] = useState<CustomFontItem[]>(() => getRegisteredCustomFonts());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploadingFont(true);
    try {
      const registered = await registerCustomFontFile(file);
      setCustomFonts(getRegisteredCustomFonts());
      onChange({ ...layer, fontFamily: registered.name });
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload font');
    } finally {
      setIsUploadingFont(false);
      if (fontInputRef.current) {
        fontInputRef.current.value = '';
      }
    }
  };

  const handleDeleteCustomFont = (e: React.MouseEvent, font: CustomFontItem) => {
    e.stopPropagation();
    unregisterCustomFont(font.id);
    const remaining = getRegisteredCustomFonts();
    setCustomFonts(remaining);
    if (layer.fontFamily === font.name) {
      onChange({ ...layer, fontFamily: 'Sora' });
    }
  };

  return (
    <div
      className="text-layer-inspector-card"
      onClick={(e) => e.stopPropagation()}
      data-testid="text-layer-inspector"
    >
      {/* Header */}
      <div className="inspector-header-row">
        <div className="inspector-header-left">
          <Type size={14} className="inspector-icon-badge" />
          <span className="inspector-title">TEXT OVERLAY LAYER</span>
        </div>
        <div className="inspector-header-actions">
          <button
            type="button"
            className="inspector-mini-btn"
            onClick={() => onDuplicate(layer)}
            title="Duplicate text layer"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="inspector-mini-btn is-delete"
            onClick={() => onDelete(layer.id)}
            title="Delete text layer"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            className="inspector-mini-btn"
            onClick={onClose}
            title="Close inspector"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="inspector-body">
        {/* Text Input */}
        <div className="inspector-field-group">
          <label className="inspector-field-label">Content</label>
          <textarea
            className="inspector-textarea"
            rows={2}
            value={layer.text}
            onChange={(e) => onChange({ ...layer, text: e.target.value })}
            placeholder="Type your title or caption..."
          />
        </div>

        {/* Multi-Line Split Action: Break forced hierarchy into independent layers */}
        {isMultiLine && onSplitLines && (
          <div className="inspector-split-lines-banner" data-testid="split-lines-banner">
            <div className="split-banner-info">
              <Layers size={13} className="split-banner-icon" />
              <div className="split-banner-text">
                <span className="split-banner-title">Multi-line text detected</span>
                <span className="split-banner-desc">Split into independent layers to freely position and style each line</span>
              </div>
            </div>
            <button
              type="button"
              className="split-lines-action-btn"
              onClick={() => onSplitLines(layer)}
              title="Separate lines into individual draggable layers"
              data-testid="split-lines-btn"
            >
              <Scissors size={12} />
              <span>Split Lines into Layers</span>
            </button>
          </div>
        )}

        {/* Font Selection & Custom Font Upload */}
        <div className="inspector-field-group">
          <div className="inspector-label-with-value">
            <label className="inspector-field-label">Typography</label>
            <button
              type="button"
              className="inspector-upload-font-trigger"
              onClick={() => fontInputRef.current?.click()}
              title="Upload your own custom font file (.ttf, .otf, .woff, .woff2)"
              data-testid="upload-font-trigger-btn"
            >
              <Upload size={11} />
              <span>{isUploadingFont ? 'Loading...' : '+ Upload Font'}</span>
            </button>
            <input
              ref={fontInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              className="hidden-font-input"
              style={{ display: 'none' }}
              onChange={handleFontUpload}
            />
          </div>

          {uploadError && (
            <div className="font-upload-error-box">
              <span>{uploadError}</span>
            </div>
          )}

          <div className="font-family-selector-grid">
            {/* Built-in Fonts: Sora (Default), SF Pro, Helvetica, Poppins */}
            {BUILTIN_FONTS.map((font) => {
              const isSelected = layer.fontFamily === font.name;
              return (
                <button
                  key={font.name}
                  type="button"
                  className={`font-select-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...layer, fontFamily: font.name })}
                  style={{ fontFamily: getFontFamilyCss(font.name) }}
                  title={`Select ${font.label} typeface`}
                  data-testid={`font-option-${font.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="font-sample" style={{ fontSize: '15px', fontWeight: '700', lineHeight: 1 }}>Ag</span>
                  <div className="font-name-wrap">
                    <span className="font-name">{font.label}</span>
                    {font.isDefault && <span className="font-default-tag">DEF</span>}
                  </div>
                  {isSelected && <span className="font-active-dot" />}
                </button>
              );
            })}

            {/* Uploaded Custom Fonts */}
            {customFonts.map((cFont) => {
              const isSelected = layer.fontFamily === cFont.name;
              return (
                <button
                  key={cFont.id}
                  type="button"
                  className={`font-select-btn is-custom-font ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...layer, fontFamily: cFont.name })}
                  style={{ fontFamily: `'${cFont.name}', sans-serif` }}
                  title={`Custom Font: ${cFont.name} (${cFont.format})`}
                  data-testid={`custom-font-${cFont.name.toLowerCase()}`}
                >
                  <span className="font-sample" style={{ fontSize: '15px', fontWeight: '700', lineHeight: 1 }}>Ag</span>
                  <div className="font-name-wrap">
                    <span className="font-name" title={cFont.name}>{cFont.name}</span>
                    <span className="font-format-tag">{cFont.format}</span>
                  </div>
                  <button
                    type="button"
                    className="custom-font-del-btn"
                    onClick={(e) => handleDeleteCustomFont(e, cFont)}
                    title={`Delete custom font ${cFont.name}`}
                  >
                    <X size={10} />
                  </button>
                  {isSelected && <span className="font-active-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size & Weight */}
        <div className="inspector-row-two-col">
          <div className="inspector-field-group">
            <div className="inspector-label-with-value">
              <label className="inspector-field-label">Size</label>
              <span className="inspector-value-chip">{layer.fontSize}px</span>
            </div>
            <input
              type="range"
              min={16}
              max={120}
              step={2}
              value={layer.fontSize}
              onChange={(e) => onChange({ ...layer, fontSize: Number(e.target.value) })}
              className="inspector-range-slider"
            />
          </div>

          <div className="inspector-field-group">
            <label className="inspector-field-label">Weight</label>
            <select
              className="inspector-select"
              value={layer.fontWeight || '700'}
              onChange={(e) =>
                onChange({
                  ...layer,
                  fontWeight: e.target.value as TextFontWeight,
                })
              }
            >
              <option value="100">Thin (100)</option>
              <option value="200">Extra Light (200)</option>
              <option value="300">Light (300)</option>
              <option value="normal">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra Bold (800)</option>
            </select>
          </div>
        </div>

        {/* Line Distance (Line Height) */}
        <div className="inspector-field-group">
          <div className="inspector-label-with-value">
            <label className="inspector-field-label">Line Distance</label>
            <span className="inspector-value-chip">{((layer.lineHeight ?? 0.95)).toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.7}
            max={2.5}
            step={0.05}
            value={layer.lineHeight ?? 0.95}
            onChange={(e) => onChange({ ...layer, lineHeight: Number(Number(e.target.value).toFixed(2)) })}
            className="inspector-range-slider"
            data-testid="line-distance-slider"
          />
          <div className="inspector-mini-chip-row">
            {[
              { label: 'Tight', val: 0.95 },
              { label: 'Normal', val: 1.2 },
              { label: 'Relaxed', val: 1.5 },
              { label: 'Spacious', val: 1.85 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`mini-chip-btn ${Math.abs((layer.lineHeight ?? 0.95) - preset.val) < 0.04 ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, lineHeight: preset.val })}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Letter Spacing (Tracking) */}
        <div className="inspector-field-group">
          <div className="inspector-label-with-value">
            <label className="inspector-field-label">Letter Spacing</label>
            <span className="inspector-value-chip">{layer.letterSpacing ?? 0}px</span>
          </div>
          <input
            type="range"
            min={-2}
            max={16}
            step={0.5}
            value={layer.letterSpacing ?? 0}
            onChange={(e) => onChange({ ...layer, letterSpacing: Number(Number(e.target.value).toFixed(1)) })}
            className="inspector-range-slider"
            data-testid="letter-spacing-slider"
          />
          <div className="inspector-mini-chip-row">
            {[
              { label: 'Tight (-1)', val: -1 },
              { label: 'Normal (0)', val: 0 },
              { label: 'Wide (+3)', val: 3 },
              { label: 'Spaced (+6)', val: 6 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`mini-chip-btn ${(layer.letterSpacing ?? 0) === preset.val ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, letterSpacing: preset.val })}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alignment & Shadow */}
        <div className="inspector-row-two-col">
          <div className="inspector-field-group">
            <label className="inspector-field-label">Alignment</label>
            <div className="inspector-btn-segment">
              <button
                type="button"
                className={`segment-btn ${layer.textAlign === 'left' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, textAlign: 'left' })}
                title="Align Left"
                data-testid="align-left-btn"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                className={`segment-btn ${layer.textAlign === 'center' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, textAlign: 'center' })}
                title="Align Center"
                data-testid="align-center-btn"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                className={`segment-btn ${layer.textAlign === 'right' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, textAlign: 'right' })}
                title="Align Right"
                data-testid="align-right-btn"
              >
                <AlignRight size={14} />
              </button>
            </div>
          </div>

          <div className="inspector-field-group">
            <label className="inspector-field-label">Shadow</label>
            <div className="inspector-btn-segment">
              <button
                type="button"
                className={`segment-btn ${!layer.shadow ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, shadow: false })}
                title="No shadow (default, clean typography)"
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                None
              </button>
              <button
                type="button"
                className={`segment-btn ${layer.shadow ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, shadow: true })}
                title="Subtle drop shadow"
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                Drop
              </button>
            </div>
          </div>
        </div>

        {/* Color Choosing */}
        <div className="inspector-field-group">
          <label className="inspector-field-label">Color</label>
          <div className="color-picker-row">
            <div className="custom-color-input-wrap" title="Custom color picker">
              <input
                type="color"
                value={layer.color.startsWith('#') ? layer.color : '#000000'}
                onChange={(e) => onChange({ ...layer, color: e.target.value })}
                className="hidden-color-input"
                id="text-layer-color-input"
              />
              <label
                htmlFor="text-layer-color-input"
                className="color-swatch-ring"
                style={{ backgroundColor: layer.color }}
              />
            </div>

            <div className="color-swatches-strip">
              {COLOR_PRESETS.map((p) => {
                const isCurrent = layer.color.toLowerCase() === p.color.toLowerCase();
                return (
                  <button
                    key={p.color}
                    type="button"
                    className={`preset-color-dot ${isCurrent ? 'is-active' : ''}`}
                    style={{ backgroundColor: p.color }}
                    onClick={() => onChange({ ...layer, color: p.color })}
                    title={p.label}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Stage Positioning System (X/Y Sliders, 9-Point Anchor Grid & Micro-Nudge D-Pad) */}
        <div className="inspector-field-group">
          <div className="inspector-label-with-value">
            <label className="inspector-field-label">Stage Position</label>
            <span className="inspector-value-chip">X: {layer.x}% · Y: {layer.y}%</span>
          </div>

          <div className="inspector-row-two-col">
            <div className="inspector-coord-box">
              <div className="coord-header">
                <span className="coord-axis-tag">X</span>
                <span className="coord-val-text">{layer.x}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={layer.x}
                onChange={(e) => onChange({ ...layer, x: Number(Number(e.target.value).toFixed(1)) })}
                className="inspector-range-slider"
                data-testid="pos-x-slider"
              />
            </div>
            <div className="inspector-coord-box">
              <div className="coord-header">
                <span className="coord-axis-tag">Y</span>
                <span className="coord-val-text">{layer.y}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={layer.y}
                onChange={(e) => onChange({ ...layer, y: Number(Number(e.target.value).toFixed(1)) })}
                className="inspector-range-slider"
                data-testid="pos-y-slider"
              />
            </div>
          </div>

          {/* 9-Point Anchor Grid & Micro-Nudge D-Pad */}
          <div className="inspector-position-matrix-row">
            <div className="position-anchor-container">
              <span className="pos-sub-label">Snap Grid</span>
              <div className="position-grid-3x3">
                {[
                  { name: 'Top Left', x: 20, y: 15 },
                  { name: 'Top Center', x: 50, y: 15 },
                  { name: 'Top Right', x: 80, y: 15 },
                  { name: 'Mid Left', x: 20, y: 50 },
                  { name: 'Center', x: 50, y: 50 },
                  { name: 'Mid Right', x: 80, y: 50 },
                  { name: 'Bottom Left', x: 20, y: 82 },
                  { name: 'Bottom Center', x: 50, y: 82 },
                  { name: 'Bottom Right', x: 80, y: 82 },
                ].map((pos) => {
                  const isActive = Math.hypot(layer.x - pos.x, layer.y - pos.y) < 10;
                  return (
                    <button
                      key={pos.name}
                      type="button"
                      className={`grid-anchor-dot ${isActive ? 'is-active' : ''}`}
                      onClick={() => onChange({ ...layer, x: pos.x, y: pos.y })}
                      title={`Snap to ${pos.name} (${pos.x}%, ${pos.y}%)`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="position-nudge-container">
              <span className="pos-sub-label">Nudge (±1%)</span>
              <div className="position-nudge-pad">
                <button
                  type="button"
                  className="nudge-btn nudge-up"
                  onClick={() => onChange({ ...layer, y: Math.max(0, Number((layer.y - 1).toFixed(1))) })}
                  title="Nudge Up 1%"
                >
                  <ArrowUp size={11} />
                </button>
                <div className="nudge-middle-row">
                  <button
                    type="button"
                    className="nudge-btn nudge-left"
                    onClick={() => onChange({ ...layer, x: Math.max(0, Number((layer.x - 1).toFixed(1))) })}
                    title="Nudge Left 1%"
                  >
                    <ArrowLeft size={11} />
                  </button>
                  <button
                    type="button"
                    className="nudge-btn nudge-center"
                    onClick={() => onChange({ ...layer, x: 50, y: 50 })}
                    title="Reset to Center (50%, 50%)"
                  >
                    •
                  </button>
                  <button
                    type="button"
                    className="nudge-btn nudge-right"
                    onClick={() => onChange({ ...layer, x: Math.min(100, Number((layer.x + 1).toFixed(1))) })}
                    title="Nudge Right 1%"
                  >
                    <ArrowRight size={11} />
                  </button>
                </div>
                <button
                  type="button"
                  className="nudge-btn nudge-down"
                  onClick={() => onChange({ ...layer, y: Math.min(100, Number((layer.y + 1).toFixed(1))) })}
                  title="Nudge Down 1%"
                >
                  <ArrowDown size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* In & Out Animation Settings */}
        <div className="inspector-animation-box">
          <div className="animation-box-title">
            <Sparkles size={13} />
            <span>TEXT EFFECTS (MOTION-PRIMITIVES)</span>
          </div>

          {/* Granularity (Per Word / Char / Line / All) */}
          <div className="inspector-field-group">
            <div className="inspector-label-with-value">
              <label className="inspector-field-label">Granularity (per)</label>
              <span className="inspector-value-chip">{(layer.animationScope || 'word').toUpperCase()}</span>
            </div>
            <div className="inspector-btn-segment" style={{ marginTop: 4 }}>
              {SCOPE_OPTIONS.map((opt) => {
                const isSelected = (layer.animationScope || 'word') === opt.scope;
                return (
                  <button
                    key={opt.scope}
                    type="button"
                    className={`segment-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => onChange({ ...layer, animationScope: opt.scope })}
                    style={{ fontSize: '11px', padding: '4px 6px', textTransform: 'capitalize' }}
                    title={`Animate ${opt.label.toLowerCase()} by ${opt.label.toLowerCase()}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* In-Animation */}
          <div className="inspector-field-group" style={{ marginTop: 10 }}>
            <div className="inspector-label-with-value">
              <label className="inspector-field-label">In-Animation Effect</label>
              <span className="inspector-value-chip">{layer.inDuration || 0.35}s</span>
            </div>
            <div className="animation-types-grid">
              {MOTION_PRESETS.map((anim) => {
                const isSelected = (layer.inAnimation || 'pop') === anim.type;
                return (
                  <button
                    key={`in_${anim.type}`}
                    type="button"
                    className={`anim-type-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onChange({ ...layer, inAnimation: anim.type })}
                    title={`Motion-Primitives Preset: ${anim.label}`}
                  >
                    {anim.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
            {layer.inAnimation !== 'none' && (
              <input
                type="range"
                min={0.1}
                max={1.5}
                step={0.05}
                value={layer.inDuration || 0.35}
                onChange={(e) => onChange({ ...layer, inDuration: Number(e.target.value) })}
                className="inspector-range-slider"
              />
            )}
          </div>

          {/* Out-Animation */}
          <div className="inspector-field-group" style={{ marginTop: 10 }}>
            <div className="inspector-label-with-value">
              <label className="inspector-field-label">Out-Animation Effect</label>
              <span className="inspector-value-chip">{layer.outDuration || 0.35}s</span>
            </div>
            <div className="animation-types-grid">
              {MOTION_PRESETS.map((anim) => {
                const isSelected = (layer.outAnimation || 'fade') === anim.type;
                return (
                  <button
                    key={`out_${anim.type}`}
                    type="button"
                    className={`anim-type-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onChange({ ...layer, outAnimation: anim.type })}
                    title={`Motion-Primitives Exit Preset: ${anim.label}`}
                  >
                    {anim.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
            {layer.outAnimation !== 'none' && (
              <input
                type="range"
                min={0.1}
                max={1.5}
                step={0.05}
                value={layer.outDuration || 0.35}
                onChange={(e) => onChange({ ...layer, outDuration: Number(e.target.value) })}
                className="inspector-range-slider"
              />
            )}
          </div>
        </div>

        {/* Timing Summary */}
        <div className="inspector-timing-summary">
          <span>Start: <strong>{layer.startTime.toFixed(2)}s</strong></span>
          <span>Duration: <strong>{layer.duration.toFixed(2)}s</strong></span>
          <span>End: <strong>{(layer.startTime + layer.duration).toFixed(2)}s</strong></span>
        </div>
      </div>
    </div>
  );
};
