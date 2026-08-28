import fs from 'fs';
import path from 'path';

async function main() {
  const downloadDir = path.resolve('d:/mockup/downloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  // Clear existing downloads
  fs.readdirSync(downloadDir).forEach((f) => fs.unlinkSync(path.join(downloadDir, f)));

  // Get active targets from Chrome CDP
  const listRes = await fetch('http://localhost:9222/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('5173'));

  if (!pageTarget) {
    console.error('Target page on 5173 not found:', targets);
    process.exit(1);
  }

  console.log('Connecting to Chrome page:', pageTarget.title, pageTarget.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

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
    }
  };

  await new Promise((res) => (ws.onopen = res));
  console.log('Connected to CDP!');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  // Reload page
  await send('Page.reload');
  await new Promise((r) => setTimeout(r, 2000));

  // Click Compose button (.compose-pill-btn) to create camera choreographed motion (rotation)
  console.log('Clicking Compose button (.compose-pill-btn)...');
  const composeClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const composeBtn = document.querySelector('.compose-pill-btn');
      if (composeBtn) {
        composeBtn.click();
        return { clicked: true, text: composeBtn.textContent };
      }
      return { clicked: false, error: 'No .compose-pill-btn' };
    })()`,
    returnByValue: true,
  });
  console.log('Compose button result:', composeClick.result.value);

  await new Promise((r) => setTimeout(r, 800));

  // Upload test.mp4
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
        return { uploaded: true };
      }
      return { uploaded: false };
    })()`,
    returnByValue: true,
  });

  await new Promise((r) => setTimeout(r, 3000));

  // Inspect clips state in app
  const clipsStatus = await send('Runtime.evaluate', {
    expression: `(() => {
      const seq = document.querySelector('.sequence-capsule-container');
      const clips = Array.from(document.querySelectorAll('.clip-block')).map(c => ({
        text: c.textContent,
        classes: c.className
      }));
      return {
        seqClass: seq ? seq.className : '',
        clips
      };
    })()`,
    returnByValue: true,
  });
  console.log('Clips status after Compose and Upload:', clipsStatus.result.value);

  // Trigger export
  console.log('Triggering export with 3D rotation motion...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.timeline-export-btn')?.click()`,
  });

  // Poll for completion
  let exportedFile = null;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const files = fs.readdirSync(downloadDir).filter((f) => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
    if (files.length > 0) {
      exportedFile = path.join(downloadDir, files[0]);
      console.log('Exported file found:', exportedFile);
      break;
    }
  }

  ws.close();
}

main().catch(console.error);
