import { AudioTrackItem, AudioPreset, BUILTIN_AUDIO_PRESETS } from '../types/audioTrack';
import { MediaTimelineClip } from '../types/mediaTimeline';
import { synthesizeTransitionAudioWaveform } from './soundEffects';

/**
 * Encodes an AudioBuffer into a standard, universally compliant 16-bit PCM stereo WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * numChannels * bytesPerSample;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Interleave channels and write 16-bit samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Procedurally generates high-quality audio buffers for built-in presets using Web Audio API.
 * Guarantees zero network latency and 100% offline reliability.
 */
export async function generatePresetAudioBlob(presetId: string): Promise<Blob> {
  const sampleRate = 44100;
  const preset = BUILTIN_AUDIO_PRESETS.find((p) => p.id === presetId) || BUILTIN_AUDIO_PRESETS[0];
  const duration = preset.duration;
  const length = Math.round(sampleRate * duration);

  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    // Fallback: empty short silent WAV
    const dummyBuffer = new AudioBuffer({ length: 4410, numberOfChannels: 2, sampleRate });
    return audioBufferToWavBlob(dummyBuffer);
  }

  const ctx = new OfflineCtx(2, length, sampleRate);

  if (presetId === 'preset_music_lofi') {
    // Warm chords progression with subtle tremolo & gentle envelope
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];
    const barDuration = duration / chords.length;

    chords.forEach((chord, chordIdx) => {
      const startTime = chordIdx * barDuration;
      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, startTime);
        filter.Q.setValueAtTime(2, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.4);
        gain.gain.setValueAtTime(0.08, startTime + barDuration - 0.5);
        gain.gain.linearRampToValueAtTime(0, startTime + barDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + barDuration);
      });
    });
  } else if (presetId === 'preset_music_tech') {
    // Modern rhythmic electronic pulse
    const tempo = 120;
    const beatInterval = 60 / tempo;
    const totalBeats = Math.floor(duration / beatInterval);

    for (let b = 0; b < totalBeats; b++) {
      const time = b * beatInterval;
      // Kick / low sub
      if (b % 2 === 0) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, time);
        kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
        kickGain.gain.setValueAtTime(0.35, time);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        kickOsc.connect(kickGain);
        kickGain.connect(ctx.destination);
        kickOsc.start(time);
        kickOsc.stop(time + 0.22);
      }

      // Synth arp note
      const arpNotes = [440, 523.25, 659.25, 587.33];
      const noteFreq = arpNotes[b % arpNotes.length];
      const noteOsc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      noteOsc.type = 'sawtooth';
      noteOsc.frequency.setValueAtTime(noteFreq, time);
      noteGain.gain.setValueAtTime(0.04, time);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      noteOsc.connect(noteGain);
      noteGain.connect(ctx.destination);
      noteOsc.start(time);
      noteOsc.stop(time + 0.16);
    }
  } else if (presetId === 'preset_music_cinematic') {
    // Cinematic Dawn: deep warm drone and swelling harmonics
    const bassFreqs = [110, 164.81, 220];
    bassFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, 0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, 0);
      filter.frequency.linearRampToValueAtTime(1200, duration * 0.7);

      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(0.12, duration * 0.4);
      gain.gain.linearRampToValueAtTime(0, duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(0);
      osc.stop(duration);
    });
  } else if (presetId === 'preset_sfx_whoosh') {
    // Aerodynamic whoosh: rich and punchy
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, 0);
    osc.frequency.exponentialRampToValueAtTime(750, 0.25);
    osc.frequency.exponentialRampToValueAtTime(120, 0.55);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, 0);
    filter.frequency.linearRampToValueAtTime(1600, 0.25);
    filter.frequency.linearRampToValueAtTime(250, 0.55);
    filter.Q.setValueAtTime(2.5, 0);

    gain.gain.setValueAtTime(0.001, 0);
    gain.gain.linearRampToValueAtTime(0.7, 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.58);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(0.6);
  } else if (presetId === 'preset_sfx_shutter') {
    // Camera shutter snap
    [0, 0.08].forEach((clickTime) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, clickTime);
      osc.frequency.exponentialRampToValueAtTime(120, clickTime + 0.04);

      gain.gain.setValueAtTime(0.65, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.06);
    });
  } else if (presetId === 'preset_sfx_chime') {
    // Bright success chime (harmonic bell tones)
    const tones = [880, 1318.51, 1760];
    tones.forEach((tone, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone, idx * 0.07);

      gain.gain.setValueAtTime(0, idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.45, idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(idx * 0.07);
      osc.stop(0.9);
    });
  } else {
    // Minimal pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, 0);
    osc.frequency.exponentialRampToValueAtTime(180, 0.15);

    gain.gain.setValueAtTime(0.6, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(0.22);
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}

/**
 * Computes active audio items playing at current timeline timestamp.
 */
export function getActiveAudioItemsAtTime(
  items: AudioTrackItem[],
  time: number
): AudioTrackItem[] {
  if (!items || items.length === 0) return [];
  return items.filter(
    (item) => !item.isMuted && time >= item.startTime && time < item.startTime + item.duration
  );
}

/**
 * Mixes multiple audio tracks and auto transition SFX into a single AudioBuffer using OfflineAudioContext.
 */
export async function mixAudioTracksToAudioBuffer(
  tracks: AudioTrackItem[],
  totalDuration: number,
  transitionClips?: MediaTimelineClip[]
): Promise<AudioBuffer | null> {
  const activeTracks = (tracks || []).filter((t) => !t.isMuted && t.url);
  const activeTransitions = (transitionClips || []).filter(
    (c) => c.transition === 'gradient' || c.transition === 'blocks'
  );

  if (activeTracks.length === 0 && activeTransitions.length === 0) return null;

  const sampleRate = 44100;
  const length = Math.max(1, Math.round(sampleRate * totalDuration));
  const OfflineCtx = (typeof window !== 'undefined')
    ? (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)
    : null;

  if (!OfflineCtx) return null;

  try {
    const ctx = new OfflineCtx(2, length, sampleRate);

    // 1. Mix background music & SFX tracks
    for (const track of activeTracks) {
      try {
        const response = await fetch(track.url);
        const arrayBuf = await response.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);

        const source = ctx.createBufferSource();
        source.buffer = audioBuf;

        const gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(2.0, track.volume ?? 1.0));

        source.connect(gain);
        gain.connect(ctx.destination);

        const trackOffset = track.sourceStartTime || 0;
        const startOnTimeline = Math.max(0, track.startTime);
        const playDuration = Math.min(track.duration, totalDuration - startOnTimeline);

        if (playDuration > 0) {
          source.start(startOnTimeline, trackOffset, playDuration);
        }
      } catch (err) {
        console.warn(`[Audio Mixer] Failed to mix track "${track.name}":`, err);
      }
    }

    // 2. Mix auto transition SFX at clip transition boundaries
    for (const clip of activeTransitions) {
      if (!clip.transition || clip.transition !== 'blocks') continue;
      try {
        const pcm = synthesizeTransitionAudioWaveform(clip.transition, sampleRate, 0.5);
        const transBuffer = ctx.createBuffer(1, pcm.length, sampleRate);
        transBuffer.getChannelData(0).set(pcm);

        const transSource = ctx.createBufferSource();
        transSource.buffer = transBuffer;

        const transGain = ctx.createGain();
        transGain.gain.value = 0.85;

        transSource.connect(transGain);
        transGain.connect(ctx.destination);

        const transStart = Math.max(0, clip.startTime - 0.25);
        if (transStart < totalDuration) {
          transSource.start(transStart);
        }
      } catch (err) {
        console.warn(`[Audio Mixer] Failed to mix transition sound for "${clip.name}":`, err);
      }
    }

    return await ctx.startRendering();
  } catch (err) {
    console.warn('[Audio Mixer] OfflineAudioContext rendering failed:', err);
    return null;
  }
}

/**
 * Mixes multiple audio tracks and auto transition SFX into a single WAV Blob using OfflineAudioContext.
 * Suitable for direct muxing into FFmpeg export.
 */
export async function mixAudioTracksToWavBlob(
  tracks: AudioTrackItem[],
  totalDuration: number,
  transitionClips?: MediaTimelineClip[]
): Promise<Blob | null> {
  const buffer = await mixAudioTracksToAudioBuffer(tracks, totalDuration, transitionClips);
  if (buffer) {
    return audioBufferToWavBlob(buffer);
  }

  const activeTracks = (tracks || []).filter((t) => !t.isMuted && t.url);
  if (activeTracks.length > 0) {
    try {
      const res = await fetch(activeTracks[0].url);
      return await res.blob();
    } catch {
      return null;
    }
  }
  return null;
}


