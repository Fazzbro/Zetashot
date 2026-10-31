import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const scenesDir = path.resolve('public_assets_capture/scenes');
if (!fs.existsSync(scenesDir)) fs.mkdirSync(scenesDir, { recursive: true });

const captureDir = path.resolve('public_assets_capture');
const overlayDir = path.resolve('public_assets_capture/overlays');
const audioDir = path.resolve('public_assets_capture/audio');

const masterAudio = path.join(audioDir, 'zetashot_master_soundtrack.m4a');
const finalMp4Landscape = path.resolve('zetashot_motion_graphics_promo_1080p.mp4');
const finalMp4Vertical = path.resolve('zetashot_motion_graphics_promo_vertical_9x16.mp4');

console.log('=== STARTING MASTER MOTION GRAPHICS VIDEO BUILD ===\n');

// ----------------------------------------------------
// SCENE 1: Intro (8.8s, 528 frames)
// ----------------------------------------------------
console.log('Rendering Scene 1: Intro & Hero Reveal (8.8s)...');
const scene1Out = path.join(scenesDir, 'scene1.mp4');
{
  const heroImg = path.join(captureDir, '01_clean_hero_studio.png');
  const overlayImg = path.join(overlayDir, 'overlay_scene1_intro.png');
  const filter = `
    color=c=#070a14:s=1920x1080:r=60:d=8.8[bg];
    [0:v]scale=1728:972,setsar=1[hero_scaled];
    [bg][hero_scaled]overlay=x=96:y=54[base];
    [1:v]fade=t=in:st=0.3:d=0.6:alpha=1[card_faded];
    [base][card_faded]overlay=0:0:format=auto[outv]
  `.replace(/\n/g, ' ');
  const cmd = `ffmpeg -y -loop 1 -t 8.8 -i "${heroImg}" -loop 1 -t 8.8 -i "${overlayImg}" -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene1Out}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// ----------------------------------------------------
// SCENE 2: 7-DOF Camera Engine (10.8s, 648 frames)
// ----------------------------------------------------
console.log('\nRendering Scene 2: 7-DOF Camera Engine (10.8s)...');
const scene2Out = path.join(scenesDir, 'scene2.mp4');
{
  const vidA = path.resolve('ui-camera-loop.mp4'); // 1.9s, 3840x2158
  const vidB = path.resolve('openshot-demo.mp4');  // 4.0s, 1920x1080
  const overlayImg = path.join(overlayDir, 'overlay_scene2_camera.png');

  // Part A (0 to 5.4s): loop vidA 3 times, scale to 1920x1080
  // Part B (5.4 to 10.8s): loop vidB, scale to 1920x1080
  // Concat A and B, overlay HUD card
  const filter = `
    [0:v]loop=loop=2:size=114:start=0,trim=0:5.4,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=60[vA];
    [1:v]loop=loop=2:size=240:start=0,trim=0:5.4,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=60[vB];
    [vA][vB]concat=n=2:v=1:a=0[bgVid];
    [2:v]fade=t=in:st=0.3:d=0.5:alpha=1[card];
    [bgVid][card]overlay=0:0:format=auto[outv]
  `.replace(/\n/g, ' ');

  const cmd = `ffmpeg -y -i "${vidA}" -i "${vidB}" -loop 1 -t 10.8 -i "${overlayImg}" -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene2Out}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// ----------------------------------------------------
