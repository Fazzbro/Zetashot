import { preview } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function main() {
  const assetsDir = path.resolve('public_assets_capture');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('Starting preview server...');
  const server = await preview({ preview: { port: 4176 } });

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4176', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2500));

  // 1. Disable guide for pristine clean studio interface
  console.log('1. Disabling beginner guide for clean capture...');
  await page.evaluate(() => {
    const guideBtn = document.querySelector('.guide-disable-quick-btn');
    if (guideBtn) guideBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: path.join(assetsDir, '01_clean_hero_studio.png') });
  console.log('Saved 01_clean_hero_studio.png');

  // 2. Open Backdrop Selector Popover
  console.log('2. Opening backdrop selector...');
  await page.evaluate(() => {
    const bgBtn = document.querySelector('button[aria-label="Backdrop selector"]');
    if (bgBtn) bgBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(assetsDir, '02_backdrop_popover.png') });

  // 3. Switch to Preset Backgrounds: Halftone Clouds, Sunflower Meadow, Purple Wave, Green Hills
  const bgPresets = ['clouds', 'sunflowers', 'purple-wave', 'hills'];
  for (const preset of bgPresets) {
    console.log(`Setting background preset: ${preset}...`);
    await page.evaluate((id) => {
      // Find preset image thumb or click
      const imgs = Array.from(document.querySelectorAll('.preset-image-btn, .background-selector-pill img, [title*="Clouds"], [title*="Sunflower"], [title*="Purple"], [title*="Hills"], .bg-preset-thumb'));
      const target = imgs.find(el => (el.src && el.src.includes(id)) || (el.title && el.title.toLowerCase().includes(id)) || (el.getAttribute('data-id') === id));
      if (target) {
        target.click();
      } else {
        // Fallback: look for all clickable elements inside background popover
        const popover = document.querySelector('.background-selector-pill, .control-popover-panel');
        if (popover) {
          const btn = popover.querySelector(`[data-id="${id}"]`) || Array.from(popover.querySelectorAll('button, div')).find(el => el.textContent?.toLowerCase().includes(id.replace('-', ' ')));
          if (btn) btn.click();
        }
      }
    }, preset);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(assetsDir, `03_bg_${preset}.png`) });
  }

  // 4. Test 3D Orbit & Tilt
  console.log('4. Applying 3D Camera Angles via Orbit Drag...');
  await page.evaluate(() => {
    // Switch to ORBIT mode
    const orbitBtn = document.querySelectorAll('.drag-tool-toggle button')[1];
    if (orbitBtn) orbitBtn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // Perform smooth drag on canvas stage to rotate
  const stage = await page.$('.capture-stage, .stage-wrap');
  if (stage) {
    const box = await stage.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 180, centerY - 120, { steps: 20 });
      await page.mouse.up();
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(assetsDir, '04_camera_3d_tilted.png') });
  console.log('Saved 04_camera_3d_tilted.png');

  // 5. Test Operator / Compose Mode
  console.log('5. Clicking Operator / Compose button...');
  await page.evaluate(() => {
    const opBtn = document.querySelector('.top-operator-pill-btn');
    if (opBtn) opBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(assetsDir, '05_compose_island_open.png') });
  console.log('Saved 05_compose_island_open.png');

  // Click Compose primary action button
  await page.evaluate(() => {
    const composeBtn = document.querySelector('.compose-primary-action-btn');
    if (composeBtn) composeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(assetsDir, '06_compose_keyframes_generated.png') });
  console.log('Saved 06_compose_keyframes_generated.png');

  // 6. Test Preview animation
  console.log('6. Triggering PREVIEW playback...');
  await page.evaluate(() => {
    const playBtn = document.querySelector('.pill-preview-button, [aria-label="Play Preview"], .timeline-play-btn');
    if (playBtn) playBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(assetsDir, '07_live_preview_scrubbing.png') });
  console.log('Saved 07_live_preview_scrubbing.png');

  // 7. Inspect Export dialog / options
  console.log('7. Capturing Export UI state...');
  await page.evaluate(() => {
    const exportBtn = document.querySelector('.top-upgrade-btn, [data-guide="export-button"]');
    if (exportBtn) {
      exportBtn.scrollIntoView();
    }
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(assetsDir, '08_export_ready.png') });
  console.log('Saved 08_export_ready.png');

  await browser.close();
  server.httpServer.close();
  console.log('All live captures finished!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
