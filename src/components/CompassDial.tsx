import React, { useRef, useState } from 'react';
import { clampRotation } from '../utils/camera3D';

interface CompassDialProps {
  axis: 'x' | 'y' | 'z';
  value: number; // degrees
  onChange: (deg: number) => void;
  onReset: () => void;
}

export const CompassDial: React.FC<CompassDialProps> = ({
  axis,
  value,
  onChange,
  onReset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const startValRef = useRef<number>(0);

  const roundedValue = Math.round(value || 0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    startValRef.current = roundedValue;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartXRef.current;
      const step = moveEvent.shiftKey ? 5 : 1;
      const rawNewVal = startValRef.current + Math.round(deltaX / 2);
      const stepped = Math.round(rawNewVal / step) * step;

      const min = axis === 'z' ? -180 : -85;
      const max = axis === 'z' ? 180 : 85;
      onChange(clampRotation(stepped, min, max));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    onReset();
  };

  // Generate 30 tick marks around 360 degrees (12 deg spacing)
  const ticks = Array.from({ length: 30 }, (_, i) => i * 12);

  return (
    <button
      type="button"
      className={`bottom-axis-button ${isDragging ? 'is-dragging' : ''}`}
      data-axis={axis}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={`${axis.toUpperCase()} rotation: ${roundedValue}°. Drag left/right to adjust, Shift for 5° increments, double-click to reset.`}
    >
      <svg className="axis-compass-ring" viewBox="0 0 40 40" aria-hidden="true" shapeRendering="geometricPrecision">
        {ticks.map((deg, i) => (
          <line
            key={i}
            className={deg === 0 ? 'axis-zero-tick' : ''}
            x1="20"
            y1="2"
            x2="20"
            y2={deg % 36 === 0 ? '6' : '4'}
            transform={`rotate(${deg + roundedValue} 20 20)`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span className="axis-label">{axis.toUpperCase()}</span>
      <strong>{roundedValue}°</strong>
    </button>
  );
};
