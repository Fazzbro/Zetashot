import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, Upload, X, Play, Pause } from 'lucide-react';
import { AudioTrackItem, AudioPreset, BUILTIN_AUDIO_PRESETS } from '../types/audioTrack';
import { generatePresetAudioBlob } from '../utils/audioTrackHelper';

interface AudioManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (item: AudioTrackItem) => void;
  currentTimelineDuration: number;
}

export const AudioManagerModal: React.FC<AudioManagerModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  currentTimelineDuration,
}) => {
  const [activeTab, setActiveTab] = useState<'music' | 'sfx' | 'upload'>('music');
  const [previewingPresetId, setPreviewingPresetId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleStopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setPreviewingPresetId(null);
  };

  const handleTogglePreview = async (e: React.MouseEvent, preset: AudioPreset) => {
    e.stopPropagation();
    if (previewingPresetId === preset.id) {
      handleStopPreview();
      return;
    }

    handleStopPreview();
    try {
      const blob = await generatePresetAudioBlob(preset.id);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      setPreviewingPresetId(preset.id);
      audio.onended = () => {
        handleStopPreview();
      };
      await audio.play();
    } catch (err) {
      console.warn('Audio preview failed:', err);
      handleStopPreview();
    }
  };

  const handleSelectPreset = async (preset: AudioPreset) => {
    handleStopPreview();
    try {
      const blob = await generatePresetAudioBlob(preset.id);
      const url = URL.createObjectURL(blob);
      const newItem: AudioTrackItem = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: preset.name,
        url,
        type: preset.category,
        startTime: 0,
        duration: preset.category === 'music'
          ? Math.max(preset.duration, currentTimelineDuration || 12.0)
          : preset.duration,
        volume: 1.0,
        isMuted: false,
      };
      onAddTrack(newItem);
      onClose();
    } catch (err) {
      console.error('Failed to create audio preset track:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleStopPreview();
    const url = URL.createObjectURL(file);
    const tempAudio = new Audio(url);

    tempAudio.onloadedmetadata = () => {
      const dur = tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0
        ? Number(tempAudio.duration.toFixed(2))
        : 12.0;

      const newItem: AudioTrackItem = {
        id: `audio_upload_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url,
        type: 'music',
        startTime: 0,
        duration: dur,
        volume: 1.0,
        isMuted: false,
      };
      onAddTrack(newItem);
      onClose();
    };

    tempAudio.onerror = () => {
      const newItem: AudioTrackItem = {
        id: `audio_upload_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url,
        type: 'music',
        startTime: 0,
        duration: currentTimelineDuration || 12.0,
        volume: 1.0,
        isMuted: false,
      };
      onAddTrack(newItem);
      onClose();
    };
  };

  const musicPresets = BUILTIN_AUDIO_PRESETS.filter((p) => p.category === 'music');
  const sfxPresets = BUILTIN_AUDIO_PRESETS.filter((p) => p.category === 'sfx');

  const modalContent = (
    <div className="audio-manager-modal-overlay" onClick={onClose}>
      <div className="audio-manager-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="audio-manager-header">
          <div className="audio-manager-title">
            <Volume2 size={18} color="#ffffff" strokeWidth={2} />
            <span>Add Audio Track or SFX</span>
          </div>
          <button
            type="button"
            className="audio-manager-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="audio-manager-tabs">
          <button
            type="button"
            className={`audio-manager-tab-btn ${activeTab === 'music' ? 'is-active' : ''}`}
            onClick={() => {
              handleStopPreview();
              setActiveTab('music');
            }}
          >
            Music Presets
          </button>
          <button
            type="button"
            className={`audio-manager-tab-btn ${activeTab === 'sfx' ? 'is-active' : ''}`}
            onClick={() => {
              handleStopPreview();
              setActiveTab('sfx');
            }}
          >
            Sound Effects (SFX)
          </button>
          <button
            type="button"
            className={`audio-manager-tab-btn ${activeTab === 'upload' ? 'is-active' : ''}`}
            onClick={() => {
              handleStopPreview();
              setActiveTab('upload');
            }}
          >
            Upload File
          </button>
        </div>

        {/* Tab Content */}
        <div className="audio-manager-content">
          {activeTab === 'music' && (
            <>
              {musicPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="audio-preset-item-card"
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="audio-preset-info">
                    <div className="audio-preset-name">{preset.name}</div>
                    <div className="audio-preset-desc">{preset.description}</div>
                  </div>
                  <div className="audio-preset-actions">
                    <button
                      type="button"
                      className={`audio-preset-play-btn ${previewingPresetId === preset.id ? 'is-playing' : ''}`}
                      onClick={(e) => handleTogglePreview(e, preset)}
                      title={previewingPresetId === preset.id ? 'Pause Preview' : 'Audition Preview'}
                    >
                      {previewingPresetId === preset.id ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button
                      type="button"
                      className="audio-preset-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPreset(preset);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'sfx' && (
            <>
              {sfxPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="audio-preset-item-card"
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="audio-preset-info">
                    <div className="audio-preset-name">{preset.name}</div>
                    <div className="audio-preset-desc">{preset.description}</div>
                  </div>
                  <div className="audio-preset-actions">
                    <button
                      type="button"
                      className={`audio-preset-play-btn ${previewingPresetId === preset.id ? 'is-playing' : ''}`}
                      onClick={(e) => handleTogglePreview(e, preset)}
                      title={previewingPresetId === preset.id ? 'Pause Preview' : 'Audition Preview'}
                    >
                      {previewingPresetId === preset.id ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <span className="audio-preset-sfx-dur">
                      +{preset.duration}s
                    </span>
                    <button
                      type="button"
                      className="audio-preset-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPreset(preset);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'upload' && (
            <>
              <div
                className="audio-upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="audio-upload-icon-shell">
                  <Upload size={24} color="#ffffff" strokeWidth={1.8} />
                </div>
                <div className="audio-upload-title">Choose audio file from your computer</div>
                <div className="audio-upload-subtext">Supports MP3, WAV, AAC, M4A, OGG, FLAC</div>
                <button
                  type="button"
                  className="audio-upload-browse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
