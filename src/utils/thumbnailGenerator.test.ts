import { describe, it, expect } from 'vitest';
import { generateVideoThumbnails } from './thumbnailGenerator';

describe('thumbnailGenerator', () => {
  it('returns a promise that resolves safely', async () => {
    const result = await generateVideoThumbnails('invalid-url', 12, 5);
    expect(Array.isArray(result)).toBe(true);
  });
});
