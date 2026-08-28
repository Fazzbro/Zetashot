import React, { useEffect, useState, useRef } from 'react';
import { Folder, Plus, Copy, Download, Upload, Trash2, X, Check, FileText } from 'lucide-react';
import { ProjectState, createDefaultProject, serializeProjectToJson, deserializeProjectFromJson } from '../utils/projectSerialization';
import { storageService } from '../services/storageService';
import { CaptureEngine } from '../services/captureEngine';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectState;
  onLoadProject: (project: ProjectState) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
}) => {
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProjectList = async () => {
    const list = await storageService.listProjects();
    setProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadProjectList();
    }
  }, [isOpen]);

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleSaveCurrent = async () => {
    await storageService.saveProject(currentProject);
    await loadProjectList();
    showFeedback('Project saved successfully!');
  };

  const handleNewProject = () => {
    const newProj = createDefaultProject(`Project ${projects.length + 1}`);
    onLoadProject(newProj);
    storageService.saveProject(newProj);
    onClose();
  };

  const handleDuplicate = (project: ProjectState) => {
    const dup: ProjectState = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${project.name} (Copy)`,
      updatedAt: Date.now(),
    };
    storageService.saveProject(dup);
    loadProjectList();
    showFeedback('Project duplicated!');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      await storageService.deleteProject(id);
      loadProjectList();
    }
  };

  const handleExportJson = (project: ProjectState, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = serializeProjectToJson(project);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `openshot-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    CaptureEngine.downloadFile(blob, filename);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const imported = deserializeProjectFromJson(content);
        storageService.saveProject(imported);
        onLoadProject(imported);
        onClose();
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Project Manager</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Actions Row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={handleNewProject}>
              <Plus size={14} />
              New Project
            </button>
            <button className="btn-secondary" onClick={handleSaveCurrent}>
              <Check size={14} />
              Save Current
            </button>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} />
              Import JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportJson}
            />
          </div>

          {successMsg && (
            <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '12px' }}>
              {successMsg}
            </div>
          )}

          {/* Search bar */}
          <input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />

          {/* Projects List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '320px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                No saved projects found. Click "Save Current" or "New Project" to start.
              </div>
            ) : (
              filtered.map((proj) => {
                const isCurrent = proj.id === currentProject.id;
                return (
                  <div
                    key={proj.id}
                    className="glass-card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderColor: isCurrent ? 'var(--accent-primary)' : undefined,
                    }}
                    onClick={() => {
                      onLoadProject(proj);
                      onClose();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText size={18} color={isCurrent ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {proj.name}
                          {isCurrent && <span className="pill-badge active">Active</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {proj.viewport.width} × {proj.viewport.height} • {proj.deviceMockup.type} • {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="btn-icon"
                        data-tooltip="Duplicate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(proj);
                        }}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        data-tooltip="Export JSON"
                        onClick={(e) => handleExportJson(proj, e)}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        data-tooltip="Delete"
                        onClick={(e) => handleDelete(proj.id, e)}
                      >
                        <Trash2 size={13} color="#f43f5e" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
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
