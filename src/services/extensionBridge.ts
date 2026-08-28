export interface ExtensionTabInfo {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  width?: number;
  height?: number;
}

export class ExtensionBridge {
  static isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  }

  static async getActiveTab(): Promise<ExtensionTabInfo | null> {
    if (!this.isExtensionContext() || !chrome.tabs) {
      return null;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return null;

      return {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        width: tab.width,
        height: tab.height,
      };
    } catch (e) {
      console.warn('Failed to query active tab:', e);
      return null;
    }
  }

  static async captureCurrentTab(): Promise<string | null> {
    if (!this.isExtensionContext() || !chrome.tabs) {
      return null;
    }

    try {
      return await chrome.tabs.captureVisibleTab({ format: 'png' });
    } catch (e) {
      console.warn('captureVisibleTab failed:', e);
      return null;
    }
  }

  /**
   * Prompts user for Screen / Window / Tab capture via standard Web API getDisplayMedia.
   */
  static async captureScreenStream(): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia is not supported in this browser');
      }

      return await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
        audio: false,
      });
    } catch (e) {
      console.warn('getDisplayMedia was cancelled or failed:', e);
      return null;
    }
  }
}
