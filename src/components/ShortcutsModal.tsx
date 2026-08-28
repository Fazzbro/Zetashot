import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { category: 'Capture & Record', keys: ['Ctrl', 'Shift', 'S'], description: 'Instant Screenshot Capture' },
  { category: 'Capture & Record', keys: ['Ctrl', 'Shift', 'R'], description: 'Start / Stop Screen Recording' },
  { category: 'Capture & Record', keys: ['Space'], description: 'Play / Pause Presentation Timeline' },
  { category: 'Canvas & Navigation', keys: ['Ctrl', '+'], description: 'Zoom In' },
  { category: 'Canvas & Navigation', keys: ['Ctrl', '-'], description: 'Zoom Out' },
  { category: 'Canvas & Navigation', keys: ['Ctrl', '0'], description: 'Reset Zoom (100%)' },
  { category: 'Canvas & Navigation', keys: ['Shift', '1'], description: 'Fit Canvas to Screen' },
  { category: 'History & Editing', keys: ['Ctrl', 'Z'], description: 'Undo Last Action' },
  { category: 'History & Editing', keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo Action' },
  { category: 'History & Editing', keys: ['Esc'], description: 'Cancel Active Mode / Close Dialog' },
  { category: 'Modes', keys: ['I'], description: 'Toggle Interactive vs Move Mode' },
  { category: 'Modes', keys: ['E'], description: 'Open Element Inspector' },
  { category: 'Modes', keys: ['R'], description: 'Open Region Capture' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Command size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Keyboard Shortcuts</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {SHORTCUTS.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{item.description}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {item.keys.map((k, ki) => (
                    <kbd
                      key={ki}
                      style={{
                        background: '#090d16',
                        border: '1px solid var(--border-default)',
                        borderRadius: 4,
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: '#a5b4fc',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
