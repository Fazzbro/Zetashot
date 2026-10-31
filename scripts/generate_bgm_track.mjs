import fs from 'fs';
import path from 'path';

// Master Audio Parameters
const SAMPLE_RATE = 48000;
const DURATION_SEC = 59.0;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);
const BPM = 124;
const BEAT_DURATION = 60 / BPM; // ~0.48387s per beat
const SIXTEENTH = BEAT_DURATION / 4;

console.log(`Generating procedural BGM track (${DURATION_SEC}s, 48kHz stereo, ${BPM} BPM)...`);

const leftBuffer = new Float32Array(TOTAL_SAMPLES);
const rightBuffer = new Float32Array(TOTAL_SAMPLES);

// Chords (frequencies in Hz)
const CHORD_PROGRESSION = [
  // Dm9: D3, F3, A3, C4, E4
  { bass: 73.42, notes: [146.83, 174.61, 220.00, 261.63, 329.63] },
  // Bbmaj9: Bb2, D3, F3, A3, C4
  { bass: 58.27, notes: [116.54, 146.83, 174.61, 220.00, 261.63] },
  // Fmaj7: F2, C3, E3, A3, C4
  { bass: 87.31, notes: [130.81, 164.81, 220.00, 261.63, 329.63] },
  // Cadd9: C2, G2, D3, E3, G3
  { bass: 65.41, notes: [130.81, 146.83, 196.00, 246.94, 293.66] },
];

function getChordAtTime(t) {
  // Each chord lasts 4 bars = 16 beats (~7.74s)
  const barTime = BEAT_DURATION * 4;
  const loopTime = barTime * 4;
  const posInLoop = t % loopTime;
  const chordIdx = Math.min(3, Math.floor(posInLoop / barTime));
  return CHORD_PROGRESSION[chordIdx];
}

// 1. Kick Drum Generator
function addKick(startSample) {
  const kickLength = Math.floor(SAMPLE_RATE * 0.28);
  for (let i = 0; i < kickLength; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    // Exponential pitch sweep: 155Hz down to 42Hz
    const pitch = 42 + 113 * Math.exp(-t * 32);
    const phase = 2 * Math.PI * pitch * t;
    const amp = Math.exp(-t * 14);
    const click = i < 40 ? (Math.random() * 2 - 1) * 0.25 : 0;
    const val = (Math.sin(phase) * amp + click) * 0.55;
    leftBuffer[idx] += val;
    rightBuffer[idx] += val;
  }
}

// 2. Snare / Clap Generator
function addClap(startSample) {
  const clapLength = Math.floor(SAMPLE_RATE * 0.22);
  for (let i = 0; i < clapLength; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    // Noise burst with envelope
    const noise = Math.random() * 2 - 1;
    const tonal = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t * 28);
    const env = Math.exp(-t * 18);
    const val = (noise * 0.7 + tonal * 0.3) * env * 0.28;
    // Stereo spread
    leftBuffer[idx] += val * 0.95;
    rightBuffer[idx] += val * 1.05;
  }
}

// 3. Hi-Hat Generator
function addHiHat(startSample, isUpbeat = false) {
  const hatLength = Math.floor(SAMPLE_RATE * (isUpbeat ? 0.08 : 0.035));
  const pan = isUpbeat ? 0.7 : 0.3; // Stereo panning
  for (let i = 0; i < hatLength; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const noise = Math.random() * 2 - 1;
    const env = Math.exp(-t * (isUpbeat ? 40 : 90));
    const val = noise * env * (isUpbeat ? 0.16 : 0.09);
    leftBuffer[idx] += val * (1 - pan);
    rightBuffer[idx] += val * pan;
  }
}

// 4. Bassline
function addBass() {
  const stepDuration = BEAT_DURATION / 2; // Eighth notes
  const totalSteps = Math.floor(DURATION_SEC / stepDuration);
  for (let step = 0; step < totalSteps; step++) {
    const startT = step * stepDuration;
    const startSample = Math.floor(startT * SAMPLE_RATE);
    const chord = getChordAtTime(startT);
    const freq = chord.bass;
    const noteLength = Math.floor(SAMPLE_RATE * (stepDuration * 0.85));

    for (let i = 0; i < noteLength; i++) {
      const idx = startSample + i;
      if (idx >= TOTAL_SAMPLES) break;
      const t = i / SAMPLE_RATE;
      // Saw + Sub Sine with lowpass filter sweep
      const saw = (2 * ((t * freq) % 1) - 1);
      const sub = Math.sin(2 * Math.PI * (freq / 2) * t);
      const env = Math.exp(-t * 7);
      const val = (saw * 0.4 + sub * 0.6) * env * 0.25;
      leftBuffer[idx] += val;
      rightBuffer[idx] += val;
    }
  }
}

// 5. Synth Ambient Pad
function addPads() {
  let phaseAcc = [0, 0, 0, 0, 0];
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const chord = getChordAtTime(t);
    let sampleL = 0;
    let sampleR = 0;

    for (let n = 0; n < chord.notes.length; n++) {
      const f = chord.notes[n];
      phaseAcc[n] += (2 * Math.PI * f) / SAMPLE_RATE;
      // Detuned saw voices
      const voice1 = Math.sin(phaseAcc[n]);
      const voice2 = Math.sin(phaseAcc[n] * 1.006 + 0.5);
      const voice3 = Math.sin(phaseAcc[n] * 0.994 - 0.5);
      sampleL += (voice1 + voice2) * 0.02;
      sampleR += (voice1 + voice3) * 0.02;
    }
    // Subtle low-frequency filter modulation
    const mod = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.2 * t);
    leftBuffer[i] += sampleL * mod;
    rightBuffer[i] += sampleR * mod;
  }
}

