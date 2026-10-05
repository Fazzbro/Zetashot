import { preview } from 'vite';
import puppeteer from 'puppeteer';

async function testMobile() {
  const server = await preview({ preview: { port: 4175 } });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  const devices = [
    { name: 'android_360', width: 360, height: 800 },
    { name: 'iphone_390', width: 390, height: 844 },
    { name: 'android_412', width: 412, height: 915 },
  ];

  for (const dev of devices) {
    const page = await browser.newPage();
    await page.setViewport({ width: dev.width, height: dev.height, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:4175', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    const info = await page.evaluate(() => {
      const stage = document.querySelector('.capture-stage');
      const stageWrap = document.querySelector('.stage-wrap');
      const frameAnchor = document.querySelector('.frame-anchor');
      const frameScene = document.querySelector('.frame-scene');
      const bottomSlot = document.querySelector('.bottom-studio-controls-slot');
      const timeline = document.querySelector('.ui-camera-timeline-tray, [data-guide="video-timeline"]');

      const getR = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          height: Math.round(r.height),
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
          opacity: window.getComputedStyle(el).opacity,
        };
      };

      return {
        stageWrap: getR(stageWrap),
        stage: getR(stage),
        frameAnchor: getR(frameAnchor),
        frameScene: getR(frameScene),
        bottomSlot: getR(bottomSlot),
        timeline: getR(timeline),
      };
    });

    console.log(`\n--- ${dev.name} (${dev.width}x${dev.height}) ---`);
    console.log(JSON.stringify(info, null, 2));

    await page.screenshot({ path: `C:/Users/NEW/.gemini/antigravity/brain/09fa3cb6-fd05-49a2-a93d-5bc3a51867ae/${dev.name}_detail.png` });
    await page.close();
  }

  await browser.close();
  server.httpServer.close();
}
testMobile().catch(console.error);
