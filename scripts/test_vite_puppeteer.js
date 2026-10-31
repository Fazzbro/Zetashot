import { preview } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting vite preview on port 4173...');
  const server = await preview({ preview: { port: 4173 } });
  console.log('Vite preview running!');

  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const outDir = path.resolve('recordings');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shotPath = path.join(outDir, 'zetashot_live_app.png');
  await page.screenshot({ path: shotPath });
  console.log('Screenshot saved to:', shotPath, 'Size:', fs.statSync(shotPath).size);

  await browser.close();
  server.httpServer.close();
}

main().catch(console.error);
