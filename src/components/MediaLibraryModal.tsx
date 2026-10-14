import React, { useRef } from 'react';
import { Upload, X, Film, Image as ImageIcon, Sparkles, Plus, Box, Trash2, Square } from 'lucide-react';
import { Model3DTextureConfig } from '../types/model3D';

export interface MediaItem {
  id: string;
  name: string;
  type: 'demo' | 'video' | 'image' | '3d' | 'blank';
  url: string;
  dimensions: string;
  format: string;
  poster?: string;
  modelTextures?: Model3DTextureConfig;
}

export const BLANK_CANVAS_DATA_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="%23090d16"/></svg>';

export const BLANK_CANVAS_ITEM: MediaItem = {
  id: 'blank-canvas',
  name: 'Blank Canvas',
  type: 'blank',
  url: BLANK_CANVAS_DATA_URL,
  dimensions: '1920 × 1080',
  format: 'Clean Canvas',
};

export const BUILTIN_MEDIA_ITEMS: MediaItem[] = [
  BLANK_CANVAS_ITEM,
  {
    id: 'default-screen-image',
    name: 'Codex Dashboard',
    type: 'image',
    url: '/default-codex-image.png',
    dimensions: '1920 × 1080',
    format: 'PNG',
  },
  {
    id: 'default-3d-model',
    name: '3D Studio Model',
    type: '3d',
    url: 'default-3d',
    dimensions: '3D Mesh',
    format: 'FBX',
  },
];

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMediaId: string;
  mediaItems?: MediaItem[];
  mode?: 'select' | 'add';
  onModeChange?: (mode: 'select' | 'add') => void;
  onSelectMedia: (item: MediaItem) => void;
  onAddMediaClip?: (item: MediaItem) => void;
  onAddBlankCanvas?: (withoutOtherClips: boolean) => void;
  onDeleteMediaItem?: (id: string) => void;
  onUploadFile: (file: File) => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  activeMediaId,
  mediaItems = BUILTIN_MEDIA_ITEMS,
  mode = 'select',
  onModeChange,
  onSelectMedia,
  onAddMediaClip,
  onAddBlankCanvas,
  onDeleteMediaItem,
  onUploadFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
      onClose();
    }
  };

  const displayList = mediaItems && mediaItems.length > 0 ? mediaItems : BUILTIN_MEDIA_ITEMS;

  const handleCardClick = (item: MediaItem) => {
    if (item.type === 'blank') {
      if (mode === 'add') {
        if (onAddMediaClip) onAddMediaClip(item);
        else if (onAddBlankCanvas) onAddBlankCanvas(false);
      } else {
        if (onAddBlankCanvas) onAddBlankCanvas(true);
        else onSelectMedia(item);
      }
      onClose();
      return;
    }
    if (mode === 'add' && onAddMediaClip) {
      onAddMediaClip(item);
    } else {
      onSelectMedia(item);
    }
    onClose();
  };

  return (
    <>
      <div className="screens-library-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="unified-screens-library" style={{ position: 'fixed', top: '56px', left: '24px', zIndex: 1000 }}>
        <div className="source-library-heading">
          <div>
            <strong>{mode === 'add' ? 'Add Clip to Sequence' : 'Media Library / Demos'}</strong>
            <small>{mode === 'add' ? 'Select or upload a clip to append to your video sequence' : 'Select a scene or upload your own video, image, or 3D asset'}</small>
          </div>
          <button type="button" className="screens-library-close" onClick={onClose} title="Close" aria-label="Close media library">
            <X size={16} />
          </button>
        </div>

      {onModeChange && (
        <div className="source-library-mode-pills">
          <button
            type="button"
            className={`source-library-mode-pill ${mode === 'add' ? 'is-active' : ''}`}
            onClick={() => onModeChange('add')}
          >
            <Plus size={12} />
            <span>+ Add to Sequence</span>
          </button>
          <button
            type="button"
            className={`source-library-mode-pill ${mode === 'select' ? 'is-active' : ''}`}
            onClick={() => onModeChange('select')}
          >
            <span>Replace Active Clip</span>
          </button>
          {onAddBlankCanvas && (
            <button
              type="button"
              className="source-library-mode-pill is-blank-pill"
              onClick={() => {
                onAddBlankCanvas(true);
                onClose();
              }}
              title="Start fresh with a clean blank canvas without other media clips"
            >
              <Square size={12} />
              <span>Blank Canvas (Solo)</span>
            </button>
          )}
        </div>
      )}

      <div className="source-library-grid">
        {/* 1. Quick Upload Card right at the top */}
        <div
          className="source-library-item"
          onClick={() => fileInputRef.current?.click()}
          title="Upload your own Video, Image, or 3D Model"
          style={{ cursor: 'pointer' }}
        >
          <div
            className="source-library-card"
            style={{
              border: '1.5px dashed rgba(255, 255, 255, 0.28)',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 8px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Upload size={18} />
            </div>
            <strong style={{ fontSize: '13px', color: '#ffffff' }}>Upload Your Asset</strong>
            <small style={{ fontSize: '11px', color: '#a1a1aa', textAlign: 'center' }}>
              MP4, MOV, PNG, JPG, FBX
            </small>
          </div>
          <div className="source-library-meta">
            <div className="source-library-meta-copy">
              <strong>Your Custom File</strong>
              <small>Click to browse computer</small>
            </div>
          </div>
        </div>

        {/* Existing Presets */}
        {displayList.map((item) => {
          const isSelected = item.id === activeMediaId;
          return (
            <div
              key={item.id}
              className="source-library-item"
              onClick={() => handleCardClick(item)}
              title={mode === 'add' ? `Add ${item.name} to sequence` : `Select ${item.name}`}
            >
              <div className={`source-library-card ${isSelected ? 'is-selected' : ''} ${item.type === 'blank' ? 'is-blank-canvas-card' : ''}`}>
                {/* Real visual preview for blank canvas, images, and videos */}
                {item.type === 'blank' ? (
                  <div className="blank-canvas-preview-surface">
                    <Square size={26} color="#38bdf8" />
                    <span className="blank-canvas-preview-text">BLANK CANVAS</span>
                  </div>
                ) : item.type === 'image' && item.url ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="eager"
                    decoding="async"
                    className="source-library-preview-media"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.source-library-preview-shell') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : item.type === 'video' && item.url ? (
                  <video
                    src={item.url}
                    preload="metadata"
                    muted
                    playsInline
                    className="source-library-preview-media"
                    onLoadedMetadata={(e) => {
                      try {
                        e.currentTarget.currentTime = 0.001;
                      } catch {}
                    }}
                  />
                ) : null}

                {/* Fallback shell icon */}
                <div
                  className="source-library-preview-shell"
                  style={{ display: item.type === 'demo' || item.type === '3d' || (item.type !== 'blank' && !item.url) ? 'flex' : 'none' }}
                >
                  {item.type === 'video' ? (
                    <Film size={28} color="#ffffff" />
                  ) : item.type === 'demo' ? (
                    <Sparkles size={28} color="#ffffff" />
                  ) : item.type === '3d' ? (
                    <Box size={28} color="#ffffff" />
                  ) : (
                    <ImageIcon size={28} color="#ffffff" />
                  )}
                </div>

                {/* Media format badge */}
                <span className={`source-library-type-badge ${item.type === 'blank' ? 'badge-blank' : ''}`}>
                  {item.type.toUpperCase()}
                </span>

                {/* Blank Canvas Solo Quick Button (Without other clips) */}
                {item.type === 'blank' && onAddBlankCanvas && (
                  <button
                    type="button"
                    className="source-library-card-solo-btn"
                    title="Open blank canvas without other media clips"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddBlankCanvas(true);
                      onClose();
                    }}
                  >
                    <Square size={11} />
                    <span>Solo (No clips)</span>
                  </button>
                )}

                {/* Dedicated "+ Add Clip" quick button */}
                {onAddMediaClip && (
                  <button
                    type="button"
                    className="source-library-card-add-btn"
                    title="Add as next clip in timeline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.type === 'blank' && onAddBlankCanvas) {
                        onAddBlankCanvas(false);
                      } else {
                        onAddMediaClip(item);
                      }
                      onClose();
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Clip</span>
                  </button>
                )}

                {/* Delete button for user uploaded assets */}
                {!BUILTIN_MEDIA_ITEMS.some((b) => b.id === item.id) && onDeleteMediaItem && (
                  <button
                    type="button"
                    className="source-library-card-delete-btn"
                    title={`Delete ${item.name} from library`}
                    aria-label={`Delete ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMediaItem(item.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="source-library-meta">
                <div className="source-library-meta-copy">
                  <strong title={item.name}>{item.name}</strong>
                  <small>{item.dimensions} • {item.format}</small>
                </div>
                {isSelected && <span className="source-library-demo-tag">ACTIVE</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="source-library-footer">
        <button
          type="button"
          className="source-library-add"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} />
          <div>
            <strong>{mode === 'add' ? 'Upload & Add to Sequence' : 'Upload Video, Image, or 3D Model'}</strong>
            <small>MP4, MOV, WebM, PNG, JPG, WebP, FBX, OBJ, GLB</small>
          </div>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".fbx,.obj,.gltf,.glb,video/*,image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  </>
);
};
