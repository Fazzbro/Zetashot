import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface WebCodecsExportOptions {
  width: number;
  height: number;
  fps: number;
  bitrate?: number;
  audioBuffer?: AudioBuffer | null;
  onProgress?: (progress: number) => void;
}

/**
 * Checks if the WebCodecs API (VideoEncoder and VideoFrame) is available in the current browser.
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).VideoEncoder === 'function' &&
    typeof (window as any).VideoFrame === 'function'
  );
}

/**
 * Checks if AudioEncoder is available and supports AAC encoding.
 */
export async function isAudioEncoderSupported(sampleRate: number = 44100): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    typeof (window as any).AudioEncoder !== 'function' ||
    typeof (window as any).AudioData !== 'function'
  ) {
    return false;
  }

  try {
    const config = {
      codec: 'mp4a.40.2',
      sampleRate,
      numberOfChannels: 2,
      bitrate: 128000,
    };
    const res = await (window as any).AudioEncoder.isConfigSupported(config);
    return !!res.supported;
  } catch {
    return false;
  }
}

/**
 * High-performance hardware-accelerated MP4 export session utilizing the browser's GPU.
 * Encodes frames on-the-fly directly from the render canvas into H.264 without memory bloat.
 */
export class WebCodecsMP4Session {
  private muxer: Muxer<ArrayBufferTarget>;
  private videoEncoder: VideoEncoder;
  private audioEncoder: AudioEncoder | null = null;
  private width: number;
  private height: number;
  private fps: number;
  private audioBuffer: AudioBuffer | null;
  private audioEncoded = false;
  private encodeError: Error | null = null;

