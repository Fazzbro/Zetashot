import React, { useRef, useState } from 'react';
import { EASING_PRESETS, CubicBezierValues, EasingPreset } from '../utils/bezierSolver';

interface EasingCurveModalProps {
  isOpen: boolean;
  onClose: () => void;
  values: CubicBezierValues;
  onChange: (values: CubicBezierValues) => void;
}

export const EasingCurveModal: React.FC<EasingCurveModalProps> = ({
  isOpen,
  onClose,
  values,
  onChange,
}) => {
  const [x1, y1, x2, y2] = values || [0.25, 0.1, 0.25, 1.0];
  const [activeHandle, setActiveHandle] = useState<'p1' | 'p2' | null>(null);
  const graphRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  const graphSize = 220;
  const padding = 20;
  const usable = graphSize - padding * 2;

  // Convert (0..1, 0..1) to SVG coordinates (origin bottom-left at padding, graphSize - padding)
  const toSvgX = (nx: number) => padding + nx * usable;
  const toSvgY = (ny: number) => padding + (1 - ny) * usable;

  const handleMouseDown = (handle: 'p1' | 'p2', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handle);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!graphRef.current) return;
      const rect = graphRef.current.getBoundingClientRect();
      const rawX = (moveEvent.clientX - rect.left - padding) / usable;
      const rawY = 1 - (moveEvent.clientY - rect.top - padding) / usable;

      const clampedX = Math.round(Math.max(0, Math.min(1, rawX)) * 100) / 100;
      const clampedY = Math.round(Math.max(-0.5, Math.min(1.5, rawY)) * 100) / 100;

      if (handle === 'p1') {
        onChange([clampedX, clampedY, x2, y2]);
      } else {
        onChange([x1, y1, clampedX, clampedY]);
      }
    };

    const onMouseUp = () => {
      setActiveHandle(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const p0x = toSvgX(0);
  const p0y = toSvgY(0);
  const p1x = toSvgX(x1);
  const p1y = toSvgY(y1);
  const p2x = toSvgX(x2);
  const p2y = toSvgY(y2);
  const p3x = toSvgX(1);
  const p3y = toSvgY(1);

  const pathD = `M ${p0x} ${p0y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`;

  // Find active preset
  const isPresetActive = (p: EasingPreset) =>
    Math.abs(p.values[0] - x1) < 0.02 &&
    Math.abs(p.values[1] - y1) < 0.02 &&
    Math.abs(p.values[2] - x2) < 0.02 &&
    Math.abs(p.values[3] - y2) < 0.02;

  return (
    <div
      className="easing-popover-panel"
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', bottom: 'calc(100% + 12px)', left: '48px', zIndex: 1000 }}
    >
      {/* 1. Interactive Bezier Graph Canvas */}
      <div className="bezier-graph-shell">
        <svg
          ref={graphRef}
          className="bezier-graph-svg"
          width={graphSize}
          height={graphSize}
          viewBox={`0 0 ${graphSize} ${graphSize}`}
        >
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={padding + usable} y2={padding} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={padding} y1={padding + usable / 2} x2={padding + usable} y2={padding + usable / 2} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={padding} y1={padding + usable} x2={padding + usable} y2={padding + usable} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={padding + usable} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={padding + usable / 2} y1={padding} x2={padding + usable / 2} y2={padding + usable} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={padding + usable} y1={padding} x2={padding + usable} y2={padding + usable} stroke="#e2e8f0" strokeWidth="1" />

          {/* Dotted handle lines */}
          <line x1={p0x} y1={p0y} x2={p1x} y2={p1y} stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 3" />
          <line x1={p3x} y1={p3y} x2={p2x} y2={p2y} stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 3" />

          {/* Cubic Bezier Main Curve */}
          <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

          {/* Start and End Anchor Dots */}
          <circle cx={p0x} cy={p0y} r="5" fill="#3b82f6" />
          <circle cx={p3x} cy={p3y} r="5" fill="#3b82f6" />

          {/* Draggable Control Point 1 Handle */}
          <circle
            cx={p1x}
            cy={p1y}
            r="6"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth="3"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => handleMouseDown('p1', e)}
          />

          {/* Draggable Control Point 2 Handle */}
          <circle
            cx={p2x}
            cy={p2y}
            r="6"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth="3"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => handleMouseDown('p2', e)}
          />
        </svg>
      </div>

      {/* 2. Four Numeric Value Inputs */}
      <div className="bezier-values-row">
        <input
          type="number"
          step="0.05"
          value={x1.toFixed(2)}
          onChange={(e) => onChange([Number(e.target.value), y1, x2, y2])}
        />
        <input
          type="number"
          step="0.05"
          value={y1.toFixed(2)}
          onChange={(e) => onChange([x1, Number(e.target.value), x2, y2])}
        />
        <input
          type="number"
          step="0.05"
          value={x2.toFixed(2)}
          onChange={(e) => onChange([x1, y1, Number(e.target.value), y2])}
        />
        <input
          type="number"
          step="0.05"
          value={y2.toFixed(2)}
          onChange={(e) => onChange([x1, y1, x2, Number(e.target.value)])}
        />
      </div>

      {/* 3. Presets Heading & 2x3 Grid */}
      <div className="bezier-presets-section">
        <span className="presets-heading">PRESETS</span>
        <div className="presets-grid-2x3">
          {EASING_PRESETS.map((preset) => {
            const active = isPresetActive(preset);
            const [px1, py1, px2, py2] = preset.values;
            const minSvg = `M 4 28 C ${4 + px1 * 32} ${28 - py1 * 24}, ${4 + px2 * 32} ${28 - py2 * 24}, 36 4`;

            return (
              <button
                key={preset.id}
                type="button"
                className={`preset-card-btn ${active ? 'is-active' : ''}`}
                onClick={() => onChange(preset.values)}
              >
                <svg width="40" height="32" viewBox="0 0 40 32">
                  <path d={minSvg} fill="none" stroke={active ? '#ffffff' : '#475569'} strokeWidth="1.5" />
                  <circle cx="4" cy="28" r="2" fill={active ? '#ffffff' : '#3b82f6'} />
                  <circle cx="36" cy="4" r="2" fill={active ? '#ffffff' : '#3b82f6'} />
                </svg>
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
