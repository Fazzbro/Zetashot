import { FFmpeg } from '@ffmpeg/ffmpeg';
import fs from 'fs';
import path from 'path';

async function test() {
  const ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg Log]', message);
  });
  ffmpeg.on('progress', ({ progress }) => {
    console.log('[Progress]', Math.round(progress * 100) + '%');
  });

  const coreJs = fs.readFileSync('public/ffmpeg/ffmpeg-core.js');
  const coreWasm = fs.readFileSync('public/ffmpeg/ffmpeg-core.wasm');

  const coreBlob = new Blob([coreJs], { type: 'text/javascript' });
  const wasmBlob = new Blob([coreWasm], { type: 'application/wasm' });

  const coreURL = URL.createObjectURL(coreBlob);
  const wasmURL = URL.createObjectURL(wasmBlob);

  console.log('Loading FFmpeg...');
  await ffmpeg.load({ coreURL, wasmURL });
  console.log('FFmpeg loaded successfully!');

  const webmBuffer = fs.readFileSync('downloads/openshot-test-mp4-1787792025978.webm');
  await ffmpeg.writeFile('input.webm', webmBuffer);
  console.log('Wrote input.webm, length:', webmBuffer.length);

  console.log('Running transcode...');
  const exitCode = await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-level', '4.0',
    '-r', '30',
    '-g', '30',
    '-movflags', '+faststart',
    'output.mp4',
  ]);
  console.log('Exit code:', exitCode);

  if (exitCode === 0) {
    const data = await ffmpeg.readFile('output.mp4');
    fs.writeFileSync('downloads/test_output.mp4', Buffer.from(data));
    console.log('Successfully written test_output.mp4, size:', data.length);
  } else {
    console.error('FFmpeg execution failed with code:', exitCode);
  }
}

test().catch(console.error);
