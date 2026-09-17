import React, { useRef } from 'react';
import { Upload, X, Film, Image as ImageIcon, Sparkles, Plus } from 'lucide-react';

export interface MediaItem {
  id: string;
  name: string;
  type: 'demo' | 'video' | 'image';
  url: string;
  dimensions: string;
  format: string;
  poster?: string;
}

export const BUILTIN_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'default-screen-image',
    name: 'Codex Dashboard',
    type: 'image',
    url: '/default-codex-image.png',
    dimensions: '1920 × 1080',
    format: 'PNG',
  },
  {
    id: 'default-landscape-image',
    name: 'Nature Horizon',
    type: 'image',
    url: '/user-landscape.png',
    dimensions: '1920 × 1080',
    format: 'PNG',
  },
  {
    id: 'default-screen-video',
    name: 'App Demo Reel',
    type: 'video',
    url: '/ui-camera-loop.mp4',
    dimensions: '1920 × 1080',
    format: 'MP4',
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
  onUploadFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      onClose();
    }
  };

  const displayList = mediaItems && mediaItems.length > 0 ? mediaItems : BUILTIN_MEDIA_ITEMS;

  const handleCardClick = (item: MediaItem) => {
    if (mode === 'add' && onAddMediaClip) {
      onAddMediaClip(item);
    } else {
      onSelectMedia(item);
    }
    onClose();
  };

  return (
    <div className="unified-screens-library" style={{ position: 'fixed', top: '56px', left: '24px', zIndex: 1000 }}>
      <div className="source-library-heading">
        <div>
          <strong>{mode === 'add' ? 'Add Clip to Sequence' : 'Media Library / Demos'}</strong>
          <small>{mode === 'add' ? 'Select or upload a clip to append to your video sequence' : 'Select a scene or upload your own video / image'}</small>
        </div>
        <button type="button" className="screens-library-close" onClick={onClose} title="Close">
          <X size={14} />
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
        </div>
      )}

      <div className="source-library-grid">
        {displayList.map((item) => {
          const isSelected = item.id === activeMediaId;
          return (
            <div
              key={item.id}
              className="source-library-item"
              onClick={() => handleCardClick(item)}
              title={mode === 'add' ? `Add ${item.name} to sequence` : `Select ${item.name}`}
            >
              <div className={`source-library-card ${isSelected ? 'is-selected' : ''}`}>
                {/* Real visual preview for images and videos */}
                {item.type === 'image' && item.url ? (
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
                  style={{ display: item.type === 'demo' || !item.url ? 'flex' : 'none' }}
                >
                  {item.type === 'video' ? (
                    <Film size={28} color="#f43f5e" />
                  ) : item.type === 'demo' ? (
                    <Sparkles size={28} color="#f59e0b" />
                  ) : (
                    <ImageIcon size={28} color="#6366f1" />
                  )}
                </div>

                {/* Media format badge */}
                <span className="source-library-type-badge">{item.type.toUpperCase()}</span>

                {/* Dedicated "+ Add Clip" quick button */}
                {onAddMediaClip && (
                  <button
                    type="button"
                    className="source-library-card-add-btn"
                    title="Add as next clip in timeline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddMediaClip(item);
                      onClose();
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Clip</span>
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
            <strong>{mode === 'add' ? 'Upload & Add to Sequence' : 'Upload Video or Screenshot'}</strong>
            <small>MP4, MOV, WebM, PNG, JPG, WebP, AVIF</small>
          </div>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="video/*,image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
