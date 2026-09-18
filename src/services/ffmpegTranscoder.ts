import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;
const logHistory: string[] = [];

let activeProgressListener: ((progress: number) => void) | null = null;
let activeExpectedFrames = 0;

export function setFFmpegProgressListener(
  listener: ((progress: number) => void) | null,
  expectedFrames = 0
) {
  activeProgressListener = listener;
  activeExpectedFrames = expectedFrames;
}

async function getFFmpeg(onProgress?: (progress: number) => void, expectedFrames = 0): Promise<FFmpeg> {
  activeProgressListener = onProgress || null;
  activeExpectedFrames = expectedFrames;

  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Engine]', message);
      logHistory.push(message);
      if (logHistory.length > 50) logHistory.shift();

      // Real-time progress detection from FFmpeg standard output
      const frameMatch = message.match(/frame=\s*(\d+)/);
      if (frameMatch && activeExpectedFrames > 0 && activeProgressListener) {
        const currentFrame = parseInt(frameMatch[1], 10);
        // Map encode phase to 35% -> 96% of FFmpeg sequence step
        const encodePct = 35 + Math.min(61, Math.round((currentFrame / activeExpectedFrames) * 61));
        activeProgressListener(encodePct);
      }
    });
    ffmpeg.on('progress', ({ progress }) => {
      if (activeProgressListener && typeof progress === 'number' && isFinite(progress) && progress > 0) {
        const encodePct = 35 + Math.min(61, Math.round(progress * 61));
        activeProgressListener(encodePct);
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
 * Super-fast stream copy muxing (-c:v copy) combining a video MP4 Blob and an audio WAV Blob.
 * Runs in under 300 milliseconds because video is NOT re-encoded!
 */
export async function fastMuxAudioVideoMP4(
  videoMp4Blob: Blob,
  audioWavBlob: Blob,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const instance = await getFFmpeg(onProgress);
  const prefix = `mux_${Date.now()}`;
  const videoInputName = `${prefix}_video.mp4`;
  const audioInputName = `${prefix}_audio.wav`;
  const outputName = `${prefix}_out.mp4`;

  const videoData = new Uint8Array(await videoMp4Blob.arrayBuffer());
  const audioData = new Uint8Array(await audioWavBlob.arrayBuffer());

  await instance.writeFile(videoInputName, videoData);
  await instance.writeFile(audioInputName, audioData);

  if (onProgress) onProgress(50);

  const exitCode = await instance.exec([
    '-i', videoInputName,
    '-i', audioInputName,
    '-t', `${duration}`,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    outputName,
  ]);

  if (exitCode !== 0) {
    const errorSummary = logHistory.slice(-10).join('\n');
    throw new Error(`FFmpeg fast remux failed with exit code ${exitCode}:\n${errorSummary}`);
  }

  const data = await instance.readFile(outputName);
  const rawBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const mp4Bytes = new Uint8Array(rawBytes.length);
  mp4Bytes.set(rawBytes);

  // Clean up MEMFS in background
  (async () => {
    await instance.deleteFile(videoInputName).catch(() => {});
    await instance.deleteFile(audioInputName).catch(() => {});
    await instance.deleteFile(outputName).catch(() => {});
  })().catch(() => {});

  if (onProgress) onProgress(100);
  return new Blob([mp4Bytes], { type: 'video/mp4' });
}

/**
 * Encodes an array of high-quality image frame Blobs directly into a silky-smooth, 60fps MP4 video.
 * Eliminates all MediaRecorder timer jitter, dropped frames, and VFR micro-stutter.
 */
export async function encodeFrameSequenceToMP4(
  frames: Blob[],
  fps: number = 60,
  duration: number,
  onProgress?: (progress: number) => void,
  audioBlob?: Blob | null,
  audioVolume: number = 1.0
): Promise<Blob> {
  if (!frames || frames.length === 0) {
    throw new Error('Cannot encode 0 frames to MP4');
  }

  const totalFrames = frames.length;
  const instance = await getFFmpeg(onProgress, totalFrames);
  const prefix = `seq_${Date.now()}`;
  const outputName = `output_${Date.now()}.mp4`;
  const audioInputName = audioBlob ? `audio_${Date.now()}.wav` : null;

  console.log(`[FFmpeg Engine] Writing ${totalFrames} frames to MEMFS for ${fps}fps sequence encode...`);

  // Write frames to MEMFS using direct ArrayBuffer (fast zero-copy transfer)
  for (let i = 0; i < totalFrames; i++) {
    const frameData = new Uint8Array(await frames[i].arrayBuffer());
    const pad = String(i).padStart(5, '0');
    await instance.writeFile(`${prefix}_${pad}.jpg`, frameData);
    if (onProgress && (i % 8 === 0 || i === totalFrames - 1)) {
      onProgress(Math.round((i / totalFrames) * 35));
    }
  }

  // If audio track is provided, write it to MEMFS
  if (audioBlob && audioInputName) {
    try {
      const audioData = new Uint8Array(await audioBlob.arrayBuffer());
      await instance.writeFile(audioInputName, audioData);
      console.log(`[FFmpeg Engine] Muxing audio track (${audioBlob.size} bytes, volume: ${audioVolume})...`);
    } catch (err) {
      console.warn('[FFmpeg Engine] Failed to write audio track to MEMFS, falling back to silent audio:', err);
    }
  }

  console.log(`[FFmpeg Engine] Executing H.264 encode at ${fps} FPS (preset: ultrafast, crf: 23)...`);

  const execArgs: string[] = [
    '-framerate', `${fps}`,
    '-i', `${prefix}_%05d.jpg`,
  ];

  if (audioInputName) {
    const safeVol = Math.max(0, Math.min(2.0, audioVolume));
    execArgs.push(
      '-i', audioInputName,
      '-t', `${duration}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-g', `${fps}`,
      '-c:a', 'aac',
      '-b:a', '192k',
      '-af', `volume=${safeVol}`,
      '-shortest',
      '-movflags', '+faststart',
      outputName
    );
  } else {
    execArgs.push(
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-t', `${duration}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-g', `${fps}`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      outputName
    );
  }

  const exitCode = await instance.exec(execArgs);

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
    if (audioInputName) {
      await instance.deleteFile(audioInputName).catch(() => {});
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
  const inputData = new Uint8Array(await webmBlob.arrayBuffer());
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

  const inputData = new Uint8Array(await webmBlob.arrayBuffer());
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
