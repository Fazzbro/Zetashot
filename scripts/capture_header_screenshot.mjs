import { preview } from 'vite';
import puppeteer from 'puppeteer';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  const server = await preview({ preview: { port: 4192 } });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:4192', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const topBar = await page.$('.studio-top-bar');
  if (topBar) {
    await topBar.screenshot({ path: 'scripts/desktop_topbar_new.png' });
    console.log('Saved desktop topbar screenshot to scripts/desktop_topbar_new.png');
  }

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:4192', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  const mobileTopBar = await page.$('.studio-top-bar');
  if (mobileTopBar) {
    await mobileTopBar.screenshot({ path: 'scripts/mobile_topbar_new.png' });
    console.log('Saved mobile topbar screenshot to scripts/mobile_topbar_new.png');
  }

  // Open mobile drawer and take a screenshot
  await page.click('.mobile-menu-toggle-btn');
  await new Promise((r) => setTimeout(r, 500));
  const drawer = await page.$('.mobile-menu-drawer');
  if (drawer) {
    await drawer.screenshot({ path: 'scripts/mobile_drawer_new.png' });
    console.log('Saved mobile drawer screenshot to scripts/mobile_drawer_new.png');
  }

  await browser.close();
  await server.close();
}

capture().catch(console.error);
