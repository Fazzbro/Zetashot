/**
 * Security Guard & Anti-Inspection Module for Zetashot
 * 
 * Provides defense-in-depth against unauthorized source inspection:
 * 1. Blocks DevTools keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
 * 2. Blocks right-click context menu (with safe exception for typing in input/textarea)
 * 3. In production, runs an anti-debugging timing trap to disrupt DevTools execution
 */

export function initSecurityGuard(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // 1. DevTools Shortcut Interceptor
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // F12 key
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I or Cmd+Opt+I (Developer Tools)
    // Ctrl+Shift+J or Cmd+Opt+J (Console)
    // Ctrl+Shift+C or Cmd+Opt+C (Element Inspector)
    if (
      (cmdOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
      (cmdOrCtrl && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
      (cmdOrCtrl && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
      (isMac && e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+U (View Page Source)
    if (cmdOrCtrl && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page HTML)
    if (cmdOrCtrl && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // 2. Right-Click Context Menu Interceptor
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    // Allow right-click inside editable text inputs so user can still paste or select text
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // 3. Anti-Debugging Watchdog (Active in Production Only)
  let antiDebugInterval: number | null = null;
  if (import.meta.env.PROD) {
    antiDebugInterval = window.setInterval(() => {
      const startTime = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - startTime;
      if (elapsed > 100) {
        // If developer opened DevTools and hit debugger breakpoint, clear console
        try {
          console.clear();
        } catch {}
      }
    }, 1000);
  }

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  document.addEventListener('contextmenu', handleContextMenu, { capture: true });

  // Cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    if (antiDebugInterval !== null) {
      clearInterval(antiDebugInterval);
    }
  };
}