  constructor(options: WebCodecsExportOptions, audioSupported: boolean = false) {
    // Macroblock dimension clamping: dimensions must be even for H.264
    this.width = Math.floor(options.width / 2) * 2;
    this.height = Math.floor(options.height / 2) * 2;
    this.fps = options.fps;
    this.audioBuffer = options.audioBuffer || null;

    const hasAudio = audioSupported && !!this.audioBuffer && this.audioBuffer.length > 0;

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: this.width,
        height: this.height,
        frameRate: this.fps,
      },
      audio: hasAudio
        ? {
            codec: 'aac',
            numberOfChannels: 2,
            sampleRate: this.audioBuffer!.sampleRate || 44100,
          }
        : undefined,
      fastStart: 'in-memory',
      firstTimestampBehavior: 'strict',
    });

    this.videoEncoder = new (window as any).VideoEncoder({
      output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => {
        try {
          this.muxer.addVideoChunk(chunk, meta);
        } catch (err) {
          console.error('[WebCodecs Exporter] Failed to add video chunk:', err);
          this.encodeError = err instanceof Error ? err : new Error(String(err));
        }
      },
      error: (e: any) => {
        console.error('[WebCodecs Exporter] VideoEncoder internal error:', e);
        this.encodeError = new Error(e?.message || 'VideoEncoder error');
      },
    });

    // Select suitable bitrate based on resolution and framerate
    const pixelCount = this.width * this.height;
    let targetBitrate = options.bitrate;
    if (!targetBitrate) {
      if (pixelCount > 1920 * 1080) {
        targetBitrate = this.fps >= 60 ? 25_000_000 : 18_000_000;
      } else if (pixelCount >= 1280 * 720) {
        targetBitrate = this.fps >= 60 ? 12_000_000 : 8_000_000;
      } else {
        targetBitrate = 5_000_000;
      }
    }

    // Configure H.264 (AVC High Profile or Baseline)
    this.videoEncoder.configure({
      codec: 'avc1.4d002a', // Main profile, Level 4.2
      width: this.width,
      height: this.height,
      bitrate: targetBitrate,
      framerate: this.fps,
      avc: { format: 'avc' },
    });

    if (hasAudio) {
      try {
        const aEncoder = new (window as any).AudioEncoder({
          output: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => {
            try {
              if (this.muxer) {
                this.muxer.addAudioChunk(chunk, meta);
              }
            } catch (err) {
              console.warn('[WebCodecs Exporter] Audio chunk add error:', err);
            }
          },
          error: (e: any) => {
            console.warn('[WebCodecs Exporter] AudioEncoder internal error:', e);
          },
        });

        aEncoder.configure({
          codec: 'mp4a.40.2',
          sampleRate: this.audioBuffer!.sampleRate || 44100,
          numberOfChannels: 2,
          bitrate: 192000,
        });

        this.audioEncoder = aEncoder;
      } catch (audioErr) {
        console.warn('[WebCodecs Exporter] Could not configure AudioEncoder, proceeding with video-only mux:', audioErr);
        this.audioEncoder = null;
      }
    }
  }

  /**
   * Encodes a single rendered frame from the canvas into the video stream.
   * Runs directly on GPU with immediate frame cleanup.
   */
  async addFrame(canvas: HTMLCanvasElement, frameIndex: number): Promise<void> {
    if (this.encodeError) {
      throw this.encodeError;
    }

    const timestampMicroseconds = Math.round((frameIndex / this.fps) * 1_000_000);
    const durationMicroseconds = Math.round((1 / this.fps) * 1_000_000);
    const isKeyframe = frameIndex % (this.fps * 2) === 0;

    const videoFrame = new (window as any).VideoFrame(canvas, {
      timestamp: timestampMicroseconds,
      duration: durationMicroseconds,
    });

    this.videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
    videoFrame.close();

    // Prevent GPU queue starvation if the system renders faster than hardware encode
    if (this.videoEncoder.encodeQueueSize > 6) {
      await new Promise((r) => setTimeout(r, 6));
    }
  }

  /**
   * Encodes the complete AudioBuffer into the audio track.
   */
  private async encodeAudio(): Promise<void> {
    if (!this.audioEncoder || !this.audioBuffer || this.audioEncoded) return;
    this.audioEncoded = true;

    try {
      const sampleRate = this.audioBuffer.sampleRate;
      const totalSamples = this.audioBuffer.length;
      const numberOfChannels = 2;
      const channel0 = this.audioBuffer.getChannelData(0);
      const channel1 = this.audioBuffer.numberOfChannels > 1 ? this.audioBuffer.getChannelData(1) : channel0;

      const chunkSize = 1024; // Standard AAC frame size

      for (let offset = 0; offset < totalSamples; offset += chunkSize) {
        const currentChunk = Math.min(chunkSize, totalSamples - offset);
        const planarBuffer = new Float32Array(currentChunk * numberOfChannels);
        planarBuffer.set(channel0.subarray(offset, offset + currentChunk), 0);
        planarBuffer.set(channel1.subarray(offset, offset + currentChunk), currentChunk);

        const timestampUs = Math.round((offset / sampleRate) * 1_000_000);

        const audioData = new (window as any).AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfChannels,
          numberOfFrames: currentChunk,
          timestamp: timestampUs,
          data: planarBuffer,
        });

        this.audioEncoder.encode(audioData);
        audioData.close();
      }

      await this.audioEncoder.flush();
    } catch (err) {
      console.warn('[WebCodecs Exporter] Audio encoding encountered an issue, proceeding:', err);
    }
  }

  /**
   * Flushes all encoders and finalizes the MP4 container into a standard Blob.
   */
  async finalize(): Promise<Blob> {
    if (this.encodeError) {
      throw this.encodeError;
    }

    // Flush video encoder
    await this.videoEncoder.flush();

    // Encode audio if present and configured
    await this.encodeAudio();

    // Finalize MP4 muxer
    this.muxer.finalize();

    const buffer = this.muxer.target.buffer;
    return new Blob([buffer], { type: 'video/mp4' });
  }

  /**
   * Closes encoders safely on error or abort.
   */
  destroy(): void {
    try {
      if (this.videoEncoder && this.videoEncoder.state !== 'closed') {
        this.videoEncoder.close();
      }
    } catch {}
    try {
      if (this.audioEncoder && this.audioEncoder.state !== 'closed') {
        this.audioEncoder.close();
      }
    } catch {}
  }
}
