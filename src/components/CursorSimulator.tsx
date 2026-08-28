import React, { useEffect, useState } from 'react';
import { CursorConfig } from '../utils/projectSerialization';

interface CursorSimulatorProps {
  config: CursorConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  type: 'left' | 'right';
}

export const CursorSimulator: React.FC<CursorSimulatorProps> = ({ config, containerRef }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || config.mode === 'hidden') return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPos({ x, y });
    };

    const handleMouseLeave = () => {
      setPos(null);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsClicking(true);

      if (config.clickRipple) {
        const newRipple: Ripple = {
          id: Date.now() + Math.random(),
          x,
          y,
          type: e.button === 2 ? 'right' : 'left',
        };
        setRipples((prev) => [...prev.slice(-4), newRipple]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, config.clickDuration || 400);
      }
    };

    const handleMouseUp = () => {
      setIsClicking(false);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [config, containerRef]);

  if (config.mode === 'hidden' || !pos) return null;

  const cursorScale = config.mode === 'large' ? 1.5 : 1;
  const size = config.size * cursorScale;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 90,
        overflow: 'hidden',
      }}
    >
      {/* Click Ripple Animations */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
            width: config.highlightRadius * 2,
            height: config.highlightRadius * 2,
            borderRadius: '50%',
            backgroundColor: ripple.type === 'right' ? '#3b82f6' : (config.clickColor || '#ef4444'),
            opacity: 0.6,
            animation: `rippleEffect ${config.clickDuration}ms ease-out forwards`,
          }}
        />
      ))}

      {/* Highlight Glow Ring */}
      {config.mode === 'highlighted' && (
        <div
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -50%)',
            width: config.highlightRadius * 2,
            height: config.highlightRadius * 2,
            borderRadius: '50%',
            backgroundColor: config.highlightColor || '#f59e0b',
            opacity: isClicking ? 0.45 : 0.25,
            boxShadow: `0 0 16px ${config.highlightColor || '#f59e0b'}`,
            transition: 'opacity 0.1s ease',
          }}
        />
      )}

      {/* Simulated Cursor SVG Arrow */}
      <svg
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: size,
          height: size,
          transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.92)' : 'scale(1)'}`,
          opacity: config.opacity || 0.9,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          transition: 'transform 0.08s ease',
        }}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M3 3L10.07 20.97L13.58 13.58L20.97 10.07L3 3Z"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
