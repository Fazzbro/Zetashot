import React, { useEffect, useCallback } from 'react';
import {
  Sparkles,
  Move,
  Sliders,
  Focus,
  Film,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Camera3DState } from '../utils/camera3D';

export interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  actionHint: string;
  detail: string;
  icon: React.ReactNode;
  targetElementSelector: string;
  shortcut?: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'media-library',
    stepNumber: 1,
    title: 'Media & Templates',
    subtitle: 'Upload custom assets or choose presets',
    actionHint: "Click '+ Add media' at the top-left to upload an image/video or select a template.",
    detail: 'Supports PNG, JPEG, WebP, MP4 screen recordings, and live interactive web demos.',
    icon: <Sparkles size={15} color="#ffffff" />,
    targetElementSelector: '[data-guide="add-media"]',
    shortcut: 'Add Media',
  },
  {
    id: 'move-and-orbit',
    stepNumber: 2,
    title: 'Move & 3D Orbit Camera',
    subtitle: 'Pan media position or tilt in 3D',
    actionHint: 'Drag the preview to move the media. Press V for Move tool, R for 3D Orbit.',
    detail: 'Hold Space or Shift to pan anytime. Use the Center button to reset position to (0, 0).',
    icon: <Move size={15} color="#ffffff" />,
    targetElementSelector: '[data-guide="stage-canvas"]',
    shortcut: 'V = Move • R = Orbit',
  },
  {
    id: 'studio-optics',
    stepNumber: 3,
    title: 'Studio Optics & Bokeh',
    subtitle: 'Aspect ratio, backdrops, and lens blur',
    actionHint: 'Change canvas Aspect Ratio, customize Background, or click ƒ for Depth Blur.',
    detail: 'Optical depth-of-field calculates real Z-depth distance bokeh across the 3D plane.',
    icon: <Sliders size={15} color="#ffffff" />,
    targetElementSelector: '[data-guide="camera-island"]',
    shortcut: 'ƒ = Lens Blur',
  },
  {
    id: 'ai-compose',
    stepNumber: 4,
    title: 'AI Compose Mode',
    subtitle: 'Multi-camera motion choreography',
    actionHint: "Click 'Operator' at the top, drag a rectangle over your media, then click 'Compose' to choreograph camera motion.",
    detail: 'Click Operator to enter Compose mode, drag to frame a rectangle on your media, and click Compose to auto-generate camera choreography.',
    icon: <Focus size={15} color="#ffffff" />,
    targetElementSelector: '[data-guide="top-mode-island"]',
    shortcut: 'Compose',
  },
  {
    id: 'video-timeline',
    stepNumber: 5,
    title: 'Timeline & Keyframes',
    subtitle: 'Duration stretching and dividers',
    actionHint: 'Drag sequence edge handles to stretch duration, or drag the divider to adjust timing.',
    detail: 'Press Spacebar to preview live 60fps playback. Keyframes use smooth Catmull-Rom splines.',
    icon: <Film size={15} color="#ffffff" />,
    targetElementSelector: '[data-guide="video-timeline"]',
    shortcut: 'Space = Play / Pause',
  },
  {
    id: 'export-engine',
    stepNumber: 6,
    title: 'High-FPS Export & Capture',
    subtitle: 'Render 24, 30, or 60 FPS video',
    actionHint: "Select 24, 30, or 60 FPS in WebM/MP4, then click 'Export' or take a photo still.",
    detail: 'Deterministic timestamp normalization guarantees zero dropped frames and frame accuracy.',
    icon: <Zap size={15} color="#ffffff" />,
    targetElementSelector: '[data-guide="export-button"]',
    shortcut: '24 / 30 / 60 FPS',
  },
];

export interface BeginnerGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentStepIndex: number;
  onStepChange: (stepIndex: number) => void;
  onCompleteTour: () => void;
  // Real-Time Telemetry & Interactive Actions
  activeMediaName?: string;
  isMediaLibraryOpen?: boolean;
  onOpenMediaLibrary?: () => void;
  camera?: Camera3DState;
  dragMode?: 'move' | 'orbit';
  onSetDragMode?: (mode: 'move' | 'orbit') => void;
  onCenterCamera?: () => void;
  aspectRatio?: string;
  onSetAspectRatio?: (ratio: string) => void;
  blurAmount?: number;
  onSetBlur?: (blur: number) => void;
  borderRadius?: number;
  topMode?: 'operator' | 'compose';
  onSetTopMode?: (mode: 'operator' | 'compose') => void;
  interestRegionsCount?: number;
  currentTime?: number;
  totalDuration?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (time: number) => void;
  exportFps?: 24 | 30 | 60;
  exportFormat?: 'mp4' | 'webm';
  isProcessing?: boolean;
  exportProgress?: number;
  onExport?: () => void;
}

export const BeginnerGuide: React.FC<BeginnerGuideProps> = ({
  isOpen,
  onClose,
  currentStepIndex,
  onStepChange,
  onCompleteTour,
  onOpenMediaLibrary,
  topMode = 'operator',
  onSetTopMode,
  onExport,
}) => {
  const totalSteps = GUIDE_STEPS.length;

  const handleNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      onStepChange(currentStepIndex + 1);
    } else {
      confetti({
        particleCount: 100,
        spread: 80,
        colors: ['#2563eb', '#ffffff', '#60a5fa'],
        origin: { y: 0.6 },
      });
      onCompleteTour();
    }
  }, [currentStepIndex, totalSteps, onStepChange, onCompleteTour]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  }, [currentStepIndex, onStepChange]);

  // Keyboard navigation: Left/Right arrows, Enter, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Step 0: Media Library Contextual Reference Pill */}
      {currentStepIndex === 0 && (
        <button
          type="button"
          className="reference-guide-pill floating-guide-pill"
          style={{ top: '64px', left: '24px' }}
          onClick={() => {
            if (onOpenMediaLibrary) onOpenMediaLibrary();
            onStepChange(1);
          }}
          title="Click to open Media Library"
        >
          Click + to add <strong>Media</strong> or Template
        </button>
      )}

      {/* Step 3: Compose Contextual Reference Pill */}
      {currentStepIndex === 3 && (
        <button
          type="button"
          className="reference-guide-pill floating-guide-pill"
          style={{ top: '64px', left: '50%', transform: 'translateX(-50%)' }}
          onClick={() => {
            if (onSetTopMode) onSetTopMode(topMode === 'compose' ? 'operator' : 'compose');
            onStepChange(4);
          }}
          title="Click to activate AI Compose Mode"
        >
          Click to <strong>Auto-Compose</strong> AI Motion
        </button>
      )}

      {/* Step 5: Export Contextual Reference Pill */}
      {currentStepIndex === 5 && (
        <button
          type="button"
          className="reference-guide-pill floating-guide-pill"
          style={{ top: '64px', right: '24px' }}
          onClick={() => {
            if (onExport) onExport();
            confetti({
              particleCount: 100,
              spread: 80,
              colors: ['#2563eb', '#ffffff', '#60a5fa'],
              origin: { y: 0.2 },
            });
            onCompleteTour();
          }}
          title="Click to render 60 FPS video"
        >
          Click to <strong>Export</strong> 60 FPS video
        </button>
      )}
    </>
  );
};
