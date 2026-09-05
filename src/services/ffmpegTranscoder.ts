import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;
const logHistory: string[] = [];

async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Engine]', message);
      logHistory.push(message);
      if (logHistory.length > 50) logHistory.shift();
    });
    ffmpeg.on('progress', ({ progress }) => {
      if (onProgress && typeof progress === 'number' && isFinite(progress)) {
        onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      }
    });
  }

  if (!ffmpeg.loaded) {
    if (!loadPromise) {
      loadPromise = (async () => {
        try {
          console.log('Loading local FFmpeg WebAssembly core...');
          await ffmpeg!.load({
            coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
          });
          console.log('Local FFmpeg WebAssembly core loaded successfully!');
        } catch (localErr) {
          console.warn('Local FFmpeg load failed, falling back to CDN:', localErr);
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
          await ffmpeg!.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          console.log('CDN FFmpeg core loaded successfully!');
        }
      })();
    }
    await loadPromise;
  }

  return ffmpeg;
}

/**
 * Encodes an array of high-quality image frame Blobs directly into a silky-smooth, 60fps MP4 video.
 * Eliminates all MediaRecorder timer jitter, dropped frames, and VFR micro-stutter.
 */
export async function encodeFrameSequenceToMP4(
  frames: Blob[],
  fps: number = 60,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (!frames || frames.length === 0) {
    throw new Error('Cannot encode 0 frames to MP4');
  }

  const instance = await getFFmpeg(onProgress);
  const totalFrames = frames.length;
  const prefix = `seq_${Date.now()}`;
  const outputName = `output_${Date.now()}.mp4`;

  console.log(`[FFmpeg Engine] Writing ${totalFrames} frames to MEMFS for ${fps}fps sequence encode...`);

  // Write frames to MEMFS
  for (let i = 0; i < totalFrames; i++) {
    const frameData = await fetchFile(frames[i]);
    const pad = String(i).padStart(5, '0');
    await instance.writeFile(`${prefix}_${pad}.jpg`, frameData);
    if (onProgress && i % 15 === 0) {
      onProgress(Math.round((i / totalFrames) * 40));
    }
  }

  console.log(`[FFmpeg Engine] Executing H.264 encode at ${fps} FPS...`);

  const exitCode = await instance.exec([
    '-framerate', `${fps}`,
    '-i', `${prefix}_%05d.jpg`,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', `${duration}`,
    '-vf', `setpts=N/(${fps}*TB)`,
    '-r', `${fps}`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '17',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.2',
    '-g', `${fps}`,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    outputName,
  ]);

  if (exitCode !== 0) {
    const errorSummary = logHistory.slice(-10).join('\n');
    throw new Error(`FFmpeg sequence encode failed with exit code ${exitCode}:\n${errorSummary}`);
  }

  const data = await instance.readFile(outputName);
  const rawBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const mp4Bytes = new Uint8Array(rawBytes.length);
  mp4Bytes.set(rawBytes);

  // Clean up virtual frames in background
  (async () => {
    for (let i = 0; i < totalFrames; i++) {
      const pad = String(i).padStart(5, '0');
      await instance.deleteFile(`${prefix}_${pad}.jpg`).catch(() => {});
    }
    await instance.deleteFile(outputName).catch(() => {});
  })().catch(() => {});

  console.log(`[FFmpeg Engine] Sequence encode complete! MP4 size: ${mp4Bytes.length} bytes`);
  return new Blob([mp4Bytes], { type: 'video/mp4' });
}

/**
 * Transcodes a raw WebM recording into a universally compliant, high-compatibility MP4
 * with H.264 video, silent AAC audio (required for full Windows/QuickTime/TV compatibility),
 * baseline profile, and faststart MOOV atom.
 */
export async function transcodeWebMToMP4(
  webmBlob: Blob,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log(`Starting FFmpeg MP4 transcode for WebM blob (${webmBlob.size} bytes, duration: ${duration}s)...`);
  
  if (webmBlob.size === 0) {
    throw new Error('Cannot transcode 0-byte WebM input');
  }

  const instance = await getFFmpeg(onProgress);

  const inputName = `input_${Date.now()}.webm`;
  const outputName = `output_${Date.now()}.mp4`;

  // Write input file to MEMFS
  const inputData = await fetchFile(webmBlob);
  await instance.writeFile(inputName, inputData);

  const exitCode = await instance.exec([
    '-i', inputName,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', `${duration}`,
    '-vf', 'setpts=N/(30*TB)',
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-level', '4.0',
    '-g', '30',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    outputName,
  ]);

  if (exitCode !== 0) {
    const errorSummary = logHistory.slice(-10).join('\n');
    throw new Error(`FFmpeg transcode failed with exit code ${exitCode}:\n${errorSummary}`);
  }

  const data = await instance.readFile(outputName);
  const rawBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const mp4Bytes = new Uint8Array(rawBytes.length);
  mp4Bytes.set(rawBytes);

  // Clean up MEMFS
  await instance.deleteFile(inputName).catch(() => {});
  await instance.deleteFile(outputName).catch(() => {});

  console.log(`FFmpeg transcode finished successfully. MP4 size: ${mp4Bytes.length} bytes`);
  return new Blob([mp4Bytes], { type: 'video/mp4' });
}

/**
 * Transcodes a raw WebM recording to ensure proper headers and duration metadata.
 */
export async function transcodeToSeekableWebM(
  webmBlob: Blob,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log(`Starting FFmpeg WebM remux (${webmBlob.size} bytes, duration: ${duration}s)...`);

  const instance = await getFFmpeg(onProgress);

  const inputName = `input_webm_${Date.now()}.webm`;
  const outputName = `output_webm_${Date.now()}.webm`;

  const inputData = await fetchFile(webmBlob);
  await instance.writeFile(inputName, inputData);

  const exitCode = await instance.exec([
    '-i', inputName,
    '-t', `${duration}`,
    '-c:v', 'copy',
    outputName,
  ]);

  if (exitCode !== 0) {
    const errorSummary = logHistory.slice(-10).join('\n');
    throw new Error(`FFmpeg WebM remux failed with exit code ${exitCode}:\n${errorSummary}`);
  }

  const data = await instance.readFile(outputName);
  const rawBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const webmBytes = new Uint8Array(rawBytes.length);
  webmBytes.set(rawBytes);

  // Clean up MEMFS
  await instance.deleteFile(inputName).catch(() => {});
  await instance.deleteFile(outputName).catch(() => {});

  console.log(`FFmpeg WebM remux finished successfully. Size: ${webmBytes.length} bytes`);
  return new Blob([webmBytes], { type: 'video/webm' });
}
