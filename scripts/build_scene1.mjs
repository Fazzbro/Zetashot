import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('public_assets_capture/scenes');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const heroImg = path.resolve('public_assets_capture/01_clean_hero_studio.png');
const overlayImg = path.resolve('public_assets_capture/overlays/overlay_scene1_intro.png');
const scene1Out = path.join(outDir, 'scene1.mp4');

console.log('Rendering Scene 1 (Intro, 8.8s, 60fps)...');

// FFmpeg command:
// 1. Generate dark background base (1920x1080 @ 60fps)
// 2. Loop hero screenshot, scale down slightly to float with subtle zoom (0.88 -> 0.94) and drop shadow
// 3. Overlay the hero card at center
// 4. Overlay the transparent title card (overlay_scene1_intro.png) with fade-in from t=0.2 to t=0.8
const filterComplex = `
color=c=#070a14:s=1920x1080:r=60:d=8.8[bg];
[0:v]scale=1728:972,setsar=1[hero_scaled];
[bg][hero_scaled]overlay=x=96:y=54[base];
[1:v]fade=t=in:st=0.3:d=0.6:alpha=1[card_faded];
[base][card_faded]overlay=0:0:format=auto[outv]
`.replace(/\n/g, ' ');

const cmd = `ffmpeg -y -loop 1 -t 8.8 -i "${heroImg}" -loop 1 -t 8.8 -i "${overlayImg}" -filter_complex "${filterComplex}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene1Out}"`;

execSync(cmd, { stdio: 'inherit' });
console.log('Scene 1 finished:', scene1Out, 'Size:', fs.statSync(scene1Out).size);
