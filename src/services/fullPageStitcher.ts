export interface StitchOptions {
  viewportWidth: number;
  viewportHeight: number;
  totalHeight: number;
  devicePixelRatio: number;
  delayMs?: number;
  hideStickyElements?: boolean;
}

export class FullPageStitcher {
  /**
   * Stitches an array of captured image slices into a single vertical image blob.
   */
  static async stitchImages(
    slices: { dataUrl: string; y: number; height: number }[],
    totalWidth: number,
    totalHeight: number,
    dpr: number = 1
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(totalWidth * dpr);
    canvas.height = Math.round(totalHeight * dpr);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas 2D context for stitching');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(dpr, dpr);

    for (const slice of slices) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, slice.y);
          resolve();
        };
        img.onerror = reject;
        img.src = slice.dataUrl;
      });
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Stitching failed to produce Blob'));
        },
        'image/png'
      );
    });
  }
}
