import React, { useRef, useCallback } from 'react';
import { TextLayerOverlay } from '../types/textLayer';
import { getTextLayerInterpolation, getFontFamilyCss } from '../utils/textLayer';

interface TextOverlayStageProps {
  layers: TextLayerOverlay[];
  currentTime: number;
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onChangeLayer: (layer: TextLayerOverlay) => void;
  stageScale: number;
  isPlaying?: boolean;
}

export const TextOverlayStage: React.FC<TextOverlayStageProps> = ({
  layers,
  currentTime,
  selectedLayerId,
  onSelectLayer,
  onChangeLayer,
  stageScale,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging text layer on stage to reposition x, y
  const handleStartDrag = useCallback(
    (e: React.PointerEvent, layer: TextLayerOverlay) => {
      e.preventDefault();
      e.stopPropagation();

      onSelectLayer(layer.id);

      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {}

      if (!containerRef.current) return;
      const stageRect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const initialLayerX = layer.x;
      const initialLayerY = layer.y;

      const onPointerMove = (ev: PointerEvent) => {
        if (stageRect.width <= 0 || stageRect.height <= 0) return;
        const deltaXPct = ((ev.clientX - startX) / stageRect.width) * 100;
        const deltaYPct = ((ev.clientY - startY) / stageRect.height) * 100;

        const newX = Math.max(0, Math.min(100, Number((initialLayerX + deltaXPct).toFixed(1))));
        const newY = Math.max(0, Math.min(100, Number((initialLayerY + deltaYPct).toFixed(1))));

        onChangeLayer({
          ...layer,
          x: newX,
          y: newY,
        });
      };

      const onPointerUp = (ev: PointerEvent) => {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [onChangeLayer, onSelectLayer]
  );

  return (
    <div
      ref={containerRef}
      className="text-overlay-stage-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {layers.map((layer) => {
        const isSelected = layer.id === selectedLayerId;
        const anim = getTextLayerInterpolation(layer, currentTime);

        // If not playing, keep selected layer softly visible for positioning
        const shouldShow = anim.visible || (isSelected && !isPlaying);
        if (!shouldShow) return null;

        const opacity = !isPlaying ? (isSelected ? 1.0 : Math.max(0.65, anim.opacity)) : anim.opacity;
        const translateY = isPlaying ? anim.translateY * stageScale : 0;
        const scale = isPlaying ? anim.scale : 1.0;
        const fontSizePx = Math.max(12, Math.round(layer.fontSize * stageScale));

        return (
          <div
            key={layer.id}
            className={`stage-text-item ${isSelected ? 'is-selected-text-item' : ''} ${layer.shadow ? 'has-shadow' : ''}`}
            onPointerDown={(e) => handleStartDrag(e, layer)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLayer(layer.id);
            }}
            style={{
              position: 'absolute',
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              transform: `translate(-50%, -50%) translate3d(0, ${translateY}px, 0) scale(${scale})`,
              transformOrigin: 'center center',
              width: 'max-content',
              maxWidth: 'none',
              whiteSpace: 'pre',
              opacity,
              fontFamily: getFontFamilyCss(layer.fontFamily),
              fontSize: `${fontSizePx}px`,
              fontWeight: layer.fontWeight || '700',
              color: layer.color || '#ffffff',
              textAlign: layer.textAlign || 'center',
              textShadow: layer.shadow ? '0 2px 8px rgba(0, 0, 0, 0.45)' : 'none',
              pointerEvents: 'auto',
              cursor: isPlaying ? 'default' : 'grab',
              userSelect: 'none',
            }}
          >
            {layer.text.split('\n').map((line, lIdx) => (
              <div key={lIdx} style={{ whiteSpace: 'pre' }}>{line || '\u00A0'}</div>
            ))}

            {/* Subtle Selection Bounding Box & Drag Indicator when selected */}
            {isSelected && !isPlaying && (
              <div className="stage-text-selection-box">
                <span className="selection-handle top-left" />
                <span className="selection-handle top-right" />
                <span className="selection-handle bottom-left" />
                <span className="selection-handle bottom-right" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
