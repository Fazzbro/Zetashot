import React, { useState, useEffect } from 'react';
import { Crosshair, Camera, Maximize2, Sparkles, X } from 'lucide-react';

interface SelectedElementInfo {
  rect: DOMRect;
  selector: string;
  tagName: string;
  width: number;
  height: number;
}

interface ElementPickerOverlayProps {
  active: boolean;
  onClose: () => void;
  onCaptureElement: (info: SelectedElementInfo) => void;
  onZoomToElement: (info: SelectedElementInfo) => void;
}

export const ElementPickerOverlay: React.FC<ElementPickerOverlayProps> = ({
  active,
  onClose,
  onCaptureElement,
  onZoomToElement,
}) => {
  const [hoveredInfo, setHoveredInfo] = useState<SelectedElementInfo | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<SelectedElementInfo | null>(null);

  useEffect(() => {
    if (!active) {
      setHoveredInfo(null);
      setSelectedInfo(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (selectedInfo) return; // don't update hover if locked

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target || target.closest('.element-picker-ui')) return;

      const rect = target.getBoundingClientRect();
      const tagName = target.tagName.toLowerCase();
      const id = target.id ? `#${target.id}` : '';
      const className = typeof target.className === 'string' && target.className
        ? `.${target.className.split(' ')[0]}`
        : '';
      const selector = `${tagName}${id}${className}`;

      setHoveredInfo({
        rect,
        selector,
        tagName,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target || target.closest('.element-picker-ui')) return;

      e.preventDefault();
      e.stopPropagation();

      if (hoveredInfo) {
        setSelectedInfo(hoveredInfo);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, hoveredInfo, selectedInfo, onClose]);

  if (!active) return null;

  const current = selectedInfo || hoveredInfo;

  return (
    <div
      className="element-picker-ui"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: selectedInfo ? 'auto' : 'none',
        zIndex: 9999,
      }}
    >
      {/* Top Notification Bar */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(13, 18, 31, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--accent-primary)',
          borderRadius: 'var(--radius-full)',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'auto',
        }}
      >
        <Crosshair size={15} color="var(--accent-primary)" />
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#f8fafc' }}>
          {selectedInfo ? 'Element Selected' : 'Hover over any element and click to select'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            color: '#94a3b8',
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Target Bounding Box Highlight */}
      {current && (
        <div
          style={{
            position: 'fixed',
            left: current.rect.left,
            top: current.rect.top,
            width: current.rect.width,
            height: current.rect.height,
            border: selectedInfo ? '2px solid #10b981' : '2px dashed #6366f1',
            backgroundColor: selectedInfo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.15)',
            pointerEvents: 'none',
            borderRadius: 4,
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.05s ease',
          }}
        >
          {/* Dimension & Tag Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              left: 0,
              background: '#090d16',
              border: '1px solid var(--border-default)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span>{current.selector}</span>
            <span style={{ color: '#94a3b8' }}>{current.width} × {current.height}</span>
          </div>
        </div>
      )}

      {/* Action Dialog when an element is clicked */}
      {selectedInfo && (
        <div
          style={{
            position: 'fixed',
            left: selectedInfo.rect.left + selectedInfo.rect.width / 2,
            top: Math.min(window.innerHeight - 80, selectedInfo.rect.bottom + 12),
            transform: 'translateX(-50%)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <button
            className="btn-primary"
            style={{ fontSize: '11px', padding: '5px 10px' }}
            onClick={() => {
              onCaptureElement(selectedInfo);
              onClose();
            }}
          >
            <Camera size={13} />
            Capture Element
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '5px 10px' }}
            onClick={() => {
              onZoomToElement(selectedInfo);
              onClose();
            }}
          >
            <Maximize2 size={13} />
            Zoom & Center
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '5px 8px' }}
            onClick={() => setSelectedInfo(null)}
          >
            Reselect
          </button>
        </div>
      )}
    </div>
  );
};
