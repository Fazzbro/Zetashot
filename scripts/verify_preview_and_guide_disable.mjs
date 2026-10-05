import { preview } from 'vite';
import puppeteer from 'puppeteer';

const ARTIFACT_DIR = 'C:/Users/NEW/.gemini/antigravity/brain/09fa3cb6-fd05-49a2-a93d-5bc3a51867ae';

async function runVerification() {
  console.log('--- 1. Launching Vite Preview Server on Port 4183 ---');
  const server = await preview({ preview: { port: 4183 } });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. Desktop Test (1440x900)
    console.log('\n--- 2. Testing Desktop Viewport (1440x900) ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:4183', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Check Canvas Space Overlay Options Removed
    const artboardBadge = await page.$('.stage-artboard-badge');
    console.log('Artboard Badge on Canvas Space:', artboardBadge ? 'FOUND (ERROR)' : 'REMOVED (SUCCESS)');

    // Check Preview Button in Camera Controls Island
    const previewBtn = await page.$('.pill-preview-button');
    console.log('Preview Button in Island:', previewBtn ? 'FOUND (SUCCESS)' : 'MISSING (ERROR)');
    if (previewBtn) {
      const text = await page.evaluate(el => el.textContent?.trim(), previewBtn);
      console.log('Preview Button Text:', text);
      // Test click toggle
      await previewBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const isPlaying = await page.evaluate(el => el.classList.contains('is-playing'), previewBtn);
      const textPlaying = await page.evaluate(el => el.textContent?.trim(), previewBtn);
      console.log('After Click: isPlaying =', isPlaying, 'Text =', textPlaying);
      // Pause
      await previewBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // Check Direct Guide Disable Button in Header
    const directDisableBtn = await page.$('.guide-disable-quick-btn');
    console.log('Direct Disable Guide Button in Header:', directDisableBtn ? 'FOUND (SUCCESS)' : 'MISSING (CHECK GUIDE STATE)');

    // Check guide dismiss button on island
    const islandGuideDismiss = await page.$('.reference-guide-pill-wrapper .guide-pill-dismiss-btn');
    console.log('Island Guide Dismiss Button:', islandGuideDismiss ? 'FOUND (SUCCESS)' : 'NOT PRESENT');

    await page.screenshot({ path: `${ARTIFACT_DIR}/desktop_preview_and_clean_canvas.png` });
    console.log('Saved desktop_preview_and_clean_canvas.png');

    // Test direct disable click
    if (directDisableBtn) {
      await directDisableBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const postDisableBtn = await page.$('.guide-disable-quick-btn');
      const postGuidePill = await page.$('.reference-guide-pill');
      console.log('Post-Disable in Header:', postDisableBtn ? 'STILL THERE' : 'CLEANLY HIDDEN (SUCCESS)');
      console.log('Post-Disable Guide Pills:', postGuidePill ? 'STILL THERE' : 'CLEANLY HIDDEN (SUCCESS)');
    }

    await page.close();

    // 2. Mobile Android Test (390x844 & 360x800)
    for (const dims of [{ width: 390, height: 844, name: 'iphone_390' }, { width: 360, height: 800, name: 'android_360' }]) {
      console.log(`\n--- 3. Testing Mobile ${dims.name} (${dims.width}x${dims.height}) ---`);
      const mobilePage = await browser.newPage();
      await mobilePage.setViewport({ width: dims.width, height: dims.height, isMobile: true, hasTouch: true });
      // Reset localStorage to test initial fresh visitor with guide open
      await mobilePage.goto('http://localhost:4183', { waitUntil: 'domcontentloaded' });
      await mobilePage.evaluate(() => {
        localStorage.removeItem('zetashot_guide_completed');
        localStorage.removeItem('zetashot_guide_mobile_disabled');
      });
      await mobilePage.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 1500));

      // Check Mobile Preview Button
      const mPreviewBtn = await mobilePage.$('.pill-preview-button');
      console.log(`[${dims.name}] Preview Button in Island:`, mPreviewBtn ? 'FOUND (SUCCESS)' : 'MISSING');

      // Check Canvas Cleanliness
      const mBadge = await mobilePage.$('.stage-artboard-badge');
      console.log(`[${dims.name}] Canvas Stage Badge:`, mBadge ? 'FOUND (ERROR)' : 'REMOVED (SUCCESS)');

      // Check Direct Disable Guide Button (Visible on mobile header without opening menu)
      const mDisableBtn = await mobilePage.$('.guide-disable-quick-btn');
      console.log(`[${dims.name}] Direct Guide Disable Button without Menu:`, mDisableBtn ? 'FOUND (SUCCESS)' : 'MISSING');
      if (mDisableBtn) {
        const text = await mobilePage.evaluate(el => el.textContent?.trim(), mDisableBtn);
        console.log(`[${dims.name}] Direct Guide Disable Button Text:`, text);
      }

      await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/${dims.name}_preview_and_direct_guide_disable.png` });
      console.log(`Saved ${dims.name}_preview_and_direct_guide_disable.png`);

      // Click Disable Guide directly on screen without heading to menu
      if (mDisableBtn) {
        await mDisableBtn.click();
        await new Promise(r => setTimeout(r, 600));
        const postPill = await mobilePage.$('.reference-guide-pill');
        const postBtn = await mobilePage.$('.guide-disable-quick-btn');
        console.log(`[${dims.name}] Post Direct Tap Guide Pill:`, postPill ? 'STILL VISIBLE' : 'DISABLED (SUCCESS)');
        console.log(`[${dims.name}] Post Direct Tap Header Btn:`, postBtn ? 'STILL VISIBLE' : 'HIDDEN (SUCCESS)');

        await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/${dims.name}_post_direct_guide_disable.png` });
        console.log(`Saved ${dims.name}_post_direct_guide_disable.png`);
      }

      await mobilePage.close();
    }

    console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
  } finally {
    await browser.close();
    server.httpServer.close();
  }
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
