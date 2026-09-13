import React from 'react';
import {
  X,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Sparkles,
  Move,
} from 'lucide-react';
import { TextLayerOverlay, TextFontFamily, TextAnimationType } from '../types/textLayer';

interface TextLayerInspectorProps {
  layer: TextLayerOverlay;
  onChange: (updated: TextLayerOverlay) => void;
  onDelete: (id: string) => void;
  onDuplicate: (layer: TextLayerOverlay) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { label: 'White', color: '#ffffff' },
  { label: 'Amber', color: '#facc15' },
  { label: 'Sky Blue', color: '#38bdf8' },
  { label: 'Purple', color: '#c084fc' },
  { label: 'Emerald', color: '#4ade80' },
  { label: 'Coral', color: '#f43f5e' },
  { label: 'Slate', color: '#0f172a' },
];

export const TextLayerInspector: React.FC<TextLayerInspectorProps> = ({
  layer,
  onChange,
  onDelete,
  onDuplicate,
  onClose,
}) => {
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

        {/* Font Selection (NOT dummy: SF Pro Display, Helvetica, Poppins) */}
        <div className="inspector-field-group">
          <label className="inspector-field-label">Typography</label>
          <div className="font-family-selector-grid">
            {(['SF Pro Display', 'Helvetica', 'Poppins'] as TextFontFamily[]).map((font) => {
              const isSelected = layer.fontFamily === font;
              return (
                <button
                  key={font}
                  type="button"
                  className={`font-select-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...layer, fontFamily: font })}
                  style={{
                    fontFamily:
                      font === 'SF Pro Display'
                        ? "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
                        : font === 'Helvetica'
                        ? "'Helvetica', 'Helvetica Neue', Arial, sans-serif"
                        : "'Poppins', sans-serif",
                  }}
                  title={`Select ${font} typeface`}
                  data-testid={`font-option-${font.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="font-sample" style={{ fontSize: '15px', fontWeight: '700', lineHeight: 1 }}>Ag</span>
                  <span className="font-name">{font}</span>
                  {isSelected && <span className="font-active-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size & Weight & Alignment */}
        <div className="inspector-row-two-col">
          <div className="inspector-field-group">
            <div className="inspector-label-with-value">
              <label className="inspector-field-label">Size</label>
              <span className="inspector-value-chip">{layer.fontSize}px</span>
            </div>
            <input
              type="range"
              min={18}
              max={110}
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
                  fontWeight: e.target.value as 'normal' | '500' | '600' | '700' | 'bold',
                })
              }
            >
              <option value="normal">Normal (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
            </select>
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
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                className={`segment-btn ${layer.textAlign === 'center' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, textAlign: 'center' })}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                className={`segment-btn ${layer.textAlign === 'right' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...layer, textAlign: 'right' })}
                title="Align Right"
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
            {/* Native Color Input with Custom Preview Ring */}
            <div className="custom-color-input-wrap" title="Custom color picker">
              <input
                type="color"
                value={layer.color.startsWith('#') ? layer.color : '#ffffff'}
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

            {/* Quick Presets Swatches */}
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

        {/* In & Out Animation Settings */}
        <div className="inspector-animation-box">
          <div className="animation-box-title">
            <Sparkles size={13} />
            <span>ANIMATION EFFECTS</span>
          </div>

          {/* In-Animation */}
          <div className="inspector-field-group">
            <div className="inspector-label-with-value">
              <label className="inspector-field-label">In-Animation</label>
              <span className="inspector-value-chip">{layer.inDuration || 0.35}s</span>
            </div>
            <div className="animation-types-grid">
              {(['pop', 'fade', 'slide-up', 'slide-down', 'none'] as TextAnimationType[]).map((anim) => {
                const isSelected = (layer.inAnimation || 'fade') === anim;
                return (
                  <button
                    key={`in_${anim}`}
                    type="button"
                    className={`anim-type-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onChange({ ...layer, inAnimation: anim })}
                  >
                    {anim.replace('-', ' ').toUpperCase()}
                  </button>
                );
              })}
            </div>
            {layer.inAnimation !== 'none' && (
              <input
                type="range"
                min={0.1}
                max={1.0}
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
              <label className="inspector-field-label">Out-Animation</label>
              <span className="inspector-value-chip">{layer.outDuration || 0.35}s</span>
            </div>
            <div className="animation-types-grid">
              {(['fade', 'pop', 'slide-up', 'slide-down', 'none'] as TextAnimationType[]).map((anim) => {
                const isSelected = (layer.outAnimation || 'fade') === anim;
                return (
                  <button
                    key={`out_${anim}`}
                    type="button"
                    className={`anim-type-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onChange({ ...layer, outAnimation: anim })}
                  >
                    {anim.replace('-', ' ').toUpperCase()}
                  </button>
                );
              })}
            </div>
            {layer.outAnimation !== 'none' && (
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={layer.outDuration || 0.35}
                onChange={(e) => onChange({ ...layer, outDuration: Number(e.target.value) })}
                className="inspector-range-slider"
              />
            )}
          </div>
        </div>

        {/* Quick Position Presets */}
        <div className="inspector-field-group">
          <label className="inspector-field-label">Stage Position</label>
          <div className="position-preset-buttons">
            <button
              type="button"
              className={`preset-pos-btn ${layer.y <= 25 ? 'is-active' : ''}`}
              onClick={() => onChange({ ...layer, x: 50, y: 15 })}
            >
              Top
            </button>
            <button
              type="button"
              className={`preset-pos-btn ${layer.y > 25 && layer.y < 70 ? 'is-active' : ''}`}
              onClick={() => onChange({ ...layer, x: 50, y: 50 })}
            >
              Center
            </button>
            <button
              type="button"
              className={`preset-pos-btn ${layer.y >= 70 ? 'is-active' : ''}`}
              onClick={() => onChange({ ...layer, x: 50, y: 82 })}
            >
              Bottom
            </button>
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
