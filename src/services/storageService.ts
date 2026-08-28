import { ProjectState, createDefaultProject } from '../utils/projectSerialization';

export interface HistoryItem {
  id: string;
  type: 'screenshot' | 'recording';
  title: string;
  filename: string;
  format: string;
  width: number;
  height: number;
  scale: number;
  dataUrl?: string; // thumbnail or image dataUrl
  blob?: Blob;
  duration?: number; // for recordings in seconds
  createdAt: number;
}

const DB_NAME = 'openshot_ui_camera_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_HISTORY = 'history';

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const histStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
          histStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Projects API ---

  async saveProject(project: ProjectState): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.put({ ...project, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Fallback to localStorage for project save:', e);
      localStorage.setItem(`openshot_proj_${project.id}`, JSON.stringify(project));
    }
  }

  async loadProject(id: string): Promise<ProjectState | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const local = localStorage.getItem(`openshot_proj_${id}`);
      return local ? JSON.parse(local) : null;
    }
  }

  async listProjects(): Promise<ProjectState[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      localStorage.removeItem(`openshot_proj_${id}`);
    }
  }

  // --- History API ---

  async saveHistoryItem(item: HistoryItem): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_HISTORY);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not save history to IndexedDB:', e);
    }
  }

  async listHistory(): Promise<HistoryItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, 'readonly');
        const store = tx.objectStore(STORE_HISTORY);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.sort((a, b) => b.createdAt - a.createdAt));
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  }

  async deleteHistoryItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_HISTORY);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not delete history item:', e);
    }
  }

  async clearAllHistory(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, 'readwrite');
        const store = tx.objectStore(STORE_HISTORY);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not clear history:', e);
    }
  }
}

export const storageService = new StorageService();
