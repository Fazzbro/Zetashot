export type VideoCodec = 'webm-vp9' | 'webm-vp8' | 'mp4';
export type VideoResolution = '720p' | '1080p' | '1440p' | '4k';
export type VideoFps = 24 | 30 | 60;

export interface RecorderOptions {
  resolution: VideoResolution;
  fps: VideoFps;
  bitrate?: number; // bits per second, e.g. 8000000 (8 Mbps)
  format?: 'webm' | 'mp4';
  includeAudio?: boolean;
}

export interface RecordingResult {
  blob: Blob;
  dataUrl: string;
  duration: number; // in seconds
  filename: string;
  format: string;
}

export class RecorderEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private timerInterval: any = null;
  private onTimeUpdateCallback: ((seconds: number) => void) | null = null;

  public isRecording: boolean = false;
  public isPaused: boolean = false;

  static getSupportedMimeType(preferredFormat: 'webm' | 'mp4' = 'webm'): string {
    if (typeof MediaRecorder === 'undefined') return 'video/webm';

    const types = preferredFormat === 'mp4'
      ? [
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  /**
   * Starts recording a target Canvas stream.
   */
  startRecording(
    canvas: HTMLCanvasElement,
    options: RecorderOptions,
    onTimeUpdate?: (seconds: number) => void
  ): void {
    if (this.isRecording) return;

    this.recordedChunks = [];
    this.onTimeUpdateCallback = onTimeUpdate || null;
    const fps = options.fps || 60;
    this.stream = canvas.captureStream(fps);

    const mimeType = RecorderEngine.getSupportedMimeType(options.format || 'webm');
    const bitrate = options.bitrate || (options.resolution === '4k' ? 25000000 : options.resolution === '1440p' ? 14000000 : 8000000);

    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: bitrate,
    };

    this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // 100ms slice for smooth chunk collection
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.totalPausedDuration = 0;

    this.timerInterval = setInterval(() => {
      if (this.isRecording && !this.isPaused && this.onTimeUpdateCallback) {
        const elapsed = Math.max(0, (Date.now() - this.startTime - this.totalPausedDuration) / 1000);
        this.onTimeUpdateCallback(elapsed);
      }
    }, 200);
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.pausedTime = Date.now();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
      this.totalPausedDuration += Date.now() - this.pausedTime;
    }
  }

  stopRecording(projectName: string = 'recording'): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      clearInterval(this.timerInterval);
      const totalDuration = (Date.now() - this.startTime - this.totalPausedDuration) / 1000;

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const isMp4 = mimeType.includes('mp4');
        const format = isMp4 ? 'mp4' : 'webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const dataUrl = URL.createObjectURL(blob);

        const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `openshot-${cleanName || 'recording'}-${dateStr}.${format}`;

        // Cleanup tracks
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }
        this.isRecording = false;
        this.isPaused = false;
        this.mediaRecorder = null;

        resolve({
          blob,
          dataUrl,
          duration: totalDuration,
          filename,
          format,
        });
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    this.isPaused = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

export const recorderEngine = new RecorderEngine();
