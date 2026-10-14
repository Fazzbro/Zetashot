import { preview } from 'vite';
import puppeteer from 'puppeteer';

async function runVerification() {
  console.log('[E2E] Starting Vite preview server...');
  const server = await preview({ preview: { port: 4188 } });
  console.log('[E2E] Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:4188', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('[E2E] Page loaded. Checking top-left toolbar...');

  // 1. Verify split dropdown button exists
  const hasSplitBtn = await page.evaluate(() => {
    const group = document.querySelector('.add-media-button-group');
    const primary = document.querySelector('.add-media-primary-btn');
    const trigger = document.querySelector('.add-media-dropdown-trigger');
    return {
      groupExists: !!group,
      primaryText: primary?.textContent?.trim() || '',
      triggerExists: !!trigger,
    };
  });
  console.log('[E2E] Split button state:', JSON.stringify(hasSplitBtn));
  if (!hasSplitBtn.groupExists || !hasSplitBtn.triggerExists) {
    throw new Error('Split Add media button group or trigger missing!');
  }

  // 2. Click dropdown trigger
  console.log('[E2E] Clicking dropdown trigger...');
  await page.click('.add-media-dropdown-trigger');
  await new Promise((r) => setTimeout(r, 300));

  // 3. Inspect dropdown menu items
  const menuInfo = await page.evaluate(() => {
    const menu = document.querySelector('.add-media-dropdown-menu');
    if (!menu) return null;
    const items = Array.from(menu.querySelectorAll('.add-media-dropdown-item')).map((el) => {
      const title = el.querySelector('.dropdown-item-title')?.textContent?.trim() || '';
      const desc = el.querySelector('.dropdown-item-desc')?.textContent?.trim() || '';
      return { title, desc };
    });
    return { visible: true, count: items.length, items };
  });
  console.log('[E2E] Dropdown menu items:', JSON.stringify(menuInfo, null, 2));

  if (!menuInfo || menuInfo.items.length < 2) {
    throw new Error('Dropdown menu not rendered or missing items!');
  }

  const hasSoloOption = menuInfo.items.some((it) => it.title.includes('Blank Canvas (Solo)'));
  const hasClipOption = menuInfo.items.some((it) => it.title.includes('+ Add Blank Canvas Clip'));
  console.log(`[E2E] Has Solo option: ${hasSoloOption}, Has Add Clip option: ${hasClipOption}`);
  if (!hasSoloOption || !hasClipOption) {
    throw new Error('Blank canvas options not found in dropdown menu!');
  }

  // 4. Click "Blank Canvas (Solo)"
  console.log('[E2E] Clicking "Blank Canvas (Solo)"...');
  await page.evaluate(() => {
    const soloBtn = Array.from(document.querySelectorAll('.add-media-dropdown-item')).find(el =>
      el.textContent && el.textContent.includes('Blank Canvas (Solo)')
    );
    if (soloBtn) (soloBtn).click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // 5. Verify stage displays Blank Canvas and timeline has exactly 1 blank clip
  const soloState = await page.evaluate(() => {
    const blankStage = document.querySelector('#mockup-blank-canvas');
    const cards = Array.from(document.querySelectorAll('.multiclip-card'));
    const cardNames = cards.map(c => c.querySelector('.multiclip-card-name')?.textContent?.trim() || '');
    return {
      blankCanvasRendered: !!blankStage,
      clipCount: cards.length,
      cardNames,
    };
  });
  console.log('[E2E] State after Blank Canvas (Solo):', JSON.stringify(soloState, null, 2));

  if (!soloState.blankCanvasRendered) {
    throw new Error('Mockup blank canvas surface was not rendered on stage!');
  }
  if (soloState.clipCount !== 1) {
    throw new Error(`Expected exactly 1 solo clip in timeline, but found ${soloState.clipCount}`);
  }
  if (!soloState.cardNames[0].includes('CANVAS') && !soloState.cardNames[0].includes('Blank Canvas')) {
    throw new Error(`Expected solo clip to be Blank Canvas, got: ${soloState.cardNames[0]}`);
  }

  // 6. Test appending a second blank canvas clip
  console.log('[E2E] Clicking dropdown trigger to add a second clip...');
  await page.click('.add-media-dropdown-trigger');
  await new Promise((r) => setTimeout(r, 300));

  await page.evaluate(() => {
    const addClipBtn = Array.from(document.querySelectorAll('.add-media-dropdown-item')).find(el =>
      el.textContent && el.textContent.includes('+ Add Blank Canvas Clip')
    );
    if (addClipBtn) (addClipBtn).click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const multiState = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.multiclip-card'));
    const cardNames = cards.map(c => c.querySelector('.multiclip-card-name')?.textContent?.trim() || '');
    return {
      clipCount: cards.length,
      cardNames,
    };
  });
  console.log('[E2E] State after "+ Add Blank Canvas Clip":', JSON.stringify(multiState, null, 2));

  if (multiState.clipCount !== 2) {
    throw new Error(`Expected 2 clips in timeline after append, found ${multiState.clipCount}`);
  }

  // 7. Test MediaLibraryModal
  console.log('[E2E] Opening Media Library Modal...');
  await page.click('.add-media-primary-btn');
  await new Promise((r) => setTimeout(r, 600));

  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('.source-library-modal');
    const blankCard = document.querySelector('.is-blank-canvas-card');
    const soloBtn = blankCard?.querySelector('.source-library-card-solo-btn');
    const addBtn = blankCard?.querySelector('.source-library-card-add-btn');
    const pills = Array.from(document.querySelectorAll('.source-library-mode-pill')).map(p => p.textContent?.trim());
    return {
      modalOpen: !!modal,
      blankCardExists: !!blankCard,
      soloBtnExists: !!soloBtn,
      addBtnExists: !!addBtn,
      pills,
    };
  });
  console.log('[E2E] Media Library Modal state:', JSON.stringify(modalInfo, null, 2));

  if (!modalInfo.blankCardExists || !modalInfo.soloBtnExists) {
    throw new Error('Blank Canvas card or Solo button missing in Media Library modal!');
  }

  // Take screenshot for documentation
  await page.screenshot({ path: 'scripts/blank_canvas_verification.png' });
  console.log('[E2E] Screenshot saved to scripts/blank_canvas_verification.png');

  console.log('[E2E] All Blank Canvas end-to-end verifications passed successfully!');
  await browser.close();
  await server.close();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('[E2E] Verification failed:', err);
  process.exit(1);
});
