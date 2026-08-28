import React, { useState, useRef, useEffect } from 'react';
import { InterestRegion } from '../utils/interestRegionEngine';
import { X } from 'lucide-react';

interface InterestRegionOverlayProps {
  isComposeActive: boolean;
  isActive: boolean; // is marking tool active
  regions: InterestRegion[];
  onRegionsChange: (regions: InterestRegion[]) => void;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  width: number;
  height: number;
}

export const InterestRegionOverlay: React.FC<InterestRegionOverlayProps> = ({
  isComposeActive,
  isActive,
  regions,
  onRegionsChange,
  selectedRegionId,
  onSelectRegion,
  width,
  height,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };

    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(width, Math.round(rawX))),
      y: Math.max(0, Math.min(height, Math.round(rawY))),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) return;
    if ((e.target as HTMLElement).closest('.region-delete-btn')) return;

    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const pt = getCanvasCoords(e.clientX, e.clientY);

    isDrawingRef.current = true;
    startPointRef.current = pt;
    currentPointRef.current = pt;

    setIsDrawing(true);
    setStartPoint(pt);
    setCurrentPoint(pt);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !startPointRef.current || !overlayRef.current) return;
      const pt = getCanvasCoords(e.clientX, e.clientY);
      currentPointRef.current = pt;
      setCurrentPoint(pt);
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (!isDrawingRef.current || !startPointRef.current) {
        isDrawingRef.current = false;
        startPointRef.current = null;
        currentPointRef.current = null;
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        return;
      }

      const sp = startPointRef.current;
      const cp = getCanvasCoords(e.clientX, e.clientY);

      const minX = Math.max(0, Math.min(sp.x, cp.x));
      const minY = Math.max(0, Math.min(sp.y, cp.y));
      const maxX = Math.min(width, Math.max(sp.x, cp.x));
      const maxY = Math.min(height, Math.max(sp.y, cp.y));

      const w = maxX - minX;
      const h = maxY - minY;

      // Create region if greater than threshold (at least 20px wide & high)
      if (w >= 20 && h >= 20) {
        const nextIndex = regions.length + 1;
        const newRegion: InterestRegion = {
          id: `region_${Date.now()}_${nextIndex}`,
          index: nextIndex,
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(w),
          height: Math.round(h),
          label: `Region ${nextIndex}`,
        };

        const updated = [...regions, newRegion];
        onRegionsChange(updated);
        onSelectRegion(newRegion.id);
      }

      isDrawingRef.current = false;
      startPointRef.current = null;
      currentPointRef.current = null;
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [width, height, regions, onRegionsChange, onSelectRegion]);

  const handleDeleteRegion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = regions
      .filter((r) => r.id !== id)
      .map((r, i) => ({ ...r, index: i + 1 }));
    onRegionsChange(remaining);
    if (selectedRegionId === id) {
      onSelectRegion(remaining[0]?.id || null);
    }
  };

  if (!isComposeActive) {
    return null;
  }

  const activeRect =
    isDrawing && startPoint && currentPoint
      ? {
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        }
      : null;

  return (
    <div
      ref={overlayRef}
      className={`interest-region-overlay-layer ${isActive ? 'is-active-marking' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isActive || regions.length > 0 ? 'auto' : 'none',
        cursor: isActive ? 'crosshair' : 'default',
        zIndex: 50,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Existing Marked Regions */}
      {regions.map((region) => {
        const isSelected = region.id === selectedRegionId;
        const leftPct = (region.x / width) * 100;
        const topPct = (region.y / height) * 100;
        const widthPct = (region.width / width) * 100;
        const heightPct = (region.height / height) * 100;

        return (
          <div
            key={region.id}
            className={`interest-region-box ${isSelected ? 'is-selected' : ''}`}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              border: isSelected ? '2px solid #2563eb' : '1.5px solid rgba(59, 130, 246, 0.85)',
              backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.12)',
              boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.45)' : '0 0 8px rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
              cursor: isActive ? 'crosshair' : 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRegion(region.id);
            }}
          >
            {/* Numbered Circle Badge Centered Matching Screenshot */}
            <div
              className="interest-badge-pill"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {region.index}
            </div>

            {/* Delete button on active selection */}
            {isActive && (
              <button
                type="button"
                className="region-action-btn region-delete-btn"
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={(e) => handleDeleteRegion(region.id, e)}
                title="Remove interest region"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {/* Dynamic Drawing Box */}
      {activeRect && (
        <div
          className="interest-region-drawing-box"
          style={{
            position: 'absolute',
            left: `${(activeRect.x / width) * 100}%`,
            top: `${(activeRect.y / height) * 100}%`,
            width: `${(activeRect.width / width) * 100}%`,
            height: `${(activeRect.height / height) * 100}%`,
            border: '2px dashed #60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.2)',
            borderRadius: '6px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              userSelect: 'none',
            }}
          >
            {regions.length + 1}
          </div>
        </div>
      )}
    </div>
  );
};
