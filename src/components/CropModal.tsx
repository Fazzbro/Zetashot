import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

export interface CropRect {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number; // percentage 0..100
  height: number; // percentage 0..100
}

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaName: string;
  mediaUrl: string;
  mediaType: 'demo' | 'video' | 'image' | '3d';
  currentCrop: CropRect;
  onApplyCrop: (crop: CropRect) => void;
}

type DragHandleType = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'move';

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  mediaName,
  mediaUrl,
  mediaType,
  currentCrop,
  onApplyCrop,
}) => {
  const [crop, setCrop] = useState<CropRect>(currentCrop);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
  };

  const handleApply = () => {
    onApplyCrop(crop);
    onClose();
  };

  // Comprehensive 8-point handles + center move drag logic
  const handleStartDrag = (
    type: DragHandleType,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const initialRect = containerRef.current.getBoundingClientRect();
    const startMouseX = ((e.clientX - initialRect.left) / initialRect.width) * 100;
    const startMouseY = ((e.clientY - initialRect.top) / initialRect.height) * 100;
    const initialCrop = { ...crop };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const curMouseX = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const curMouseY = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      const deltaX = curMouseX - startMouseX;
      const deltaY = curMouseY - startMouseY;

      setCrop(() => {
        let { x, y, width, height } = initialCrop;

        if (type === 'move') {
          const maxX = 100 - width;
          const maxY = 100 - height;
          const newX = Math.max(0, Math.min(maxX, x + deltaX));
          const newY = Math.max(0, Math.min(maxY, y + deltaY));
          return { x: newX, y: newY, width, height };
        }

        // Top adjustment
        if (type === 't' || type === 'tl' || type === 'tr') {
          const bottom = y + height;
          const newY = Math.max(0, Math.min(curMouseY, bottom - 10));
          y = newY;
          height = bottom - newY;
        }

        // Bottom adjustment
        if (type === 'b' || type === 'bl' || type === 'br') {
          const newHeight = Math.max(10, Math.min(100 - y, curMouseY - y));
          height = newHeight;
        }

        // Left adjustment
        if (type === 'l' || type === 'tl' || type === 'bl') {
          const right = x + width;
          const newX = Math.max(0, Math.min(curMouseX, right - 10));
          x = newX;
          width = right - newX;
        }

        // Right adjustment
        if (type === 'r' || type === 'tr' || type === 'br') {
          const newWidth = Math.max(10, Math.min(100 - x, curMouseX - x));
          width = newWidth;
        }

        return {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          width: Number(width.toFixed(2)),
          height: Number(height.toFixed(2)),
        };
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const calcW = Math.round(2974 * (crop.width / 100));
  const calcH = Math.round(1842 * (crop.height / 100));

  return (
    <div className="crop-modal-backdrop" onClick={onClose}>
      <div className="crop-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="crop-modal-header">
          <div>
            <h3>Crop {mediaType === 'video' ? 'video' : 'photo'}</h3>
            <p>{mediaName} • Original stays available</p>
          </div>
          <button type="button" className="crop-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Media Preview Container */}
        <div className="crop-stage-container" ref={containerRef}>
          {/* Background Mockup Media */}
          <div className="crop-media-wrapper">
            {mediaType === 'demo' ? (
              <div className="crop-demo-placeholder">
                <div className="placeholder-inner-text">
                  <p>I'm Michael, and I create digital products that make people feel something.</p>
                </div>
              </div>
            ) : mediaType === 'video' ? (
              <video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <img src={mediaUrl} alt="Crop preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          {/* Interactive Crop Frame with 8 Handles (4 corners + 4 edge midpoints) and Move */}
          <div
            className="crop-active-box"
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.width}%`,
              height: `${crop.height}%`,
            }}
            onMouseDown={(e) => handleStartDrag('move', e)}
          >
            {/* 3x3 Grid Lines */}
            <div className="crop-grid-overlay">
              <div /><div /><div /><div /><div /><div /><div /><div /><div />
            </div>

            {/* 4 Corner Drag Handles */}
            <div
              className="crop-yellow-handle handle-tl"
              onMouseDown={(e) => handleStartDrag('tl', e)}
              title="Drag corner to resize"
            />
            <div
              className="crop-yellow-handle handle-tr"
              onMouseDown={(e) => handleStartDrag('tr', e)}
              title="Drag corner to resize"
            />
            <div
              className="crop-yellow-handle handle-bl"
              onMouseDown={(e) => handleStartDrag('bl', e)}
              title="Drag corner to resize"
            />
            <div
              className="crop-yellow-handle handle-br"
              onMouseDown={(e) => handleStartDrag('br', e)}
              title="Drag corner to resize"
            />

            {/* 4 Edge Midpoint Drag Handles */}
            <div
              className="crop-yellow-handle handle-t"
              onMouseDown={(e) => handleStartDrag('t', e)}
              title="Drag top edge to resize height"
            />
            <div
              className="crop-yellow-handle handle-b"
              onMouseDown={(e) => handleStartDrag('b', e)}
              title="Drag bottom edge to resize height"
            />
            <div
              className="crop-yellow-handle handle-l"
              onMouseDown={(e) => handleStartDrag('l', e)}
              title="Drag left edge to resize width"
            />
            <div
              className="crop-yellow-handle handle-r"
              onMouseDown={(e) => handleStartDrag('r', e)}
              title="Drag right edge to resize width"
            />
          </div>
        </div>

        {/* Dimension readout */}
        <div className="crop-dimensions-readout">
          {calcW} × {calcH}
        </div>

        {/* Footer actions */}
        <div className="crop-modal-footer">
          <button type="button" className="crop-btn-reset" onClick={handleReset}>
            Reset
          </button>
          <div className="crop-footer-right">
            <button type="button" className="crop-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="crop-btn-apply" onClick={handleApply}>
              Apply crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
