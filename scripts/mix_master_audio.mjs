import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SAMPLE_RATE = 48000;
const DURATION_SEC = 59.0;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);

const audioDir = path.resolve('public_assets_capture/audio');
const bgmPath = path.join(audioDir, 'zetashot_bgm_master.wav');
const manifest = JSON.parse(fs.readFileSync(path.join(audioDir, 'voiceover_manifest.json'), 'utf8'));

const sceneSchedule = [
  { id: 'scene1_intro', start: 0.5 },
  { id: 'scene2_camera', start: 8.8 },
  { id: 'scene3_compose', start: 19.6 },
  { id: 'scene4_backgrounds', start: 27.6 },
  { id: 'scene5_export_test', start: 38.3 },
  { id: 'scene6_outro', start: 49.0 },
];

console.log('Loading BGM and voiceover tracks...');

// Read BGM WAV
const bgmBuf = fs.readFileSync(bgmPath);
const bgmHeaderSize = 44;
const bgmSamplesCount = Math.floor((bgmBuf.length - bgmHeaderSize) / 4);

const masterLeft = new Float32Array(TOTAL_SAMPLES);
const masterRight = new Float32Array(TOTAL_SAMPLES);

// Copy BGM into float array
for (let i = 0; i < TOTAL_SAMPLES && i < bgmSamplesCount; i++) {
  const off = bgmHeaderSize + i * 4;
  masterLeft[i] = bgmBuf.readInt16LE(off) / 32768.0;
  masterRight[i] = bgmBuf.readInt16LE(off + 2) / 32768.0;
}

// Compute Voiceover and ducking envelope
const duckingGain = new Float32Array(TOTAL_SAMPLES);
duckingGain.fill(0.70); // Default BGM volume when no voice is speaking

const voiceLeft = new Float32Array(TOTAL_SAMPLES);
const voiceRight = new Float32Array(TOTAL_SAMPLES);

for (const sc of sceneSchedule) {
  const item = manifest.find((m) => m.id === sc.id);
  if (!item) continue;
  const wavBuf = fs.readFileSync(item.path);
  // Read wave header info
  const numChannels = wavBuf.readUInt16LE(22);
  const sampleRate = wavBuf.readUInt32LE(24);
  const bitsPerSample = wavBuf.readUInt16LE(34);
  const dataOff = 44; // standard PCM

  const startSample = Math.floor(sc.start * SAMPLE_RATE);
  const bytesPerSample = (bitsPerSample / 8) * numChannels;
  const samplesInVoice = Math.floor((wavBuf.length - dataOff) / bytesPerSample);

  console.log(`Placing ${sc.id} at ${sc.start}s (${item.duration.toFixed(2)}s)...`);

  // Mark ducking envelope: drop to 0.22 (-13dB) during speech with smooth attack/decay
  const duckStart = Math.max(0, startSample - Math.floor(0.2 * SAMPLE_RATE));
  const duckEnd = Math.min(TOTAL_SAMPLES, startSample + samplesInVoice + Math.floor(0.35 * SAMPLE_RATE));

  for (let s = duckStart; s < duckEnd; s++) {
    duckingGain[s] = 0.22;
  }

  // Resample/copy voice samples
  for (let i = 0; i < samplesInVoice; i++) {
    const targetIdx = startSample + i;
    if (targetIdx >= TOTAL_SAMPLES) break;

    const off = dataOff + i * bytesPerSample;
    let sampleVal = 0;
    if (bitsPerSample === 16) {
      sampleVal = wavBuf.readInt16LE(off) / 32768.0;
    }
    voiceLeft[targetIdx] += sampleVal * 1.15; // Crisp voice presence
    voiceRight[targetIdx] += sampleVal * 1.15;
  }
}

// Smooth ducking envelope with moving average filter
const smoothedGain = new Float32Array(TOTAL_SAMPLES);
const filterWindow = Math.floor(SAMPLE_RATE * 0.15); // 150ms smoothing window
let runningSum = 0;

for (let i = 0; i < TOTAL_SAMPLES + filterWindow; i++) {
  if (i < TOTAL_SAMPLES) runningSum += duckingGain[i];
  if (i >= filterWindow) runningSum -= duckingGain[i - filterWindow];
  if (i >= filterWindow / 2 && i - Math.floor(filterWindow / 2) < TOTAL_SAMPLES) {
    smoothedGain[i - Math.floor(filterWindow / 2)] = runningSum / filterWindow;
  }
}

// Mix BGM with Ducking + Voice
console.log('Mixing and mastering final audio track...');
const finalL = new Float32Array(TOTAL_SAMPLES);
const finalR = new Float32Array(TOTAL_SAMPLES);

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const fadeOut = i > TOTAL_SAMPLES - SAMPLE_RATE * 1.5
    ? Math.max(0, (TOTAL_SAMPLES - i) / (SAMPLE_RATE * 1.5))
    : 1.0;

  finalL[i] = (masterLeft[i] * smoothedGain[i] + voiceLeft[i]) * fadeOut;
  finalR[i] = (masterRight[i] * smoothedGain[i] + voiceRight[i]) * fadeOut;
}

// Soft limiter & normalization
let maxVal = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  maxVal = Math.max(maxVal, Math.abs(finalL[i]), Math.abs(finalR[i]));
}
console.log('Final mixed peak:', maxVal.toFixed(3));
const boost = maxVal > 0 ? 0.94 / maxVal : 1.0;

// Write final master WAV
const outWav = path.join(audioDir, 'zetashot_master_soundtrack.wav');
const totalSize = 44 + TOTAL_SAMPLES * 4;
const outBuf = Buffer.alloc(totalSize);

outBuf.write('RIFF', 0);
outBuf.writeUInt32LE(totalSize - 8, 4);
outBuf.write('WAVE', 8);
outBuf.write('fmt ', 12);
outBuf.writeUInt32LE(16, 16);
outBuf.writeUInt16LE(1, 20); // PCM
outBuf.writeUInt16LE(2, 22); // Stereo
outBuf.writeUInt32LE(SAMPLE_RATE, 24);
outBuf.writeUInt32LE(SAMPLE_RATE * 4, 28);
outBuf.writeUInt16LE(4, 32);
outBuf.writeUInt16LE(16, 34);
outBuf.write('data', 36);
outBuf.writeUInt32LE(TOTAL_SAMPLES * 4, 40);

let ptr = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const l = Math.tanh(finalL[i] * boost);
  const r = Math.tanh(finalR[i] * boost);
  outBuf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(l * 32767))), ptr);
  outBuf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(r * 32767))), ptr + 2);
  ptr += 4;
}

fs.writeFileSync(outWav, outBuf);
console.log('Saved master soundtrack WAV:', outWav, 'Size:', outBuf.length);

// Also encode pristine AAC version for ultra-fast muxing
const outAac = path.join(audioDir, 'zetashot_master_soundtrack.m4a');
execSync(`ffmpeg -y -i "${outWav}" -c:a aac -b:a 320k "${outAac}"`, { stdio: 'inherit' });
console.log('Master soundtrack AAC encoded:', outAac);
