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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', msg.params.type, msg.params.args.map((a) => a.value || a.description).join(' '));
    }
  };

  await new Promise((res) => (ws.onopen = res));
  console.log('Connected to CDP!');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  // Set download behavior
  await send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  // Reload page to get clean fresh state
  await send('Page.reload');
  await new Promise((r) => setTimeout(r, 2000));

  // Check initial timeline state
  const checkInitial = await send('Runtime.evaluate', {
    expression: `(() => {
      const seq = document.querySelector('.sequence-capsule-container');
      return {
        hasSeq: !!seq,
        isYellow: seq ? seq.classList.contains('is-yellow') : false,
        isBlue: seq ? seq.classList.contains('is-blue') : false,
        className: seq ? seq.className : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('Initial timeline sequence capsule check:', checkInitial.result.value);

  // Click 'Add media' button to open MediaLibraryModal
  console.log('Opening media modal...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.top-left-toolbar button')?.click()`,
  });

  await new Promise((r) => setTimeout(r, 600));

  // Read test.mp4 and upload to the input
  const testMp4Path = path.resolve('d:/mockup/test.mp4');
  const base64Data = fs.readFileSync(testMp4Path).toString('base64');
  console.log(`Read test.mp4 (${base64Data.length} chars base64)`);

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
        return { success: true, method: 'input attached' };
      }
      return { success: false, error: 'No file input found after modal open' };
    })()`,
    returnByValue: true,
  });
  console.log('Upload evaluate result:', uploadResult.result.value);

  // Wait 4 seconds for video element to load and metadata to process
  console.log('Waiting for video element and metadata to load...');
  await new Promise((r) => setTimeout(r, 4000));

  // Take screenshot of uploaded state
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:/mockup/test_uploaded_stage.png', Buffer.from(snap1.data, 'base64'));
  console.log('Saved screenshot: d:/mockup/test_uploaded_stage.png');

  // Verify video element and timeline duration
  const mediaStatus = await send('Runtime.evaluate', {
    expression: `(() => {
      const video = document.getElementById('mockup-video-player');
      const seq = document.querySelector('.sequence-capsule-container');
      const durationDisplay = document.querySelector('.timeline-time-display');
      return {
        hasVideo: !!video,
        videoSrc: video ? video.src.substring(0, 40) + '...' : '',
        videoDuration: video ? video.duration : null,
        videoWidth: video ? video.videoWidth : null,
        videoHeight: video ? video.videoHeight : null,
        isYellow: seq ? seq.classList.contains('is-yellow') : false,
        durationText: durationDisplay ? durationDisplay.textContent : '',
      };
    })()`,
    returnByValue: true,
  });
  console.log('Media and Timeline status:', mediaStatus.result.value);

  // Trigger export
  console.log('Triggering video export...');
  const exportClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.timeline-export-btn') || document.querySelector('.top-upgrade-btn');
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.textContent };
      }
      return { clicked: false };
    })()`,
    returnByValue: true,
  });
  console.log('Export click result:', exportClick.result.value);

  // Poll for export progress and download completion
  let exportedFile = null;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.timeline-export-btn');
        return {
          btnText: btn ? btn.textContent : '',
          disabled: btn ? btn.disabled : false,
        };
      })()`,
      returnByValue: true,
    });
    console.log(`[Export Progress ${i + 1}s]`, status.result.value);

    // Check downloads directory for new mp4
    const files = fs.readdirSync(downloadDir).filter((f) => f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.crdownload'));
    const completed = files.find((f) => (f.endsWith('.mp4') || f.endsWith('.webm')) && !f.endsWith('.crdownload'));
    if (completed) {
      exportedFile = path.join(downloadDir, completed);
      console.log('Found completed export file:', exportedFile);
      break;
    }
  }

  if (exportedFile) {
    console.log('SUCCESS: Export completed:', exportedFile);
  } else {
    console.warn('Export did not complete in 45s.');
  }

  ws.close();
}

main().catch(console.error);
