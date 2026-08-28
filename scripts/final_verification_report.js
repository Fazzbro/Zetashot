import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function verifyAll() {
  const artifactDir = 'C:/Users/NEW/.gemini/antigravity-ide/brain/cfe2b6c9-db18-4cf4-b6d8-5c3823b75660';
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
  const profileDir = path.join(os.tmpdir(), 'mockup_chrome_verify_' + Date.now());

  console.log('Spawning Chrome for final verification...');
  const chromeProcess = spawn(
    chromePath,
    [
      '--remote-debugging-port=9226',
      `--user-data-dir=${profileDir}`,
      '--headless=new',
      '--window-size=1920,1080',
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
      const res = await fetch('http://localhost:9226/json/list');
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.url.includes('5173'));
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('Could not connect to Chrome on port 9226');
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
      console.log('[Browser Console]', msg.params.type, msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' '));
    }
  };

  await new Promise((res) => (ws.onopen = res));
  console.log('Connected to CDP');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  await new Promise((r) => setTimeout(r, 2500));

  // 1. Capture initial page
  const snapInit = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'verify_1_initial.png'), Buffer.from(snapInit.data, 'base64'));

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

  // Wait for video to load and metadata to populate
  await new Promise((r) => setTimeout(r, 3500));

  // 3. Capture post-upload page (verify yellow timeline block)
  const timelineEvaluation = await send('Runtime.evaluate', {
    expression: `(() => {
      const seq = document.querySelector('.sequence-capsule-container');
      const isYellow = seq ? seq.classList.contains('is-yellow') : false;
      const bg = seq ? window.getComputedStyle(seq).backgroundColor : null;
      return {
        className: seq ? seq.className : '',
        isYellow,
        backgroundColor: bg,
        innerText: seq ? seq.innerText : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('Timeline Evaluation:', timelineEvaluation.result.value);

  const snapYellowTimeline = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'verify_2_yellow_timeline.png'), Buffer.from(snapYellowTimeline.data, 'base64'));

  // 4. Trigger MP4 export
  console.log('Clicking Export MP4 button...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.timeline-export-btn')?.click()`,
  });

  // 5. Wait for download
  let exportedMp4 = null;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const files = fs.readdirSync(downloadDir);
    const mp4 = files.find((f) => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
    if (mp4) {
      exportedMp4 = path.join(downloadDir, mp4);
      console.log(`Export complete: ${exportedMp4}`);
      break;
    }
  }

  ws.close();
  chromeProcess.kill();

  if (!exportedMp4) {
    console.error('Export failed: No MP4 found');
    process.exit(1);
  }

  console.log('Verification completed successfully!');
}

verifyAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
