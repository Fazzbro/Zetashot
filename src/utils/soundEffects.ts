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

/**
 * Warm radiant gradient transition sound:
 * A cinematic airy whoosh with a soft exposure bloom swell and shimmering chime.
 */
export function playGradientTransitionSound(volumeScale = 1.0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dur = 0.5;

    // 1. Filtered airy noise swell (whoosh)
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      // Parabolic envelope peaking at 50%
      const env = Math.sin(p * Math.PI);
      output[i] = (Math.random() * 2 - 1) * env;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const bqFilter = ctx.createBiquadFilter();
    bqFilter.type = 'bandpass';
    bqFilter.frequency.setValueAtTime(600, t);
    bqFilter.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.5);
    bqFilter.frequency.exponentialRampToValueAtTime(450, t + dur);
    bqFilter.Q.value = 2.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.35 * volumeScale, t + dur * 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noiseSrc.connect(bqFilter);
    bqFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSrc.start(t);
    noiseSrc.stop(t + dur);

    // 2. Warm low-sub swell for weight
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.linearRampToValueAtTime(140, t + dur * 0.5);
    subOsc.frequency.exponentialRampToValueAtTime(60, t + dur);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.25 * volumeScale, t + dur * 0.5);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(t);
    subOsc.stop(t + dur);
  } catch {
    // Fail silently
  }
}

/**
 * Block-by-block mosaic transition sound:
 * Rapid, high-tech cascade of tactile mechanical tile clicks / digital shutter flips.
 */
export function playBlockTransitionSound(volumeScale = 1.0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseT = ctx.currentTime;
    const numTicks = 8;
    const totalSpan = 0.38;

    for (let i = 0; i < numTicks; i++) {
      const frac = i / (numTicks - 1);
      const tickT = baseT + frac * totalSpan + (Math.random() - 0.5) * 0.015;
      const isFinal = i === numTicks - 1;

      // Micro click pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = isFinal ? 'square' : 'triangle';
      const pitch = isFinal ? 1200 : 2200 + i * 180 + (Math.random() - 0.5) * 200;
      osc.frequency.setValueAtTime(pitch, tickT);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, tickT + (isFinal ? 0.04 : 0.012));

      filter.type = 'highpass';
      filter.frequency.value = 800;

      const clickVol = (isFinal ? 0.35 : 0.18 + frac * 0.12) * volumeScale;
      gain.gain.setValueAtTime(clickVol, tickT);
      gain.gain.exponentialRampToValueAtTime(0.001, tickT + (isFinal ? 0.045 : 0.015));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(tickT);
      osc.stop(tickT + (isFinal ? 0.05 : 0.02));
    }
  } catch {
    // Fail silently
  }
}

/**
 * Universal auto transition sound dispatcher
 */
export function playTransitionSound(type: string, volumeScale = 1.0) {
  if (!soundEnabled) return;
  if (type === 'gradient') {
    playGradientTransitionSound(volumeScale);
  } else if (type === 'blocks') {
    playBlockTransitionSound(volumeScale);
  }
}

/**
 * Offline PCM audio synthesis for exporting transition sound effects in video files.
 * Generates raw Float32Array audio waveform at the specified sample rate.
 */
export function synthesizeTransitionAudioWaveform(
  type: 'gradient' | 'blocks',
  sampleRate = 44100,
  duration = 0.5
): Float32Array {
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(totalSamples);

  if (type === 'gradient') {
    for (let i = 0; i < totalSamples; i++) {
      const p = i / totalSamples;
      const env = Math.sin(p * Math.PI);

      // Noise whoosh
      const noise = (Math.random() * 2 - 1) * env * 0.35;

      // Low sine rumble
      const freq = 90 + Math.sin(p * Math.PI) * 50;
      const t = i / sampleRate;
      const sub = Math.sin(2 * Math.PI * freq * t) * env * 0.25;

      buffer[i] = Math.max(-1, Math.min(1, noise + sub));
    }
  } else if (type === 'blocks') {
    const numTicks = 8;
    for (let tick = 0; tick < numTicks; tick++) {
      const frac = tick / (numTicks - 1);
      const startSample = Math.floor(frac * totalSamples * 0.8);
      const isFinal = tick === numTicks - 1;
      const clickDurSamples = Math.floor((isFinal ? 0.045 : 0.016) * sampleRate);
      const baseFreq = isFinal ? 1200 : 2200 + tick * 180;

      for (let j = 0; j < clickDurSamples; j++) {
        const idx = startSample + j;
        if (idx >= totalSamples) break;
        const clickFrac = j / clickDurSamples;
        const clickEnv = Math.exp(-clickFrac * 6);
        const t = j / sampleRate;
        const currentFreq = baseFreq * (1 - clickFrac * 0.6);
        const val = Math.sin(2 * Math.PI * currentFreq * t) * clickEnv * (isFinal ? 0.4 : 0.22);
        buffer[idx] += val;
      }
    }
    // Normalize if clipping
    for (let i = 0; i < totalSamples; i++) {
      buffer[i] = Math.max(-1, Math.min(1, buffer[i]));
    }
  }

  return buffer;
}
