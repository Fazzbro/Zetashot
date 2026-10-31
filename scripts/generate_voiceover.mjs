import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const scenes = [
  {
    id: 'scene1_intro',
    text: 'Introducing Zetashot. The modern 3D camera mockup and video animation studio for creators, designers, and developers.',
    rate: 1,
  },
  {
    id: 'scene2_camera',
    text: 'Transform static screenshots and screen recordings into cinematic 60 FPS 3D videos with 7-degree-of-freedom camera control: pitch, yaw, roll banking, and optical zoom.',
    rate: 1,
  },
  {
    id: 'scene3_compose',
    text: 'With one-click Compose, automatically choreograph fluid camera trajectories and smooth Hermite splines across multiple points of interest.',
    rate: 1,
  },
  {
    id: 'scene4_backgrounds',
    text: 'Choose from curated backdrops, customize canvas aspect ratios for YouTube, TikTok, and Instagram, and style sleek device frames with realistic drop shadows.',
    rate: 1,
  },
  {
    id: 'scene5_export_test',
    text: 'Engineered for rock-solid reliability. Export frame-accurate 60 FPS MP4 videos directly in your browser with hardware-accelerated WebCodecs and WebAssembly.',
    rate: 1,
  },
  {
    id: 'scene6_outro',
    text: 'Zetashot is completely free, local-first, and open source. Create your next cinematic product demo today at zetashot dot vercel dot app.',
    rate: 1,
  },
];

const audioDir = path.resolve('public_assets_capture/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

async function generateAll() {
  console.log('Generating voiceover clips with Microsoft Zira Desktop...');
  const results = [];

  for (const scene of scenes) {
    const wavPath = path.join(audioDir, `${scene.id}.wav`);
    const psScript = `
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $speak.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like "*Zira*" } | Select-Object -First 1
if ($voice) {
  $speak.SelectVoice($voice.VoiceInfo.Name)
}
$speak.Rate = ${scene.rate}
$speak.SetOutputToWaveFile('${wavPath.replace(/\\/g, '\\\\')}')
$speak.Speak('${scene.text.replace(/'/g, "''")}')
$speak.Dispose()
`;

    const psFile = path.join(audioDir, `temp_${scene.id}.ps1`);
    fs.writeFileSync(psFile, psScript, 'utf8');
    execSync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { stdio: 'inherit' });
    if (fs.existsSync(psFile)) fs.unlinkSync(psFile);

    // Probe duration using ffprobe
    const probe = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`,
      { encoding: 'utf8' }
    ).trim();

    const duration = parseFloat(probe);
    console.log(`[${scene.id}] duration: ${duration.toFixed(3)}s`);
    results.push({ id: scene.id, duration, path: wavPath, text: scene.text });
  }

  const manifestPath = path.join(audioDir, 'voiceover_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('Voiceover generation complete!');
}

generateAll().catch(console.error);
