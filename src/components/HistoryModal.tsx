import React, { useEffect, useState } from 'react';
import { History, Download, Copy, Trash2, X, Check, Image as ImageIcon, Video } from 'lucide-react';
import { HistoryItem, storageService } from '../services/storageService';
import { CaptureEngine } from '../services/captureEngine';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadHistory = async () => {
    const items = await storageService.listHistory();
    setHistoryItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleDownload = async (item: HistoryItem) => {
    if (item.blob) {
      CaptureEngine.downloadFile(item.blob, item.filename);
    } else if (item.dataUrl) {
      try {
        const res = await fetch(item.dataUrl);
        const blob = await res.blob();
        CaptureEngine.downloadFile(blob, item.filename);
      } catch {
        const a = document.createElement('a');
        a.href = item.dataUrl;
        a.download = item.filename;
        a.click();
      }
    }
  };

  const handleCopy = async (item: HistoryItem) => {
    if (item.blob && item.type === 'screenshot') {
      const success = await CaptureEngine.copyToClipboard(item.blob);
      if (success) {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  };

  const handleDelete = async (id: string) => {
    await storageService.deleteHistoryItem(id);
    loadHistory();
  };

  const handleClearAll = async () => {
    if (confirm('Clear all capture history? This action cannot be undone.')) {
      await storageService.clearAllHistory();
      loadHistory();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Capture History</h3>
            <span className="pill-badge">{historyItems.length} items</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {historyItems.length > 0 && (
              <button
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px', color: '#f43f5e' }}
                onClick={handleClearAll}
              >
                Clear All
              </button>
            )}
            <button className="btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
          {historyItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <History size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No capture history yet. Take screenshots or recordings to build your local gallery.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      height: '110px',
                      background: '#090d16',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {item.dataUrl ? (
                      item.type === 'recording' ? (
                        <video
                          src={item.dataUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img
                          src={item.dataUrl}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )
                    ) : (
                      item.type === 'recording' ? <Video size={24} color="#f43f5e" /> : <ImageIcon size={24} color="#6366f1" />
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.7)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        color: '#ffffff',
                      }}
                    >
                      {item.format.toUpperCase()}
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.filename}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.width}×{item.height} {item.scale > 1 ? `@${item.scale}x` : ''}</span>
                      <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button
                        className="btn-secondary"
                        style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                        onClick={() => handleDownload(item)}
                        data-tooltip="Download"
                      >
                        <Download size={12} />
                      </button>
                      {item.type === 'screenshot' && (
                        <button
                          className="btn-secondary"
                          style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                          onClick={() => handleCopy(item)}
                          data-tooltip="Copy Image"
                        >
                          {copiedId === item.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 6px', fontSize: '11px', color: '#f43f5e' }}
                        onClick={() => handleDelete(item.id)}
                        data-tooltip="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