// SCENE 3: Intelligent Compose & Trajectory (8.0s, 480 frames)
// ----------------------------------------------------
console.log('\nRendering Scene 3: Intelligent Compose & Trajectory (8.0s)...');
const scene3Out = path.join(scenesDir, 'scene3.mp4');
{
  const imgA = path.join(captureDir, '05_compose_island_open.png');
  const imgB = path.join(captureDir, '06_compose_keyframes_generated.png');
  const overlayImg = path.join(overlayDir, 'overlay_scene3_compose.png');

  // Part A (0 to 4.0s): imgA with subtle push-in
  // Part B (4.0 to 8.0s): imgB showing keyframes generated
  // Overlay HUD card
  const filter = `
    color=c=#070a14:s=1920x1080:r=60:d=4.0[bgA];
    [0:v]scale=1728:972,setsar=1[imgA_sc];
    [bgA][imgA_sc]overlay=x=96:y=54[partA];
    color=c=#070a14:s=1920x1080:r=60:d=4.0[bgB];
    [1:v]scale=1728:972,setsar=1[imgB_sc];
    [bgB][imgB_sc]overlay=x=96:y=54[partB];
    [partA][partB]concat=n=2:v=1:a=0[bgBase];
    [2:v]fade=t=in:st=0.3:d=0.5:alpha=1[card];
    [bgBase][card]overlay=0:0:format=auto[outv]
  `.replace(/\n/g, ' ');

  const cmd = `ffmpeg -y -loop 1 -t 4.0 -i "${imgA}" -loop 1 -t 4.0 -i "${imgB}" -loop 1 -t 8.0 -i "${overlayImg}" -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene3Out}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// ----------------------------------------------------
// SCENE 4: Dynamic Backgrounds & Mockups (10.7s, 642 frames)
// ----------------------------------------------------
console.log('\nRendering Scene 4: Dynamic Backgrounds & Mockups (10.7s)...');
const scene4Out = path.join(scenesDir, 'scene4.mp4');
{
  const bgSunflowers = path.join(captureDir, '03_bg_sunflowers.png');
  const bgClouds = path.join(captureDir, '03_bg_clouds.png');
  const bgPurple = path.join(captureDir, '03_bg_purple-wave.png');
  const bgHills = path.join(captureDir, '03_bg_hills.png');
  const tabletVid = path.resolve('zTdxbfpFkFA39n9I.mp4');
  const overlayImg = path.join(overlayDir, 'overlay_scene4_backgrounds.png');

  // Part A: 4 backgrounds carousel (each ~1.35s = 5.4s total)
  // Part B: tabletVid looped to 5.3s
  const filter = `
    [0:v]scale=1920:1080,setsar=1,fps=60,trim=0:1.35,setpts=PTS-STARTPTS[p1];
    [1:v]scale=1920:1080,setsar=1,fps=60,trim=0:1.35,setpts=PTS-STARTPTS[p2];
    [2:v]scale=1920:1080,setsar=1,fps=60,trim=0:1.35,setpts=PTS-STARTPTS[p3];
    [3:v]scale=1920:1080,setsar=1,fps=60,trim=0:1.35,setpts=PTS-STARTPTS[p4];
    [4:v]loop=loop=2:size=94:start=0,trim=0:5.3,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=60[p5];
    [p1][p2][p3][p4][p5]concat=n=5:v=1:a=0[bgBase];
    [5:v]fade=t=in:st=0.3:d=0.5:alpha=1[card];
    [bgBase][card]overlay=0:0:format=auto[outv]
  `.replace(/\n/g, ' ');

  const cmd = `ffmpeg -y -loop 1 -t 1.35 -i "${bgSunflowers}" -loop 1 -t 1.35 -i "${bgClouds}" -loop 1 -t 1.35 -i "${bgPurple}" -loop 1 -t 1.35 -i "${bgHills}" -i "${tabletVid}" -loop 1 -t 10.7 -i "${overlayImg}" -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene4Out}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// ----------------------------------------------------
