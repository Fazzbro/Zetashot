import puppeteer from 'puppeteer';

async function benchmark() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setContent(`
    <canvas id="c" width="1920" height="1080" style="background:#111;"></canvas>
    <script>
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');
      window.render = (i) => {
        ctx.fillStyle = '#0a0d18';
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 64px sans-serif';
        ctx.fillText('Frame ' + i, 200, 300);
      };
    </script>
  `);

  console.time('10 frames via screenshot');
  for (let i = 0; i < 10; i++) {
    await page.evaluate((idx) => window.render(idx), i);
    await page.screenshot({ type: 'jpeg', quality: 90 });
  }
  console.timeEnd('10 frames via screenshot');

  await browser.close();
}

benchmark().catch(console.error);
