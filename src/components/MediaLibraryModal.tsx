import React, { useRef } from 'react';
import { Upload, X, Film, Image as ImageIcon, Sparkles, Check } from 'lucide-react';

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
];

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMediaId: string;
  mediaItems?: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onUploadFile: (file: File) => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  activeMediaId,
  mediaItems = BUILTIN_MEDIA_ITEMS,
  onSelectMedia,
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

  return (
    <div className="unified-screens-library" style={{ position: 'fixed', top: '56px', left: '24px', zIndex: 1000 }}>
      <div className="source-library-heading">
        <div>
          <strong>Media Library / Demos</strong>
          <small>Select a scene or upload your own video / image</small>
        </div>
        <button type="button" className="screens-library-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="source-library-grid">
        {displayList.map((item) => {
          const isSelected = item.id === activeMediaId;
          return (
            <div key={item.id} className="source-library-item" onClick={() => { onSelectMedia(item); onClose(); }}>
              <div className={`source-library-card ${isSelected ? 'is-selected' : ''}`}>
                <div className="source-library-preview-shell">
                  {item.type === 'video' ? (
                    <Film size={28} color="#f43f5e" />
                  ) : item.type === 'demo' ? (
                    <Sparkles size={28} color="#f59e0b" />
                  ) : (
                    <ImageIcon size={28} color="#6366f1" />
                  )}
                </div>
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
            <strong>Upload Video or Screenshot</strong>
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
