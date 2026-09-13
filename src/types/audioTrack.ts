export interface AudioTrackItem {
  id: string;
  name: string;
  url: string;
  type: 'music' | 'sfx' | 'voiceover';
  startTime: number; // in seconds on master timeline
  duration: number; // in seconds
  sourceStartTime?: number; // trim in offset in seconds
  volume: number; // 0.0 to 1.0 (default 1.0)
  isMuted?: boolean;
}

export interface AudioPreset {
  id: string;
  name: string;
  category: 'music' | 'sfx';
  duration: number;
  description: string;
}

/**
 * Built-in preset catalog for instant ambient music and sound effects.
 */
export const BUILTIN_AUDIO_PRESETS: AudioPreset[] = [
  // Music Presets
  {
    id: 'preset_music_lofi',
    name: 'Lo-Fi Chill Ambient',
    category: 'music',
    duration: 12.0,
    description: 'Warm, mellow synth chords with a gentle vinyl texture',
  },
  {
    id: 'preset_music_tech',
    name: 'Modern Tech Pulse',
    category: 'music',
    duration: 12.0,
    description: 'Crisp minimal electronic beat for product showcases',
  },
  {
    id: 'preset_music_cinematic',
    name: 'Cinematic Dawn',
    category: 'music',
    duration: 12.0,
    description: 'Uplifting atmospheric swell for dramatic reveals',
  },
  // SFX Presets
  {
    id: 'preset_sfx_whoosh',
    name: 'Smooth Camera Whoosh',
    category: 'sfx',
    duration: 0.6,
    description: 'Aerodynamic air rush for rapid camera transitions',
  },
  {
    id: 'preset_sfx_shutter',
    name: 'Camera Shutter Click',
    category: 'sfx',
    duration: 0.4,
    description: 'Crisp mechanical snap for freeze-frames and snapshots',
  },
  {
    id: 'preset_sfx_chime',
    name: 'Success Chime',
    category: 'sfx',
    duration: 0.9,
    description: 'Bright harmonic chime for feature highlights',
  },
  {
    id: 'preset_sfx_pop',
    name: 'Minimal Interface Pop',
    category: 'sfx',
    duration: 0.25,
    description: 'Subtle tactile tap for UI activations',
  },
];
