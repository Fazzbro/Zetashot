let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let lastGearPlayTime = 0;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Authentic mechanical gear/ratchet click sound like ui.camera
 * Produces a crisp, tactile metallic micro-tick on dial rotation or slider dragging.
 */
export function playGearSound(volumeScale = 1.0) {
  if (!soundEnabled) return;

  const now = performance.now();
  // Rate limit ticks to prevent buzzing when dragging rapidly (min 20ms between ticks)
  if (now - lastGearPlayTime < 20) return;
  lastGearPlayTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Noise transient for mechanical texture (tooth contact)
    const bufferSize = Math.floor(ctx.sampleRate * 0.008); // 8ms noise burst
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3600 + Math.random() * 400; // subtle pitch jitter
    noiseFilter.Q.value = 3.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35 * volumeScale, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.009);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.01);

    // 2. Metallic resonant ping (small metal pawl click)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const oscFilter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = 1800 + Math.random() * 150;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.012);

    oscFilter.type = 'highpass';
    oscFilter.frequency.value = 1000;

    oscGain.gain.setValueAtTime(0.2 * volumeScale, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.018);
  } catch {
    // Fail silently on browsers that block autoplay audio
  }
}

/**
 * Camera shutter sound for photo captures
 */
export function playShutterSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.06);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  } catch {
    // Fail silently
  }
}
