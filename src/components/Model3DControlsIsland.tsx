import React, { useState } from 'react';
import { Model3DTransform, Model3DKeyframe } from '../types/model3D';
import {
  Maximize2,
  RotateCw,
  Move,
  RotateCcw,
  Sparkles,
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

  // Check if there is an existing keyframe within 0.05s of currentTime
  const currentKf = keyframes.find((k) => Math.abs(k.time - currentTime) <= 0.05);

  // Find previous and next keyframes for jumping
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const prevKf = [...sorted].reverse().find((k) => k.time < currentTime - 0.05);
  const nextKf = sorted.find((k) => k.time > currentTime + 0.05);

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeTransform({
      ...transform,
      scale: parseFloat(e.target.value),
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
        position: 'fixed',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '10px 14px',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Sub-panel controls based on activeTab */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '320px', justifyContent: 'center' }}>
        {activeTab === 'scale' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scale:
            </span>
            <input
              type="range"
              min="0.2"
              max="3.5"
              step="0.05"
              value={transform.scale}
              onChange={handleScaleChange}
              style={{ flex: 1, accentColor: '#38bdf8', height: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '42px', color: '#38bdf8', textAlign: 'right' }}>
              {transform.scale.toFixed(2)}x
            </span>
          </div>
        )}

        {activeTab === 'rotate' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>X:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={Math.round(transform.rotX)}
                onChange={(e) => handleRotChange('rotX', parseInt(e.target.value, 10))}
                style={{ width: '65px', accentColor: '#ef4444', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '28px' }}>{Math.round(transform.rotX)}°</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Y:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={Math.round(transform.rotY)}
                onChange={(e) => handleRotChange('rotY', parseInt(e.target.value, 10))}
                style={{ width: '65px', accentColor: '#10b981', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '28px' }}>{Math.round(transform.rotY)}°</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>Z:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={Math.round(transform.rotZ)}
                onChange={(e) => handleRotChange('rotZ', parseInt(e.target.value, 10))}
                style={{ width: '65px', accentColor: '#38bdf8', height: '4px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '28px' }}>{Math.round(transform.rotZ)}°</span>
            </div>
          </div>
        )}

        {activeTab === 'position' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>X:</span>
              <input
                type="range"
                min="-400"
                max="400"
                step="5"
                value={Math.round(transform.posX)}
                onChange={(e) => handlePosChange('posX', parseInt(e.target.value, 10))}
                style={{ width: '70px', accentColor: '#38bdf8', height: '4px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Y:</span>
              <input
                type="range"
                min="-400"
                max="400"
                step="5"
                value={Math.round(transform.posY)}
                onChange={(e) => handlePosChange('posY', parseInt(e.target.value, 10))}
                style={{ width: '70px', accentColor: '#38bdf8', height: '4px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Depth:</span>
              <input
                type="range"
                min="-300"
                max="300"
                step="5"
                value={Math.round(transform.posZ)}
                onChange={(e) => handlePosChange('posZ', parseInt(e.target.value, 10))}
                style={{ width: '70px', accentColor: '#a855f7', height: '4px', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Main button bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Mode switches */}
        <button
          type="button"
          onClick={() => setActiveTab('rotate')}
          title="3D Rotation Controls"
          style={{
            background: activeTab === 'rotate' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            border: activeTab === 'rotate' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
            color: activeTab === 'rotate' ? '#38bdf8' : '#cbd5e1',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCw size={14} />
          Rotate
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scale')}
          title="Scale / Resize Model"
          style={{
            background: activeTab === 'scale' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            border: activeTab === 'scale' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
            color: activeTab === 'scale' ? '#38bdf8' : '#cbd5e1',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          <Maximize2 size={14} />
          Resize
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('position')}
          title="Position / Pan Model"
          style={{
            background: activeTab === 'position' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            border: activeTab === 'position' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
            color: activeTab === 'position' ? '#38bdf8' : '#cbd5e1',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          <Move size={14} />
          Position
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

        {/* Keyframe Jump & Add/Remove */}
        <button
          type="button"
          disabled={!prevKf}
          onClick={() => prevKf && onSeek(prevKf.time)}
          title="Jump to Previous 3D Keyframe"
          style={{
            background: 'transparent',
            border: 'none',
            color: prevKf ? '#94a3b8' : '#475569',
            cursor: prevKf ? 'pointer' : 'default',
            padding: '6px',
            borderRadius: '6px',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={currentKf ? () => onRemoveKeyframe(currentKf.time) : onAddKeyframe}
          title={currentKf ? 'Remove Keyframe at Current Time' : 'Add 3D Model Keyframe at Current Time'}
          style={{
            background: currentKf ? 'rgba(244, 63, 94, 0.25)' : 'rgba(56, 189, 248, 0.25)',
            border: currentKf ? '1px solid rgba(244, 63, 94, 0.6)' : '1px solid rgba(56, 189, 248, 0.6)',
            color: currentKf ? '#fb7185' : '#38bdf8',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {currentKf ? <Trash2 size={13} /> : <Key size={13} />}
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
            color: nextKf ? '#94a3b8' : '#475569',
            cursor: nextKf ? 'pointer' : 'default',
            padding: '6px',
            borderRadius: '6px',
          }}
        >
          <ChevronRight size={16} />
        </button>

        {hasEmbeddedAnimation && (
          <button
            type="button"
            onClick={() =>
              onChangeTransform({
                ...transform,
                playAnimation: transform.playAnimation === false ? true : false,
              })
            }
            title="Toggle Embedded FBX Animation"
            style={{
              background: transform.playAnimation !== false ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              color: '#c084fc',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {transform.playAnimation !== false ? <Pause size={13} /> : <Play size={13} />}
            Anim
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          title="Reset Model Transform"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
          }}
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>
    </div>
  );
};