// 6. Arpeggio Pluck Hook
function addArpeggio() {
  const totalSixteenths = Math.floor(DURATION_SEC / SIXTEENTH);
  for (let s = 0; s < totalSixteenths; s++) {
    const t = s * SIXTEENTH;
    const chord = getChordAtTime(t);
    // Cycle notes
    const noteIdx = s % chord.notes.length;
    const freq = chord.notes[noteIdx] * 2; // One octave up
    const startSample = Math.floor(t * SAMPLE_RATE);
    const len = Math.floor(SAMPLE_RATE * 0.14);
    const pan = (Math.sin(s * 0.7) + 1) / 2;

    for (let i = 0; i < len; i++) {
      const idx = startSample + i;
      if (idx >= TOTAL_SAMPLES) break;
      const noteT = i / SAMPLE_RATE;
      const osc = Math.sin(2 * Math.PI * freq * noteT) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * noteT);
      const env = Math.exp(-noteT * 24);
      const val = osc * env * 0.08;
      leftBuffer[idx] += val * (1 - pan);
      rightBuffer[idx] += val * pan;
    }
  }
}

// 7. Transition Whoosh SFX
function addWhoosh(time) {
  const startSample = Math.floor(time * SAMPLE_RATE);
  const whooshLen = Math.floor(SAMPLE_RATE * 0.9);
  for (let i = 0; i < whooshLen; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / whooshLen; // 0 to 1
    const noise = Math.random() * 2 - 1;
    // Swell then decay envelope
    const env = Math.sin(Math.PI * t) * Math.sin(Math.PI * t);
    const val = noise * env * 0.15;
    leftBuffer[idx] += val * (1 - t * 0.5);
    rightBuffer[idx] += val * (0.5 + t * 0.5);
  }
}

// Build drum pattern across the track
console.log('Synthesizing rhythm section...');
const totalBeats = Math.floor(DURATION_SEC / BEAT_DURATION);
for (let beat = 0; beat < totalBeats; beat++) {
  const beatTime = beat * BEAT_DURATION;
  const startSample = Math.floor(beatTime * SAMPLE_RATE);

  // Four-on-the-floor kick
  addKick(startSample);

  // Clap on 2 and 4
  if (beat % 2 === 1) {
    addClap(startSample);
  }

  // 16th note Hi-Hats
  for (let step = 0; step < 4; step++) {
    const subSample = startSample + Math.floor(step * SIXTEENTH * SAMPLE_RATE);
    addHiHat(subSample, step === 2);
  }
}

console.log('Synthesizing bassline, pads, arpeggios, and sound design...');
addBass();
addPads();
addArpeggio();

// Add transitions at scene change points
const sceneTransitions = [0.0, 8.5, 19.5, 27.5, 38.5, 49.0];
sceneTransitions.forEach(t => addWhoosh(t));

// Normalize & soft-clip master buffers
console.log('Mastering audio buffers...');
let peak = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  peak = Math.max(peak, Math.abs(leftBuffer[i]), Math.abs(rightBuffer[i]));
}
console.log('Peak before normalization:', peak.toFixed(3));

const targetPeak = 0.92;
const scale = peak > 0 ? targetPeak / peak : 1;

// Write 16-bit PCM WAV File
const outDir = path.resolve('public_assets_capture/audio');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const wavPath = path.join(outDir, 'zetashot_bgm_master.wav');

const numChannels = 2;
const bytesPerSample = 2;
const blockAlign = numChannels * bytesPerSample;
const byteRate = SAMPLE_RATE * blockAlign;
const dataSize = TOTAL_SAMPLES * blockAlign;
const headerSize = 44;
const totalSize = headerSize + dataSize;

const wavBuffer = Buffer.alloc(totalSize);

// RIFF header
wavBuffer.write('RIFF', 0);
wavBuffer.writeUInt32LE(totalSize - 8, 4);
wavBuffer.write('WAVE', 8);

// fmt chunk
wavBuffer.write('fmt ', 12);
wavBuffer.writeUInt32LE(16, 16); // Subchunk1Size
wavBuffer.writeUInt16LE(1, 20); // PCM
wavBuffer.writeUInt16LE(numChannels, 22);
wavBuffer.writeUInt32LE(SAMPLE_RATE, 24);
wavBuffer.writeUInt32LE(byteRate, 28);
wavBuffer.writeUInt16LE(blockAlign, 32);
wavBuffer.writeUInt16LE(16, 34); // Bits per sample

// data chunk
wavBuffer.write('data', 36);
wavBuffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  // Soft limiter (tanh)
  let l = Math.tanh(leftBuffer[i] * scale);
  let r = Math.tanh(rightBuffer[i] * scale);

  let sampleL = Math.max(-32768, Math.min(32767, Math.floor(l * 32767)));
  let sampleR = Math.max(-32768, Math.min(32767, Math.floor(r * 32767)));

  wavBuffer.writeInt16LE(sampleL, offset);
  wavBuffer.writeInt16LE(sampleR, offset + 2);
  offset += 4;
}

fs.writeFileSync(wavPath, wavBuffer);
console.log(`Saved BGM master to: ${wavPath} (${(wavBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
