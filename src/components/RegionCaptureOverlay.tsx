import React, { useState, useEffect, useRef } from 'react';
import { Crop, Check, X } from 'lucide-react';
import { calculateAspectRatio } from '../utils/transformMath';

interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionCaptureOverlayProps {
  active: boolean;
  onClose: () => void;
  onCaptureRegion: (rect: RegionRect) => void;
}

export const RegionCaptureOverlay: React.FC<RegionCaptureOverlayProps> = ({
  active,
  onClose,
  onCaptureRegion,
}) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<RegionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!active) {
      setStartPos(null);
      setCurrentRect(null);
      setIsDragging(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.region-actions-bar')) return;

    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startPos) return;

    const x = Math.min(startPos.x, e.clientX);
    const y = Math.min(startPos.y, e.clientY);
    const width = Math.abs(e.clientX - startPos.x);
    const height = Math.abs(e.clientY - startPos.y);

    setCurrentRect({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        cursor: 'crosshair',
        zIndex: 9999,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Instructions header */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(13, 18, 31, 0.95)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '12px',
          color: '#f8fafc',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'auto',
        }}
      >
        <Crop size={14} color="var(--accent-primary)" />
        <span>Click and drag a rectangle to capture a region (Esc to cancel)</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            color: '#94a3b8',
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Marquee Selection Rectangle */}
      {currentRect && currentRect.width > 4 && currentRect.height > 4 && (
        <div
          style={{
            position: 'fixed',
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.width,
            height: currentRect.height,
            border: '2px solid var(--accent-primary)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none',
          }}
        >
          {/* Dimension Tag */}
          <div
            style={{
              position: 'absolute',
              top: -24,
              left: 0,
              background: '#090d16',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#38bdf8',
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(currentRect.width)} × {Math.round(currentRect.height)} ({calculateAspectRatio(currentRect.width, currentRect.height)})
          </div>

          {/* Action Bar at bottom of marquee */}
          {!isDragging && (
            <div
              className="region-actions-bar"
              style={{
                position: 'absolute',
                bottom: -40,
                right: 0,
                display: 'flex',
                gap: 6,
                pointerEvents: 'auto',
              }}
            >
              <button
                className="btn-primary"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => {
                  onCaptureRegion(currentRect);
                  onClose();
                }}
              >
                <Check size={12} />
                Capture
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={onClose}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
