import puppeteer from 'puppeteer';

async function testDeterministicMediaRecorder() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const result = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(0); // 0 fps means manual frames via track.requestFrame()
    const track = stream.getVideoTracks()[0];

    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 16000000,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const startPromise = new Promise((res) => {
      recorder.onstart = res;
    });

    recorder.start();
    await startPromise;

    const t0 = performance.now();
    const NUM_FRAMES = 120; // 2 seconds of 60fps

    for (let i = 0; i < NUM_FRAMES; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#101426' : '#202848';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText(`Frame ${i}`, 400, 540);

      if (track.requestFrame) {
        track.requestFrame();
      }
      // tiny yield
      await new Promise((r) => setTimeout(r, 4));
    }

    const stopPromise = new Promise((res) => {
      recorder.onstop = res;
    });
    recorder.stop();
    await stopPromise;

    const blob = new Blob(chunks, { type: 'video/webm' });
    const elapsed = performance.now() - t0;
    return {
      size: blob.size,
      elapsedMs: elapsed,
      fps: (NUM_FRAMES / (elapsed / 1000)).toFixed(1),
    };
  });

  console.log('Deterministic MediaRecorder test result:', result);
  await browser.close();
}

testDeterministicMediaRecorder().catch(console.error);
