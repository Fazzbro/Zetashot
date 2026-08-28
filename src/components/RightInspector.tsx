import React, { useState, useRef } from 'react';
import {
  Monitor,
  Palette,
  Sliders,
  MousePointer,
  Download,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Sun,
  Moon,
  Upload,
} from 'lucide-react';
import { ProjectState, DeviceMockupType } from '../utils/projectSerialization';
import { VIEWPORT_PRESETS, ViewportPreset } from '../utils/viewportPresets';
import { PRESET_GRADIENTS } from '../utils/gradientUtils';
import { calculateAspectRatio } from '../utils/transformMath';
import { ExportOptions, ResolutionScale, ExportFormat } from '../utils/exportResolution';
import { RecorderOptions, VideoResolution, VideoFps } from '../services/recorderEngine';

interface RightInspectorProps {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
  exportOptions: ExportOptions;
  onUpdateExportOptions: (options: ExportOptions) => void;
  recorderOptions: RecorderOptions;
  onUpdateRecorderOptions: (options: RecorderOptions) => void;
}

type TabType = 'device' | 'background' | 'effects' | 'cursor' | 'export';

export const RightInspector: React.FC<RightInspectorProps> = ({
  project,
  onUpdateProject,
  exportOptions,
  onUpdateExportOptions,
  recorderOptions,
  onUpdateRecorderOptions,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('device');
  const bgImageInputRef = useRef<HTMLInputElement | null>(null);

  const { viewport, deviceMockup, background, effects, cursor, canvas } = project;

  // Viewport change handler
  const handlePresetSelect = (preset: ViewportPreset) => {
    onUpdateProject({
      viewport: {
        width: preset.width,
        height: preset.height,
        scale: preset.scale,
        preset: preset.name,
      },
    });
  };

  const handleCustomDimension = (key: 'width' | 'height', val: number) => {
    const nextVal = Math.max(100, Math.min(7680, val || 100));
    onUpdateProject({
      viewport: {
        ...viewport,
        [key]: nextVal,
        preset: 'Custom',
      },
    });
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        onUpdateProject({
          background: {
            ...background,
            type: 'image',
            imageUrl: dataUrl,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="right-inspector">
      {/* Top Tabs */}
      <div className="inspector-tabs">
        <button
          className={`inspector-tab ${activeTab === 'device' ? 'active' : ''}`}
          onClick={() => setActiveTab('device')}
        >
          <Monitor size={13} style={{ display: 'inline', marginRight: 4 }} />
          Device
        </button>
        <button
          className={`inspector-tab ${activeTab === 'background' ? 'active' : ''}`}
          onClick={() => setActiveTab('background')}
        >
          <Palette size={13} style={{ display: 'inline', marginRight: 4 }} />
          Background
        </button>
        <button
          className={`inspector-tab ${activeTab === 'effects' ? 'active' : ''}`}
          onClick={() => setActiveTab('effects')}
        >
          <Sliders size={13} style={{ display: 'inline', marginRight: 4 }} />
          Effects
        </button>
        <button
          className={`inspector-tab ${activeTab === 'cursor' ? 'active' : ''}`}
          onClick={() => setActiveTab('cursor')}
        >
          <MousePointer size={13} style={{ display: 'inline', marginRight: 4 }} />
          Cursor
        </button>
        <button
          className={`inspector-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Download size={13} style={{ display: 'inline', marginRight: 4 }} />
          Export
        </button>
      </div>

      {/* Inspector Contents */}
      <div className="inspector-content">
        {/* TAB 1: DEVICE & VIEWPORT */}
        {activeTab === 'device' && (
          <>
            {/* Viewport Presets */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Viewport Preset</span>
                <span className="pill-badge">{calculateAspectRatio(viewport.width, viewport.height)}</span>
              </div>
              <select
                value={VIEWPORT_PRESETS.find((p) => p.width === viewport.width && p.height === viewport.height)?.id || 'custom'}
                onChange={(e) => {
                  const p = VIEWPORT_PRESETS.find((pr) => pr.id === e.target.value);
                  if (p) handlePresetSelect(p);
                }}
                style={{ width: '100%' }}
              >
                <optgroup label="Desktop">
                  {VIEWPORT_PRESETS.filter((p) => p.category === 'desktop').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Laptops">
                  {VIEWPORT_PRESETS.filter((p) => p.category === 'laptop').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Tablets">
                  {VIEWPORT_PRESETS.filter((p) => p.category === 'tablet').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Mobile Phones">
                  {VIEWPORT_PRESETS.filter((p) => p.category === 'mobile').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <option value="custom">Custom Dimensions</option>
              </select>
            </div>

            {/* Custom Dimensions */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Dimensions (W × H)</span>
              </div>
              <div className="control-row">
                <div className="control-input-group" style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>W:</span>
                  <input
                    type="number"
                    className="num-input"
                    style={{ width: '100%' }}
                    value={viewport.width}
                    onChange={(e) => handleCustomDimension('width', Number(e.target.value))}
                  />
                </div>
                <div className="control-input-group" style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>H:</span>
                  <input
                    type="number"
                    className="num-input"
                    style={{ width: '100%' }}
                    value={viewport.height}
                    onChange={(e) => handleCustomDimension('height', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Device Mockup Shell */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Device Mockup Frame</span>
              </div>
              <select
                value={deviceMockup.type}
                onChange={(e) =>
                  onUpdateProject({
                    deviceMockup: { ...deviceMockup, type: e.target.value as DeviceMockupType },
                  })
                }
                style={{ width: '100%' }}
              >
                <option value="mac-safari">macOS Safari Window</option>
                <option value="mac-chrome">macOS Chrome Window</option>
                <option value="windows-fluent">Windows 11 Fluent Window</option>
                <option value="macbook-pro">MacBook Pro 16" (M3 Bezel & Notch)</option>
                <option value="studio-display">Studio Display (Monitor Stand)</option>
                <option value="ipad-pro">iPad Pro Tablet</option>
                <option value="iphone-pro">iPhone 16 Pro (Dynamic Island)</option>
                <option value="frameless">Frameless Clean Canvas</option>
              </select>
            </div>

            {/* Frame Controls */}
            {deviceMockup.type.startsWith('mac') && (
              <div className="inspector-section">
                <div className="section-header">
                  <span>Frame Theme & Chrome</span>
                </div>
                <div className="control-row">
                  <span className="control-label">Theme</span>
                  <div className="segmented-control">
                    <button
                      className={`segmented-btn ${deviceMockup.theme === 'dark' ? 'active' : ''}`}
                      onClick={() => onUpdateProject({ deviceMockup: { ...deviceMockup, theme: 'dark' } })}
                    >
                      <Moon size={11} style={{ marginRight: 4 }} /> Dark
                    </button>
                    <button
                      className={`segmented-btn ${deviceMockup.theme === 'light' ? 'active' : ''}`}
                      onClick={() => onUpdateProject({ deviceMockup: { ...deviceMockup, theme: 'light' } })}
                    >
                      <Sun size={11} style={{ marginRight: 4 }} /> Light
                    </button>
                  </div>
                </div>

                <div className="control-row">
                  <span className="control-label">Traffic Lights</span>
                  <input
                    type="checkbox"
                    checked={deviceMockup.showTrafficLights}
                    onChange={(e) =>
                      onUpdateProject({
                        deviceMockup: { ...deviceMockup, showTrafficLights: e.target.checked },
                      })
                    }
                  />
                </div>

                <div className="control-row">
                  <span className="control-label">Address URL Bar</span>
                  <input
                    type="checkbox"
                    checked={deviceMockup.showUrlBar}
                    onChange={(e) =>
                      onUpdateProject({
                        deviceMockup: { ...deviceMockup, showUrlBar: e.target.checked },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: BACKGROUND */}
        {activeTab === 'background' && (
          <>
            {/* Background Type */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Background Type</span>
              </div>
              <div className="segmented-control" style={{ width: '100%' }}>
                <button
                  className={`segmented-btn ${background.type === 'gradient' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => onUpdateProject({ background: { ...background, type: 'gradient' } })}
                >
                  Gradient
                </button>
                <button
                  className={`segmented-btn ${background.type === 'solid' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => onUpdateProject({ background: { ...background, type: 'solid', color: background.color || '#090d16' } })}
                >
                  Solid
                </button>
                <button
                  className={`segmented-btn ${background.type === 'image' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => onUpdateProject({ background: { ...background, type: 'image' } })}
                >
                  Image
                </button>
                <button
                  className={`segmented-btn ${background.type === 'transparent' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => onUpdateProject({ background: { ...background, type: 'transparent' } })}
                >
                  Transparent
                </button>
              </div>
            </div>

            {/* Gradient Options */}
            {background.type === 'gradient' && (
              <>
                <div className="inspector-section">
                  <div className="section-header">
                    <span>Curated Gradients</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {PRESET_GRADIENTS.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          background: `linear-gradient(${p.angle}deg, ${p.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})`,
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.15)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                        data-tooltip={p.name}
                        onClick={() =>
                          onUpdateProject({
                            background: {
                              type: 'gradient',
                              gradientType: 'linear',
                              angle: p.angle,
                              stops: p.stops,
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="inspector-section">
                  <div className="section-header">
                    <span>Gradient Angle</span>
                    <span className="pill-badge">{background.angle || 135}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={background.angle || 135}
                    onChange={(e) =>
                      onUpdateProject({
                        background: { ...background, angle: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </>
            )}

            {/* Solid Color Option */}
            {background.type === 'solid' && (
              <div className="inspector-section">
                <div className="section-header">
                  <span>Solid Color</span>
                </div>
                <div className="control-row">
                  <input
                    type="color"
                    value={background.color || '#090d16'}
                    onChange={(e) =>
                      onUpdateProject({
                        background: { ...background, color: e.target.value },
                      })
                    }
                    style={{ width: '40px', height: '32px', padding: 0, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={background.color || '#090d16'}
                    onChange={(e) =>
                      onUpdateProject({
                        background: { ...background, color: e.target.value },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            )}

            {/* Image Wallpaper Option */}
            {background.type === 'image' && (
              <div className="inspector-section">
                <div className="section-header">
                  <span>Custom Wallpaper</span>
                </div>
                <button
                  className="btn-secondary"
                  style={{ width: '100%', padding: '8px' }}
                  onClick={() => bgImageInputRef.current?.click()}
                >
                  <Upload size={14} />
                  Upload Background Image
                </button>
                <input
                  type="file"
                  ref={bgImageInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleBgImageUpload}
                />
              </div>
            )}
          </>
        )}

        {/* TAB 3: VISUAL EFFECTS */}
        {activeTab === 'effects' && (
          <>
            {/* Canvas Padding */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Canvas Padding</span>
                <span className="pill-badge">{canvas.padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="128"
                value={canvas.padding}
                onChange={(e) =>
                  onUpdateProject({
                    canvas: { ...canvas, padding: Number(e.target.value) },
                  })
                }
              />
            </div>

            {/* Border Radius */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Corner Radius</span>
                <span className="pill-badge">{effects.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                value={effects.borderRadius}
                onChange={(e) =>
                  onUpdateProject({
                    effects: { ...effects, borderRadius: Number(e.target.value) },
                  })
                }
              />
            </div>

            {/* Shadow Depth & Blur */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Shadow Blur & Offset</span>
                <span className="pill-badge">{effects.shadowBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="96"
                value={effects.shadowBlur}
                onChange={(e) =>
                  onUpdateProject({
                    effects: { ...effects, shadowBlur: Number(e.target.value), shadowOffsetY: Math.round(Number(e.target.value) / 2) },
                  })
                }
              />
            </div>

            {/* Ambient Glow */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Ambient Glow</span>
                <span className="pill-badge">{effects.glowBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={effects.glowBlur}
                onChange={(e) =>
                  onUpdateProject({
                    effects: { ...effects, glowBlur: Number(e.target.value) },
                  })
                }
              />
            </div>

            {/* Brightness / Contrast */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Brightness</span>
                <span className="pill-badge">{effects.brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={effects.brightness}
                onChange={(e) =>
                  onUpdateProject({
                    effects: { ...effects, brightness: Number(e.target.value) },
                  })
                }
              />
            </div>
          </>
        )}

        {/* TAB 4: CURSOR */}
        {activeTab === 'cursor' && (
          <>
            <div className="inspector-section">
              <div className="section-header">
                <span>Cursor Mode</span>
              </div>
              <select
                value={cursor.mode}
                onChange={(e) =>
                  onUpdateProject({
                    cursor: { ...cursor, mode: e.target.value as any },
                  })
                }
                style={{ width: '100%' }}
              >
                <option value="highlighted">Highlighted Ring</option>
                <option value="normal">Normal Cursor</option>
                <option value="large">Large Cursor (1.5×)</option>
                <option value="hidden">Hide Cursor</option>
              </select>
            </div>

            {cursor.mode !== 'hidden' && (
              <>
                <div className="inspector-section">
                  <div className="section-header">
                    <span>Highlight Radius</span>
                    <span className="pill-badge">{cursor.highlightRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={cursor.highlightRadius}
                    onChange={(e) =>
                      onUpdateProject({
                        cursor: { ...cursor, highlightRadius: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="inspector-section">
                  <div className="section-header">
                    <span>Click Ripple Animation</span>
                  </div>
                  <div className="control-row">
                    <span className="control-label">Enable Click Ripples</span>
                    <input
                      type="checkbox"
                      checked={cursor.clickRipple}
                      onChange={(e) =>
                        onUpdateProject({
                          cursor: { ...cursor, clickRipple: e.target.checked },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* TAB 5: EXPORT SETTINGS */}
        {activeTab === 'export' && (
          <>
            {/* Screenshot Export Settings */}
            <div className="inspector-section">
              <div className="section-header">
                <span>Screenshot Format</span>
              </div>
              <div className="segmented-control" style={{ width: '100%' }}>
                {(['png', 'webp', 'jpeg'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    className={`segmented-btn ${exportOptions.format === fmt ? 'active' : ''}`}
                    style={{ flex: 1, textTransform: 'uppercase' }}
                    onClick={() => onUpdateExportOptions({ ...exportOptions, format: fmt })}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="inspector-section">
              <div className="section-header">
                <span>Resolution Multiplier</span>
              </div>
              <div className="segmented-control" style={{ width: '100%' }}>
                {([1, 2, 3, 4] as ResolutionScale[]).map((sc) => (
                  <button
                    key={sc}
                    className={`segmented-btn ${exportOptions.scale === sc ? 'active' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => onUpdateExportOptions({ ...exportOptions, scale: sc })}
                  >
                    {sc}×
                  </button>
                ))}
              </div>
            </div>

            {/* Video Recording Settings */}
            <div className="inspector-section" style={{ marginTop: 12 }}>
              <div className="section-header">
                <span>Video Recording Quality</span>
              </div>
              <div className="control-row">
                <span className="control-label">Resolution</span>
                <select
                  value={recorderOptions.resolution}
                  onChange={(e) =>
                    onUpdateRecorderOptions({
                      ...recorderOptions,
                      resolution: e.target.value as VideoResolution,
                    })
                  }
                  style={{ width: '110px' }}
                >
                  <option value="720p">720p HD</option>
                  <option value="1080p">1080p FHD</option>
                  <option value="1440p">1440p QHD</option>
                  <option value="4k">4K Ultra HD</option>
                </select>
              </div>

              <div className="control-row">
                <span className="control-label">Framerate</span>
                <select
                  value={recorderOptions.fps}
                  onChange={(e) =>
                    onUpdateRecorderOptions({
                      ...recorderOptions,
                      fps: Number(e.target.value) as VideoFps,
                    })
                  }
                  style={{ width: '110px' }}
                >
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
