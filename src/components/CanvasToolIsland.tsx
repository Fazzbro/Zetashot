import React from 'react';
import { Move, RotateCw, Crosshair } from 'lucide-react';
import { Camera3DState } from '../utils/camera3D';

interface CanvasToolIslandProps {
  dragMode: 'move' | 'orbit';
  onDragModeChange: (mode: 'move' | 'orbit') => void;
  camera: Camera3DState;
  onResetPan: () => void;
}

export const CanvasToolIsland: React.FC<CanvasToolIslandProps> = ({
  dragMode,
  onDragModeChange,
  camera,
  onResetPan,
}) => {
  const isPanned = (camera.panX && camera.panX !== 0) || (camera.panY && camera.panY !== 0);

  return (
    <div className="canvas-tool-pill-island" data-guide="drag-mode-toggle">
      <button
        type="button"
        className={`canvas-tool-btn ${dragMode === 'move' ? 'is-active' : ''}`}
        onClick={() => onDragModeChange('move')}
        title="Move Tool: Drag media anywhere on canvas (Shortcut: V, or hold Space)"
        aria-label="Move Media Tool"
      >
        <Move size={13} />
        <span>Move</span>
        <kbd className="canvas-tool-kbd">V</kbd>
      </button>

      <button
        type="button"
        className={`canvas-tool-btn ${dragMode === 'orbit' ? 'is-active' : ''}`}
        onClick={() => onDragModeChange('orbit')}
        title="3D Orbit Tool: Drag to rotate angles in 3D (Shortcut: R, or hold Alt)"
        aria-label="3D Orbit Tool"
      >
        <RotateCw size={13} />
        <span>Orbit</span>
        <kbd className="canvas-tool-kbd">R</kbd>
      </button>

      {isPanned && (
        <button
          type="button"
          className="canvas-tool-btn reset-pan-btn"
          onClick={onResetPan}
          title={`Reset media to center position (X: ${camera.panX}px, Y: ${camera.panY}px)`}
          aria-label="Reset Media Position"
        >
          <Crosshair size={12} />
          <span>Center</span>
        </button>
      )}
    </div>
  );
};
