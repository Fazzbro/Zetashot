import { describe, it, expect } from 'vitest';
import {
  audioBufferToWavBlob,
  getActiveAudioItemsAtTime,
} from './audioTrackHelper';
import { AudioTrackItem, BUILTIN_AUDIO_PRESETS } from '../types/audioTrack';

describe('audioTrackHelper', () => {
  it('has built-in audio presets defined with music and sfx categories', () => {
    expect(BUILTIN_AUDIO_PRESETS.length).toBeGreaterThanOrEqual(5);
    const music = BUILTIN_AUDIO_PRESETS.filter((p) => p.category === 'music');
    const sfx = BUILTIN_AUDIO_PRESETS.filter((p) => p.category === 'sfx');
    expect(music.length).toBeGreaterThanOrEqual(2);
    expect(sfx.length).toBeGreaterThanOrEqual(3);
  });

  it('filters active audio items by timestamp and mute state', () => {
    const items: AudioTrackItem[] = [
      {
        id: 'bgm1',
        name: 'Track 1',
        url: 'blob:mock1',
        type: 'music',
        startTime: 0,
        duration: 10,
        volume: 0.8,
        isMuted: false,
      },
      {
        id: 'sfx1',
        name: 'Whoosh',
        url: 'blob:mock2',
        type: 'sfx',
        startTime: 4.5,
        duration: 0.5,
        volume: 1.0,
        isMuted: false,
      },
      {
        id: 'bgm2_muted',
        name: 'Track 2',
        url: 'blob:mock3',
        type: 'music',
        startTime: 0,
        duration: 10,
        volume: 1.0,
        isMuted: true,
      },
    ];

    // At t = 2s: only bgm1 is active (bgm2_muted is muted)
    const at2 = getActiveAudioItemsAtTime(items, 2.0);
    expect(at2.length).toBe(1);
    expect(at2[0].id).toBe('bgm1');

    // At t = 4.7s: both bgm1 and sfx1 are active
    const at4_7 = getActiveAudioItemsAtTime(items, 4.7);
    expect(at4_7.length).toBe(2);
    expect(at4_7.map((i) => i.id)).toEqual(['bgm1', 'sfx1']);

    // At t = 5.2s: sfx1 finished, only bgm1
    const at5_2 = getActiveAudioItemsAtTime(items, 5.2);
    expect(at5_2.length).toBe(1);
    expect(at5_2[0].id).toBe('bgm1');
  });

  it('generates a valid 16-bit PCM WAV Blob from an AudioBuffer', () => {
    // Create a mock AudioBuffer
    const sampleRate = 44100;
    const length = 4410; // 0.1s
    const channelData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      channelData[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI);
    }

    const mockBuffer = {
      numberOfChannels: 1,
      sampleRate,
      length,
      duration: length / sampleRate,
      getChannelData: () => channelData,
    } as unknown as AudioBuffer;

    const blob = audioBufferToWavBlob(mockBuffer);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
    // Header size (44) + data size (4410 * 1 channel * 2 bytes = 8820) = 8864
    expect(blob.size).toBe(44 + length * 2);
  });
});
