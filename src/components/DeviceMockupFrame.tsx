import React from 'react';
import { DeviceMockupConfig, VisualEffectsConfig } from '../utils/projectSerialization';
import { Lock, RotateCw, Globe, ShieldCheck } from 'lucide-react';

interface DeviceMockupFrameProps {
  config: DeviceMockupConfig;
  effects: VisualEffectsConfig;
  width: number;
  height: number;
  interactive: boolean;
  onUrlChange?: (url: string) => void;
  children: React.ReactNode;
}

export const DeviceMockupFrame: React.FC<DeviceMockupFrameProps> = ({
  config,
  effects,
  width,
  height,
  interactive,
  onUrlChange,
  children,
}) => {
  // Compute frame visual styles
  const boxShadow = `${effects.shadowColor} 0px ${effects.shadowOffsetY}px ${effects.shadowBlur}px ${effects.shadowSpread}px`;
  const glow = effects.glowBlur > 0
    ? `0 0 ${effects.glowBlur}px ${effects.glowColor}`
    : 'none';

  const combinedShadow = effects.glowBlur > 0 ? `${boxShadow}, ${glow}` : boxShadow;

  const frameStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${effects.borderRadius}px`,
    borderWidth: `${effects.borderWidth}px`,
    borderStyle: effects.borderWidth > 0 ? 'solid' : 'none',
    borderColor: effects.borderColor,
    boxShadow: combinedShadow,
    opacity: (effects.opacity ?? 100) / 100,
    filter: `brightness(${effects.brightness}%) contrast(${effects.contrast}%) saturate(${effects.saturation}%) blur(${effects.pageBlur}px)`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    pointerEvents: interactive ? 'auto' : 'none',
    background: config.type.startsWith('mac') ? (config.theme === 'light' ? '#f8fafc' : '#111827') : '#000000',
  };

  return (
    <div className={`mockup-wrapper mockup-${config.type} ${config.theme === 'light' ? 'light-theme' : ''}`} style={frameStyle}>
      {/* 1. Mac Safari Header */}
      {config.type === 'mac-safari' && (
        <div className="mac-window-header">
          {config.showTrafficLights && (
            <div className="traffic-lights">
              <div className="traffic-light close" />
              <div className="traffic-light minimize" />
              <div className="traffic-light maximize" />
            </div>
          )}
          {config.showUrlBar && (
            <div className="mockup-address-bar">
              <Lock size={11} style={{ opacity: 0.6 }} />
              <input
                className="address-bar-url"
                value={config.url}
                onChange={(e) => onUrlChange?.(e.target.value)}
                placeholder="https://yourwebsite.com"
                spellCheck={false}
              />
              <RotateCw size={11} style={{ opacity: 0.6 }} />
            </div>
          )}
        </div>
      )}

      {/* 2. Mac Chrome Header */}
      {config.type === 'mac-chrome' && (
        <div className="mac-window-header" style={{ height: '42px' }}>
          {config.showTrafficLights && (
            <div className="traffic-lights">
              <div className="traffic-light close" />
              <div className="traffic-light minimize" />
              <div className="traffic-light maximize" />
            </div>
          )}
          {config.showTabs && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', padding: '4px 12px', borderRadius: '6px', fontSize: '11px' }}>
              <Globe size={12} color="#6366f1" />
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {config.title || 'Web Application'}
              </span>
            </div>
          )}
          {config.showUrlBar && (
            <div className="mockup-address-bar" style={{ maxWidth: '380px' }}>
              <ShieldCheck size={11} color="#10b981" />
              <input
                className="address-bar-url"
                value={config.url}
                onChange={(e) => onUrlChange?.(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Windows 11 Fluent Header */}
      {config.type === 'windows-fluent' && (
        <div className="windows-header">
          <div className="windows-title">
            <Globe size={13} color="#60a5fa" />
            <span>{config.title || config.url}</span>
          </div>
          <div className="windows-controls">
            <div className="windows-btn">&#8722;</div>
            <div className="windows-btn">&#9633;</div>
            <div className="windows-btn close">&#10005;</div>
          </div>
        </div>
      )}

      {/* 4. MacBook Pro Notch */}
      {config.type === 'macbook-pro' && (
        <div className="macbook-notch">
          <div className="camera-lens" />
        </div>
      )}

      {/* 5. iPhone Dynamic Island */}
      {config.type === 'iphone-pro' && (
        <div className="iphone-dynamic-island">
          <div className="camera-lens" style={{ width: '8px', height: '8px' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
        </div>
      )}

      {/* Main Content Webpage Body */}
      <div className="mockup-content-body">
        {children}
      </div>

      {/* Studio Display Stand Base (if monitor) */}
      {config.type === 'studio-display' && (
        <>
          <div className="studio-stand-neck" />
          <div className="studio-stand-base" />
        </>
      )}
    </div>
  );
};
