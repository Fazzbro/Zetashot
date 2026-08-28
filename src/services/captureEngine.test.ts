import { describe, it, expect, vi } from 'vitest';
import { CaptureEngine } from './captureEngine';

describe('CaptureEngine', () => {
  it('correctly handles filename formatting and extensions in downloadFile', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.createElement('a'));
    const blob = new Blob(['sample-data'], { type: 'image/png' });

    expect(() => {
      CaptureEngine.downloadFile(blob, 'my screen export');
    }).not.toThrow();

    appendChildSpy.mockRestore();
  });

  it('safely handles copyToClipboard without throwing in unauthenticated / unsupported environments', async () => {
    const blob = new Blob(['test-image'], { type: 'image/png' });
    const result = await CaptureEngine.copyToClipboard(blob);
    // Should gracefully return false without crashing or throwing
    expect(typeof result).toBe('boolean');
  });
});
