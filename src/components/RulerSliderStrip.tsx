import React, { useRef, useState } from 'react';

interface RulerSliderStripProps {
  label: string;
  valueText: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  onClose: () => void;
}

export const RulerSliderStrip: React.FC<RulerSliderStripProps> = ({
  label,
  valueText,
  value,
  min,
  max,
  step = 1,
  onChange,
  onClose,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    setIsDragging(true);

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const updateFromPosition = (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + percent * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, stepped)));
    };

    updateFromPosition(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateFromPosition(moveEvent.clientX);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {}
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const progress = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <div
      className={`ruler-slider-strip ${isDragging ? 'is-dragging' : ''}`}
      ref={trackRef}
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'none' }}
    >
      {/* Horizontal tick marks */}
      <div className="ruler-ticks-track">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className={`ruler-tick ${i % 4 === 0 ? 'major' : ''}`} />
        ))}
      </div>

      {/* Yellow Center Needle */}
      <div className="ruler-indicator-needle" style={{ left: `${progress * 100}%` }} />

      {/* Value Readout Tag */}
      <div className="ruler-readout-badge" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <span className="ruler-label">{label}</span>
        <strong className="ruler-val">{valueText}</strong>
      </div>
    </div>
  );
};
