/**
 * Generates an array of snapshot data URLs from a video element across its duration.
 */
export async function generateVideoThumbnails(
  videoUrl: string,
  totalDuration: number,
  count: number = 13
): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const thumbnails: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve([]);
      return;
    }

    let currentIndex = 0;

    const captureNext = () => {
      if (currentIndex >= count) {
        video.remove();
        canvas.remove();
        resolve(thumbnails);
        return;
      }

      const targetTime = (currentIndex / Math.max(1, count - 1)) * totalDuration;
      video.currentTime = Math.min(targetTime, video.duration || totalDuration);
    };

    video.addEventListener('loadeddata', () => {
      captureNext();
    });

    video.addEventListener('seeked', () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        // In case of CORS or canvas error
      }
      currentIndex++;
      captureNext();
    });

    video.addEventListener('error', () => {
      resolve([]);
    });

    // Timeout safety
    setTimeout(() => {
      resolve(thumbnails);
    }, 4000);
  });
}
