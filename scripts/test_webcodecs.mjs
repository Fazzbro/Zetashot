import puppeteer from 'puppeteer';

async function testWebCodecs() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();
  const support = await page.evaluate(() => {
    return {
      hasVideoEncoder: typeof VideoEncoder !== 'undefined',
      hasVideoFrame: typeof VideoFrame !== 'undefined',
    };
  });
  console.log('WebCodecs support in Puppeteer:', support);
  await browser.close();
}

testWebCodecs().catch(console.error);
