import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ProjectState } from '../utils/projectSerialization';
import { DeviceMockupFrame } from './DeviceMockupFrame';
import { CursorSimulator } from './CursorSimulator';
import { generateBackgroundCss } from '../utils/gradientUtils';
import { calculateZoomAroundPoint, clampZoom, snapToGuides, formatDimensions } from '../utils/transformMath';

interface CompositionCanvasProps {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
  interactiveMode: boolean;
  showRulers: boolean;
  showGuides: boolean;
  showSafeArea: boolean;
  composedAreaRef: React.RefObject<HTMLDivElement | null>;
  stream: MediaStream | null;
}

export const CompositionCanvas: React.FC<CompositionCanvasProps> = ({
  project,
  onUpdateProject,
  interactiveMode,
  showRulers,
  showGuides,
  showSafeArea,
  composedAreaRef,
  stream,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null);

  const { viewport, canvas, deviceMockup, background, effects, cursor, content } = project;

  // Sync stream to video element if active
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.warn);
    }
  }, [stream]);

  // Wheel Zoom & Pan handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (interactiveMode) return; // allow iframe/page scrolling in interactive mode

    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered on cursor
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = clampZoom(canvas.zoom * zoomFactor);

      const rect = containerRef.current?.getBoundingClientRect();
      const cursorPoint = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
      const newPan = calculateZoomAroundPoint(canvas.zoom, newZoom, cursorPoint, canvas.pan);

      onUpdateProject({
        canvas: { ...canvas, zoom: newZoom, pan: newPan },
      });
    } else {
      // Pan
      onUpdateProject({
        canvas: {
          ...canvas,
          pan: {
            x: canvas.pan.x - e.deltaX,
            y: canvas.pan.y - e.deltaY,
          },
        },
      });
    }
  }, [interactiveMode, canvas, onUpdateProject]);

  // Drag Panning in Transform Mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (interactiveMode || e.button !== 0) return;

    // Check if clicking on background container to pan
    const target = e.target as HTMLElement;
    if (target.closest('.mockup-address-bar') || target.closest('input')) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX - canvas.pan.x, y: e.clientY - canvas.pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    const rawX = e.clientX - panStart.x;
    const rawY = e.clientY - panStart.y;

    if (showGuides && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const snap = snapToGuides(
        { x: rawX, y: rawY },
        { width: viewport.width * canvas.zoom, height: viewport.height * canvas.zoom },
        { width: containerRect.width, height: containerRect.height }
      );

      setSnapGuideX(snap.snappedX ? snap.snappedPosition.x : null);
      setSnapGuideY(snap.snappedY ? snap.snappedPosition.y : null);

      onUpdateProject({
        canvas: { ...canvas, pan: snap.snappedPosition },
      });
    } else {
      onUpdateProject({
        canvas: { ...canvas, pan: { x: rawX, y: rawY } },
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setSnapGuideX(null);
    setSnapGuideY(null);
  };

  // Background CSS calculation
  const bgCss = generateBackgroundCss(background);
  const isTransparent = background.type === 'transparent';

  // Overall Composed Frame total dimensions (viewport + padding)
  const totalFrameWidth = viewport.width + canvas.padding * 2;
  const totalFrameHeight = viewport.height + canvas.padding * 2;

  return (
    <div
      className="canvas-viewport-container"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: interactiveMode ? 'default' : isPanning ? 'grabbing' : 'grab' }}
    >
      {/* 1. Horizontal & Vertical Rulers */}
      {showRulers && (
        <>
          <div className="canvas-ruler-horizontal">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
              <span>0px</span>
              <span>{Math.round(totalFrameWidth / 4)}px</span>
              <span>{Math.round(totalFrameWidth / 2)}px</span>
              <span>{Math.round((totalFrameWidth * 3) / 4)}px</span>
              <span>{totalFrameWidth}px</span>
            </div>
          </div>
          <div className="canvas-ruler-vertical" />
        </>
      )}

      {/* 2. Snapping Crosshair Lines */}
      {snapGuideX !== null && <div className="snap-guide-x" style={{ left: `calc(50% + ${snapGuideX}px)` }} />}
      {snapGuideY !== null && <div className="snap-guide-y" style={{ top: `calc(50% + ${snapGuideY}px)` }} />}

      {/* 3. Scalable / Transformable Canvas Layer */}
      <div
        className="canvas-transform-layer"
        style={{
          transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom}) rotate(${canvas.rotation}deg)`,
        }}
      >
        {/* The Composed Area that is captured in screenshots and recordings */}
        <div
          ref={composedAreaRef}
          className={`composed-frame ${isTransparent ? 'transparent-bg' : ''}`}
          style={{
            width: `${totalFrameWidth}px`,
            height: `${totalFrameHeight}px`,
            padding: `${canvas.padding}px`,
            background: isTransparent ? undefined : bgCss,
            backgroundSize: background.imageUrl ? 'cover' : undefined,
            backgroundPosition: 'center',
          }}
        >
          {/* Safe Area Guide Box */}
          {showSafeArea && (
            <div className="safe-area-overlay">
              <span className="safe-area-label">Safe Export Area</span>
            </div>
          )}

          {/* Device Mockup Shell */}
          <DeviceMockupFrame
            config={deviceMockup}
            effects={effects}
            width={viewport.width}
            height={viewport.height}
            interactive={interactiveMode}
            onUrlChange={(url) => onUpdateProject({ deviceMockup: { ...deviceMockup, url } })}
          >
            {/* Interactive Content inside Mockup */}
            {stream ? (
              <video
                ref={videoRef}
                className="mockup-video-view"
                autoPlay
                playsInline
                muted
              />
            ) : content.type === 'image' && content.imageData ? (
              <img
                src={content.imageData}
                alt="Captured Content"
                className="mockup-image-view"
              />
            ) : (
              <iframe
                src={deviceMockup.url || 'https://example.com'}
                title="Mockup Target Page"
                className="mockup-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy"
              />
            )}

            {/* Cursor Overlay */}
            <CursorSimulator config={cursor} containerRef={composedAreaRef} />
          </DeviceMockupFrame>
        </div>
      </div>

      {/* 4. Floating Info Badge at Bottom */}
      <div className="canvas-floating-bar">
        <span className="canvas-status-badge">
          {formatDimensions(viewport.width, viewport.height, viewport.scale)}
        </span>
        <span style={{ color: 'var(--border-default)' }}>|</span>
        <span className="canvas-status-badge">
          Zoom: {Math.round(canvas.zoom * 100)}%
        </span>
      </div>
    </div>
  );
};
