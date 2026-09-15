/**
 * Custom Font Upload & Registration Utility
 * Handles dynamic font loading via Web FontFace API for both DOM and Canvas 2D.
 */

export interface CustomFontItem {
  id: string;
  name: string;
  format: string;
  dataUrl?: string;
}

const STORAGE_KEY = 'zetashot_custom_fonts';

// In-memory cache of loaded custom fonts
let loadedCustomFonts: CustomFontItem[] = [];

/**
 * Normalizes font name from uploaded file.
 */
export function sanitizeFontName(fileName: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
  // Remove special characters, keep letters, digits, spaces, and hyphens
  const cleaned = baseName.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
  return cleaned || 'CustomFont';
}

/**
 * Converts a File or Blob into a Base64 data URL.
 */
function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Registers an uploaded font file with the browser's document.fonts collection.
 */
export async function registerCustomFontFile(file: File): Promise<CustomFontItem> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Font registration requires a browser environment');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
  if (!validExtensions.includes(extension)) {
    throw new Error('Unsupported font format. Please upload a .ttf, .otf, .woff, or .woff2 file.');
  }

  const fontName = sanitizeFontName(file.name);
  const arrayBuffer = await file.arrayBuffer();

  const fontFace = new FontFace(fontName, arrayBuffer);
  const loadedFace = await fontFace.load();
  document.fonts.add(loadedFace);

  let dataUrl: string | undefined;
  try {
    // Only store dataUrl if file size is reasonable (< 3MB) to avoid localStorage quota issues
    if (file.size < 3 * 1024 * 1024) {
      dataUrl = await fileToDataUrl(file);
    }
  } catch (err) {
    console.warn('[FontManager] Could not convert font to data URL for persistence:', err);
  }

  const fontItem: CustomFontItem = {
    id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: fontName,
    format: extension.toUpperCase(),
    dataUrl,
  };

  // Avoid duplicates
  loadedCustomFonts = [
    ...loadedCustomFonts.filter((f) => f.name.toLowerCase() !== fontName.toLowerCase()),
    fontItem,
  ];

  persistCustomFontsToStorage();
  return fontItem;
}

/**
 * Saves current custom font metadata to localStorage.
 */
function persistCustomFontsToStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const sanitized = loadedCustomFonts.map((f) => ({
      id: f.id,
      name: f.name,
      format: f.format,
      dataUrl: f.dataUrl,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[FontManager] localStorage quota exceeded when persisting fonts:', err);
  }
}

/**
 * Initializes and restores any previously uploaded fonts from localStorage on startup.
 */
export async function initializeSavedCustomFonts(): Promise<CustomFontItem[]> {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: CustomFontItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    for (const item of parsed) {
      if (!item.name || !item.dataUrl) continue;
      try {
        const res = await fetch(item.dataUrl);
        const buf = await res.arrayBuffer();
        const fontFace = new FontFace(item.name, buf);
        const loaded = await fontFace.load();
        document.fonts.add(loaded);
      } catch (err) {
        console.warn(`[FontManager] Failed to restore font "${item.name}":`, err);
      }
    }

    loadedCustomFonts = parsed;
    return parsed;
  } catch (err) {
    console.warn('[FontManager] Failed to parse saved custom fonts:', err);
    return [];
  }
}

/**
 * Returns the list of currently registered custom fonts.
 */
export function getRegisteredCustomFonts(): CustomFontItem[] {
  return [...loadedCustomFonts];
}

/**
 * Removes a custom font.
 */
export function unregisterCustomFont(fontId: string): void {
  loadedCustomFonts = loadedCustomFonts.filter((f) => f.id !== fontId);
  persistCustomFontsToStorage();
}
