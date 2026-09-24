import React, { useState } from 'react';
import { Model3DTransform, Model3DKeyframe } from '../types/model3D';
import {
  Maximize2,
  RotateCw,
  Move,
  RotateCcw,
  Key,
  Trash2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Model3DControlsIslandProps {
  transform: Model3DTransform;
  onChangeTransform: (newTransform: Model3DTransform) => void;
  keyframes?: Model3DKeyframe[];
  onAddKeyframe: () => void;
  onRemoveKeyframe: (time: number) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onReset: () => void;
  hasEmbeddedAnimation?: boolean;
}

export const Model3DControlsIsland: React.FC<Model3DControlsIslandProps> = ({
  transform,
  onChangeTransform,
  keyframes = [],
  onAddKeyframe,
  onRemoveKeyframe,
  currentTime,
  onSeek,
  onReset,
  hasEmbeddedAnimation = false,
}) => {
  const [activeTab, setActiveTab] = useState<'scale' | 'rotate' | 'position'>('rotate');

  // Check if there is an existing keyframe within 0.12s snap tolerance of currentTime
  const currentKf = keyframes.find((k) => Math.abs(k.time - currentTime) <= 0.12);

  // Find previous and next keyframes for jumping
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const prevKf = [...sorted].reverse().find((k) => k.time < currentTime - 0.08);
  const nextKf = sorted.find((k) => k.time > currentTime + 0.08);

  const safeScale = typeof transform?.scale === 'number' && !isNaN(transform.scale) ? transform.scale : 1.0;
  const safeRotX = typeof transform?.rotX === 'number' && !isNaN(transform.rotX) ? Math.round(transform.rotX) : 0;
  const safeRotY = typeof transform?.rotY === 'number' && !isNaN(transform.rotY) ? Math.round(transform.rotY) : 0;
  const safeRotZ = typeof transform?.rotZ === 'number' && !isNaN(transform.rotZ) ? Math.round(transform.rotZ) : 0;
  const safePosX = typeof transform?.posX === 'number' && !isNaN(transform.posX) ? Math.round(transform.posX) : 0;
  const safePosY = typeof transform?.posY === 'number' && !isNaN(transform.posY) ? Math.round(transform.posY) : 0;
  const safePosZ = typeof transform?.posZ === 'number' && !isNaN(transform.posZ) ? Math.round(transform.posZ) : 0;

  const handleScaleChange = (val: number) => {
    onChangeTransform({
      ...transform,
      scale: Math.max(0.1, Math.min(5.0, Number(val.toFixed(2)))),
    });
  };

  const handleRotChange = (axis: 'rotX' | 'rotY' | 'rotZ', val: number) => {
    onChangeTransform({
      ...transform,
      [axis]: val,
    });
  };

  const handlePosChange = (axis: 'posX' | 'posY' | 'posZ', val: number) => {
    onChangeTransform({
      ...transform,
      [axis]: val,
    });
  };

  return (
    <div
      className="model-3d-controls-island"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        background: '#121214',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        borderRadius: '14px',
        padding: '8px 12px',
        color: '#ffffff',
        fontFamily: "'Geist', Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sub-panel controls based on activeTab */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '340px', justifyContent: 'center' }}>
        {activeTab === 'scale' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scale:
            </span>
            <input
              type="range"
              min="0.2"
              max="3.5"
              step="0.05"
              value={safeScale}
              onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '40px', color: '#ffffff', textAlign: 'right' }}>
              {safeScale.toFixed(2)}x
            </span>
            {/* Quick scale preset pills */}
            <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
              {[0.5, 1.0, 1.5, 2.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleScaleChange(preset)}
                  style={{
                    background: Math.abs(safeScale - preset) < 0.06 ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                    color: Math.abs(safeScale - preset) < 0.06 ? '#000000' : '#d4d4d8',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rotate' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>X:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={safeRotX}
                onChange={(e) => handleRotChange('rotX', parseInt(e.target.value, 10))}
                style={{ width: '55px', accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#ffffff', minWidth: '26px' }}>{safeRotX}°</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>Y:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={safeRotY}
                onChange={(e) => handleRotChange('rotY', parseInt(e.target.value, 10))}
                style={{ width: '55px', accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#ffffff', minWidth: '26px' }}>{safeRotY}°</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>Z:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={safeRotZ}
                onChange={(e) => handleRotChange('rotZ', parseInt(e.target.value, 10))}
                style={{ width: '55px', accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#ffffff', minWidth: '26px' }}>{safeRotZ}°</span>
            </div>

            <button
              type="button"
              onClick={() => onChangeTransform({ ...transform, rotX: 0, rotY: 0, rotZ: 0 })}
              title="Reset rotation to 0°"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#d4d4d8',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '4px',
                padding: '2px 5px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              0°
            </button>
          </div>
        )}

        {activeTab === 'position' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>X:</span>
              <input
                type="range"
                min="-400"
                max="400"
                step="5"
                value={safePosX}
                onChange={(e) => handlePosChange('posX', parseInt(e.target.value, 10))}
                style={{ width: '60px', accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>Y:</span>
              <input
                type="range"
                min="-400"
                max="400"
                step="5"
                value={safePosY}
                onChange={(e) => handlePosChange('posY', parseInt(e.target.value, 10))}
                style={{ width: '60px', accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>Depth:</span>
              <input
                type="range"
                min="-300"
                max="300"
                step="5"
                value={safePosZ}
                onChange={(e) => handlePosChange('posZ', parseInt(e.target.value, 10))}
                style={{ width: '60px', accentColor: '#ffffff', height: '4px', cursor: 'pointer' }}
              />
            </div>

            <button
              type="button"
              onClick={() => onChangeTransform({ ...transform, posX: 0, posY: 0, posZ: 0 })}
              title="Center position"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#d4d4d8',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '4px',
                padding: '2px 5px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Center
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Main button bar in strict Black & White */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Mode switches */}
        <button
          type="button"
          onClick={() => setActiveTab('rotate')}
          title="3D Rotation Controls"
          style={{
            background: activeTab === 'rotate' ? '#ffffff' : 'transparent',
            border: activeTab === 'rotate' ? '1px solid #ffffff' : '1px solid transparent',
            color: activeTab === 'rotate' ? '#000000' : '#a1a1aa',
            borderRadius: '8px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: activeTab === 'rotate' ? 600 : 500,
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCw size={13} />
          Rotate
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scale')}
          title="Scale / Resize Model"
          style={{
            background: activeTab === 'scale' ? '#ffffff' : 'transparent',
            border: activeTab === 'scale' ? '1px solid #ffffff' : '1px solid transparent',
            color: activeTab === 'scale' ? '#000000' : '#a1a1aa',
            borderRadius: '8px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: activeTab === 'scale' ? 600 : 500,
            transition: 'all 0.15s ease',
          }}
        >
          <Maximize2 size={13} />
          Resize
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('position')}
          title="Position / Pan Model"
          style={{
            background: activeTab === 'position' ? '#ffffff' : 'transparent',
            border: activeTab === 'position' ? '1px solid #ffffff' : '1px solid transparent',
            color: activeTab === 'position' ? '#000000' : '#a1a1aa',
            borderRadius: '8px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: activeTab === 'position' ? 600 : 500,
            transition: 'all 0.15s ease',
          }}
        >
          <Move size={13} />
          Position
        </button>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.12)', margin: '0 3px' }} />

        {/* Keyframe Jump & Add/Remove */}
        <button
          type="button"
          disabled={!prevKf}
          onClick={() => prevKf && onSeek(prevKf.time)}
          title="Jump to Previous 3D Keyframe"
          style={{
            background: 'transparent',
            border: 'none',
            color: prevKf ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
            cursor: prevKf ? 'pointer' : 'default',
            padding: '5px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={15} />
        </button>

        <button
          type="button"
          onClick={currentKf ? () => onRemoveKeyframe(currentKf.time) : onAddKeyframe}
          title={currentKf ? 'Remove Keyframe at Current Time' : 'Add 3D Model Keyframe at Current Time'}
          style={{
            background: currentKf ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
            border: currentKf ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
            color: currentKf ? '#000000' : '#ffffff',
            borderRadius: '8px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
        >
          {currentKf ? <Trash2 size={12} /> : <Key size={12} />}
          {currentKf ? 'Del Keyframe' : '+ Keyframe'}
        </button>

        <button
          type="button"
          disabled={!nextKf}
          onClick={() => nextKf && onSeek(nextKf.time)}
          title="Jump to Next 3D Keyframe"
          style={{
            background: 'transparent',
            border: 'none',
            color: nextKf ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
            cursor: nextKf ? 'pointer' : 'default',
            padding: '5px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={15} />
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeTransform({
              ...transform,
              playAnimation: transform.playAnimation === false ? true : false,
            })
          }
          title={
            hasEmbeddedAnimation
              ? transform.playAnimation !== false
                ? 'Pause 3D Model Animation'
                : 'Play 3D Model Animation'
              : 'Toggle 3D Animation'
          }
          style={{
            background: transform.playAnimation !== false ? '#ffffff' : 'transparent',
            border: transform.playAnimation !== false ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
            color: transform.playAnimation !== false ? '#000000' : '#a1a1aa',
            borderRadius: '8px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {transform.playAnimation !== false ? <Pause size={12} /> : <Play size={12} />}
          Anim
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset Model Transform"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#a1a1aa',
            borderRadius: '8px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a1a1aa';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>
    </div>
  );
};