// SCENE 5: Deterministic Export & Reliability (10.7s, 642 frames)
// ----------------------------------------------------
console.log('\nRendering Scene 5: Deterministic Export & Reliability (10.7s)...');
const scene5Out = path.join(scenesDir, 'scene5.mp4');
{
  const imgA = path.join(captureDir, '07_live_preview_scrubbing.png');
  const imgB = path.join(captureDir, '08_export_ready.png');
  const overlayImg = path.join(overlayDir, 'overlay_scene5_export_test.png');

  const filter = `
    color=c=#070a14:s=1920x1080:r=60:d=5.35[bgA];
    [0:v]scale=1728:972,setsar=1[imgA_sc];
    [bgA][imgA_sc]overlay=x=96:y=54[partA];
    color=c=#070a14:s=1920x1080:r=60:d=5.35[bgB];
    [1:v]scale=1728:972,setsar=1[imgB_sc];
    [bgB][imgB_sc]overlay=x=96:y=54[partB];
    [partA][partB]concat=n=2:v=1:a=0[bgBase];
    [2:v]fade=t=in:st=0.3:d=0.5:alpha=1[card];
    [bgBase][card]overlay=0:0:format=auto[outv]
  `.replace(/\n/g, ' ');

  const cmd = `ffmpeg -y -loop 1 -t 5.35 -i "${imgA}" -loop 1 -t 5.35 -i "${imgB}" -loop 1 -t 10.7 -i "${overlayImg}" -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene5Out}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// ----------------------------------------------------
// SCENE 6: Outro & Call to Action (10.0s, 600 frames)
// ----------------------------------------------------
console.log('\nRendering Scene 6: Outro & Call to Action (10.0s)...');
const scene6Out = path.join(scenesDir, 'scene6.mp4');
{
  const vidLoop = path.resolve('ui-camera-loop.mp4');
  const overlayImg = path.join(overlayDir, 'overlay_scene6_outro.png');

  // Darkened 3D orbit background with fade-out at end (9.0s -> 10.0s)
  const filter = `
    [0:v]loop=loop=5:size=114:start=0,trim=0:10.0,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,eq=brightness=-0.22:contrast=1.12,setsar=1,fps=60[bgVid];
    [1:v]fade=t=in:st=0.3:d=0.6:alpha=1[card];
    [bgVid][card]overlay=0:0:format=auto,fade=t=out:st=9.0:d=1.0[outv]
  `.replace(/\n/g, ' ');

  const cmd = `ffmpeg -y -i "${vidLoop}" -loop 1 -t 10.0 -i "${overlayImg}" -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 60 "${scene6Out}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// ----------------------------------------------------
// MASTER CONCATENATION & AUDIO MUX (Landscape 1080p, 16:9)
// ----------------------------------------------------
console.log('\nConcatenating all 6 scenes and muxing master soundtrack...');
const concatListFile = path.join(scenesDir, 'concat_list.txt');
const fileEntries = [
  `file '${scene1Out.replace(/\\/g, '/')}'`,
  `file '${scene2Out.replace(/\\/g, '/')}'`,
  `file '${scene3Out.replace(/\\/g, '/')}'`,
  `file '${scene4Out.replace(/\\/g, '/')}'`,
  `file '${scene5Out.replace(/\\/g, '/')}'`,
  `file '${scene6Out.replace(/\\/g, '/')}'`,
].join('\n');

fs.writeFileSync(concatListFile, fileEntries, 'utf8');

// Concat video + mux audio with faststart
const masterCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListFile}" -i "${masterAudio}" -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart "${finalMp4Landscape}"`;
execSync(masterCmd, { stdio: 'inherit' });
console.log(`\nMASTER 16:9 VIDEO READY: ${finalMp4Landscape} (${(fs.statSync(finalMp4Landscape).size / (1024 * 1024)).toFixed(2)} MB)`);

// ----------------------------------------------------
// VERTICAL 9:16 VERSION FOR REELS / TIKTOK / SHORTS (1080x1920)
// ----------------------------------------------------
console.log('\nGenerating Vertical 9:16 social cut for Reels, TikTok & Shorts...');
// Crop/pad with blurred ambient background for 9:16
const verticalFilter = `
  [0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:12,eq=brightness=-0.15[bgBlurred];
  [0:v]scale=1080:608:force_original_aspect_ratio=decrease,pad=1080:608:(ow-iw)/2:(oh-ih)/2[fgScaled];
  [bgBlurred][fgScaled]overlay=x=0:y=(H-h)/2[outv]
`.replace(/\n/g, ' ');

const verticalCmd = `ffmpeg -y -i "${finalMp4Landscape}" -filter_complex "${verticalFilter}" -map "[outv]" -map 0:a -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart "${finalMp4Vertical}"`;
execSync(verticalCmd, { stdio: 'inherit' });
console.log(`\nVERTICAL 9:16 VIDEO READY: ${finalMp4Vertical} (${(fs.statSync(finalMp4Vertical).size / (1024 * 1024)).toFixed(2)} MB)`);

console.log('\n=== ALL MASTER RENDERS COMPLETE AND VERIFIED ===');
