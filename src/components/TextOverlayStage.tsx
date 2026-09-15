import React, { useRef, useCallback } from 'react';
import { TextLayerOverlay } from '../types/textLayer';
import {
  getTextLayerInterpolation,
  getFontFamilyCss,
  getStaggeredProgress,
  getTokenInterpolation,
  getScrambledString,
} from '../utils/textLayer';

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
  isPlaying = false,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialX: number; initialY: number } | null>(null);
  const activeDragLayerRef = useRef<TextLayerOverlay | null>(null);

  const handleStartDrag = useCallback(
    (e: React.PointerEvent, layer: TextLayerOverlay) => {
      e.stopPropagation();
      onSelectLayer(layer.id);
      if (isPlaying) return;

      isDraggingRef.current = true;
      activeDragLayerRef.current = layer;
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initialX: layer.x,
        initialY: layer.y,
      };

      const handlePointerMove = (moveEv: PointerEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current || !activeDragLayerRef.current) return;
        const stageContainer = document.querySelector('.stage-container') as HTMLElement | null;
        if (!stageContainer) return;

        const stageRect = stageContainer.getBoundingClientRect();
        const deltaXPct = ((moveEv.clientX - dragStartRef.current.clientX) / stageRect.width) * 100;
        const deltaYPct = ((moveEv.clientY - dragStartRef.current.clientY) / stageRect.height) * 100;

        const nextX = Math.max(0, Math.min(100, Number((dragStartRef.current.initialX + deltaXPct).toFixed(1))));
        const nextY = Math.max(0, Math.min(100, Number((dragStartRef.current.initialY + deltaYPct).toFixed(1))));

        onChangeLayer({
          ...activeDragLayerRef.current,
          x: nextX,
          y: nextY,
        });
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        activeDragLayerRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [isPlaying, onSelectLayer, onChangeLayer]
  );

  return (
    <div
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

        const isAnimating = isPlaying && (anim.phase === 'in' || anim.phase === 'out');
        const activeAnimType = anim.phase === 'out' ? layer.outAnimation : layer.inAnimation;
        const scope = layer.animationScope || 'word';

        const opacity = !isPlaying ? (isSelected ? 1.0 : Math.max(0.65, anim.opacity)) : anim.opacity;
        const translateY = isPlaying && scope === 'all' ? anim.translateY * stageScale : 0;
        const scale = isPlaying && scope === 'all' ? anim.scale : 1.0;
        const blurPx = isPlaying && scope === 'all' && anim.blur ? anim.blur * stageScale : 0;
        const rotateXDeg = isPlaying && scope === 'all' && anim.rotateX ? anim.rotateX : 0;
        const fontSizePx = Math.max(12, Math.round(layer.fontSize * stageScale));

        // Stagger phase progress
        const effectiveInDur = Math.max(0.01, Math.min(layer.inDuration || 0.35, layer.duration / 2));
        const effectiveOutDur = Math.max(0.01, Math.min(layer.outDuration || 0.35, layer.duration / 2));
        const phaseProgress = anim.phase === 'in'
          ? Math.max(0, Math.min(1, (currentTime - layer.startTime) / effectiveInDur))
          : anim.phase === 'out'
          ? Math.max(0, Math.min(1, (layer.startTime + layer.duration - currentTime) / effectiveOutDur))
          : 1.0;

        const isShimmer = layer.inAnimation === 'shimmer' || layer.outAnimation === 'shimmer';
        const shimmerStyle: React.CSSProperties = isShimmer && isPlaying ? {
          backgroundImage: `linear-gradient(90deg, ${layer.color || '#000000'} 0%, #ffffff 50%, ${layer.color || '#000000'} 100%)`,
          backgroundSize: '200% 100%',
          backgroundPosition: `${anim.shimmerOffset ?? 0}%`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } : {};

        // Calculate total tokens for staggering across words or chars
        const lines = layer.text.split('\n');
        let totalTokens = 1;
        if (scope === 'char') {
          totalTokens = Math.max(1, layer.text.replace(/\s/g, '').length);
        } else if (scope === 'word') {
          totalTokens = Math.max(1, layer.text.trim().split(/\s+/).filter(Boolean).length);
        } else if (scope === 'line') {
          totalTokens = Math.max(1, lines.length);
        }

        let tokenCounter = 0;

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
              transform: `translate(-50%, -50%) translate3d(0, ${translateY}px, 0) scale(${scale}) rotateX(${rotateXDeg}deg)`,
              transformOrigin: 'center center',
              width: 'max-content',
              maxWidth: 'none',
              whiteSpace: 'pre',
              opacity,
              fontFamily: getFontFamilyCss(layer.fontFamily),
              fontSize: `${fontSizePx}px`,
              fontWeight: layer.fontWeight || '700',
              color: layer.color || '#000000',
              textAlign: layer.textAlign || 'center',
              lineHeight: layer.lineHeight ?? 0.95,
              letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * stageScale}px` : 'normal',
              textShadow: layer.shadow ? '0 2px 8px rgba(0, 0, 0, 0.45)' : 'none',
              filter: blurPx > 0.5 ? `blur(${blurPx}px)` : 'none',
              perspective: '1000px',
              transformStyle: 'preserve-3d',
              pointerEvents: 'auto',
              cursor: isPlaying ? 'default' : 'grab',
              userSelect: 'none',
              ...shimmerStyle,
            }}
          >
            {lines.map((line, lIdx) => {
              if (!isAnimating || scope === 'all') {
                const isLineScramble = isAnimating && activeAnimType === 'scramble' && anim.scrambleProgress !== undefined && anim.scrambleProgress < 1;
                const displayText = isLineScramble ? getScrambledString(line, anim.scrambleProgress!) : (line || '\u00A0');
                return (
                  <div
                    key={lIdx}
                    style={{
                      whiteSpace: 'pre',
                      lineHeight: layer.lineHeight ?? 0.95,
                      letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * stageScale}px` : 'normal',
                      textAlign: layer.textAlign || 'center',
                    }}
                  >
                    {displayText}
                  </div>
                );
              }

              if (scope === 'line') {
                const lineProg = getStaggeredProgress(phaseProgress, lIdx, totalTokens);
                const tokenAnim = getTokenInterpolation(activeAnimType, lineProg, anim.phase);
                const isLineScramble = activeAnimType === 'scramble' && tokenAnim.scrambleProgress < 1;
                const lineText = isLineScramble ? getScrambledString(line, tokenAnim.scrambleProgress, lIdx + 1) : (line || '\u00A0');

                return (
                  <div
                    key={lIdx}
                    style={{
                      whiteSpace: 'pre',
                      lineHeight: layer.lineHeight ?? 0.95,
                      letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * stageScale}px` : 'normal',
                      textAlign: layer.textAlign || 'center',
                      opacity: tokenAnim.opacity,
                      transform: `translate3d(0, ${tokenAnim.translateY * stageScale}px, 0) scale(${tokenAnim.scale}) rotateX(${tokenAnim.rotateX}deg)`,
                      filter: tokenAnim.blur > 0.5 ? `blur(${tokenAnim.blur * stageScale}px)` : 'none',
                      transformOrigin: 'center center',
                    }}
                  >
                    {lineText}
                  </div>
                );
              }

              // Word or Character granularity
              const rawWords = line.split(/(\s+)/);

              return (
                <div
                  key={lIdx}
                  style={{
                    whiteSpace: 'pre',
                    lineHeight: layer.lineHeight ?? 0.95,
                    letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * stageScale}px` : 'normal',
                    textAlign: layer.textAlign || 'center',
                  }}
                >
                  {rawWords.map((token, wIdx) => {
                    if (/^\s+$/.test(token)) {
                      return <span key={wIdx} style={{ whiteSpace: 'pre' }}>{token}</span>;
                    }

                    if (scope === 'word') {
                      const tIdx = tokenCounter++;
                      const wordProg = getStaggeredProgress(phaseProgress, tIdx, totalTokens);
                      const tokenAnim = getTokenInterpolation(activeAnimType, wordProg, anim.phase);
                      const isWordScramble = activeAnimType === 'scramble' && tokenAnim.scrambleProgress < 1;
                      const wordText = isWordScramble ? getScrambledString(token, tokenAnim.scrambleProgress, tIdx + 1) : token;

                      return (
                        <span
                          key={wIdx}
                          style={{
                            display: 'inline-block',
                            whiteSpace: 'pre',
                            opacity: tokenAnim.opacity,
                            transform: `translate3d(0, ${tokenAnim.translateY * stageScale}px, 0) scale(${tokenAnim.scale}) rotateX(${tokenAnim.rotateX}deg)`,
                            filter: tokenAnim.blur > 0.5 ? `blur(${tokenAnim.blur * stageScale}px)` : 'none',
                            transformOrigin: 'center center',
                          }}
                        >
                          {wordText}
                        </span>
                      );
                    }

                    // Character scope
                    const chars = token.split('');
                    return (
                      <span key={wIdx} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
                        {chars.map((ch, cIdx) => {
                          const tIdx = tokenCounter++;
                          const charProg = getStaggeredProgress(phaseProgress, tIdx, totalTokens);
                          const tokenAnim = getTokenInterpolation(activeAnimType, charProg, anim.phase);
                          const isCharScramble = activeAnimType === 'scramble' && tokenAnim.scrambleProgress < 1;
                          const charText = isCharScramble ? getScrambledString(ch, tokenAnim.scrambleProgress, tIdx + 1) : ch;

                          return (
                            <span
                              key={cIdx}
                              style={{
                                display: 'inline-block',
                                whiteSpace: 'pre',
                                opacity: tokenAnim.opacity,
                                transform: `translate3d(0, ${tokenAnim.translateY * stageScale}px, 0) scale(${tokenAnim.scale}) rotateX(${tokenAnim.rotateX}deg)`,
                                filter: tokenAnim.blur > 0.5 ? `blur(${tokenAnim.blur * stageScale}px)` : 'none',
                                transformOrigin: 'center center',
                              }}
                            >
                              {charText}
                            </span>
                          );
                        })}
                      </span>
                    );
                  })}
                </div>
              );
            })}

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
