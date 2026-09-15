import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSecurityGuard } from './securityGuard';

describe('securityGuard', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = initSecurityGuard();
  });

  afterEach(() => {
    if (cleanup) cleanup();
  });

  it('prevents F12 keydown events', () => {
    const event = new KeyboardEvent('keydown', { key: 'F12', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents Ctrl+Shift+I (DevTools Inspect) shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'I',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents Ctrl+Shift+J (DevTools Console) shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'J',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents Ctrl+Shift+C (DevTools Element picker) shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'C',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents Ctrl+U (View Page Source) shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents Ctrl+S (Save Page) shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('allows normal typing keys through without preventing default', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('prevents right-click context menu on normal elements', () => {
    const event = new MouseEvent('contextmenu', { cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('permits right-click context menu inside input elements for copy-paste', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    document.body.removeChild(input);
  });
});
