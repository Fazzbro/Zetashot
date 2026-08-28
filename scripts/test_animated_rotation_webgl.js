import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function main() {
  const downloadDir = path.resolve('d:/mockup/downloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  // Clear existing files in downloads
  fs.readdirSync(downloadDir).forEach((f) => {
    try {
      fs.unlinkSync(path.join(downloadDir, f));
    } catch {}
  });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.join(os.tmpdir(), 'mockup_chrome_rotation_' + Date.now());

  console.log('Spawning Chrome for animated rotation test...');
  const chromeProcess = spawn(
    chromePath,
    [
      '--remote-debugging-port=9225',
      `--user-data-dir=${profileDir}`,
      '--headless=new',
      '--disable-gpu-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--no-first-run',
      '--no-default-browser-check',
      '--autoplay-policy=no-user-gesture-required',
      'http://localhost:5173/',
    ],
    { stdio: 'pipe' }
  );

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:9225/json/list');
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.url.includes('5173'));
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('Could not connect to Chrome on port 9225');
    chromeProcess.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' '));
    }
  };

  await new Promise((res) => (ws.onopen = res));
  console.log('CDP Connected!');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  await new Promise((r) => setTimeout(r, 2000));

  // 1. Click Compose button to apply 3D rotation trajectory
  console.log('Clicking Compose button to setup animated camera angle...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.compose-pill-btn')?.click()`,
  });
  await new Promise((r) => setTimeout(r, 600));

  // 2. Upload test.mp4
  console.log('Uploading test.mp4...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.top-left-toolbar button')?.click()`,
  });
  await new Promise((r) => setTimeout(r, 600));

  const testMp4Path = path.resolve('d:/mockup/test.mp4');
  const base64Data = fs.readFileSync(testMp4Path).toString('base64');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const base64 = "${base64Data}";
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      const blob = new Blob([array], { type: 'video/mp4' });
      const file = new File([blob], 'test.mp4', { type: 'video/mp4' });

      let input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }
      return { success: false };
    })()`,
  });

  await new Promise((r) => setTimeout(r, 3000));

  // 3. Export MP4
  console.log('Exporting animated 3D MP4...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.timeline-export-btn')?.click()`,
  });

  let exportedMp4 = null;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const files = fs.readdirSync(downloadDir);
    const mp4 = files.find((f) => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
    if (mp4) {
      exportedMp4 = path.join(downloadDir, mp4);
      console.log(`Exported animated MP4 completed in ${i + 1}s:`, exportedMp4);
      break;
    }
  }

  ws.close();
  chromeProcess.kill();

  if (!exportedMp4) {
    console.error('Failed to export animated MP4');
    process.exit(1);
  }

  console.log('All tests passed!');
}

main().catch(console.error);
