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
  const profileDir = path.join(os.tmpdir(), 'mockup_chrome_runner_' + Date.now());

  console.log('Spawning Chrome instance with profile in:', profileDir);
  const chromeProcess = spawn(
    chromePath,
    [
      '--remote-debugging-port=9224',
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

  // Wait for CDP port to open
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:9224/json/list');
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.url.includes('5173'));
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        console.log('Found page target:', page.title, wsUrl);
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('Could not connect to Chrome on port 9224');
    chromeProcess.kill();
    process.exit(1);
  }

  console.log('Connecting to WebSocket CDP:', wsUrl);
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
  console.log('CDP Connected!');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  // Wait 2s for page to mount and load
  await new Promise((r) => setTimeout(r, 2000));

  // Check initial timeline capsule state (should be is-yellow)
  const initialCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const seq = document.querySelector('.sequence-capsule-container');
      return {
        hasSeq: !!seq,
        isYellow: seq ? seq.classList.contains('is-yellow') : false,
        className: seq ? seq.className : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('Initial timeline check:', initialCheck.result.value);

  // Open Media Library Modal
  console.log('Opening Media Library modal...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.top-left-toolbar button')?.click()`,
  });
  await new Promise((r) => setTimeout(r, 800));

  // Upload test.mp4
  const testMp4Path = path.resolve('d:/mockup/test.mp4');
  const base64Data = fs.readFileSync(testMp4Path).toString('base64');
  console.log(`Uploading test.mp4 (${base64Data.length} chars base64)...`);

  const uploadResult = await send('Runtime.evaluate', {
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
      return { success: false, error: 'No file input' };
    })()`,
    returnByValue: true,
  });
  console.log('Upload result:', uploadResult.result.value);

  // Wait 4s for video metadata & player setup
  await new Promise((r) => setTimeout(r, 4000));

  // Verify timeline capsule state is yellow
  const timelineCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const seq = document.querySelector('.sequence-capsule-container');
      const video = document.getElementById('mockup-video-player');
      return {
        hasVideo: !!video,
        videoDuration: video ? video.duration : null,
        isYellow: seq ? seq.classList.contains('is-yellow') : false,
        className: seq ? seq.className : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('Post-upload Timeline Check (is yellow):', timelineCheck.result.value);

  // Take screenshot of uploaded stage
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:/mockup/test_uploaded_stage.png', Buffer.from(snap1.data, 'base64'));
  console.log('Saved screenshot to test_uploaded_stage.png');

  // Trigger export
  console.log('Triggering MP4 export...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.timeline-export-btn') || document.querySelector('.top-upgrade-btn');
      btn?.click();
    })()`,
  });

  // Poll for downloaded MP4 file
  let downloadedMp4 = null;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const files = fs.readdirSync(downloadDir);
    const mp4 = files.find((f) => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
    const webm = files.find((f) => f.endsWith('.webm') && !f.endsWith('.crdownload'));

    if (mp4) {
      downloadedMp4 = path.join(downloadDir, mp4);
      console.log(`[Export complete in ${i + 1}s] Found MP4 file:`, downloadedMp4);
      break;
    } else if (webm) {
      console.warn(`Found WebM file instead of MP4:`, webm);
    }
  }

  ws.close();
  chromeProcess.kill();

  if (downloadedMp4) {
    const stats = fs.statSync(downloadedMp4);
    console.log(`\n========================================`);
    console.log(`EXPORT SUCCESSFUL!`);
    console.log(`File: ${downloadedMp4}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
    console.log(`========================================\n`);
  } else {
    console.error('EXPORT FAILED: No MP4 file was downloaded within timeout.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
