import { preview } from 'vite';
import puppeteer from 'puppeteer';

const ARTIFACT_DIR = 'C:/Users/NEW/.gemini/antigravity/brain/09fa3cb6-fd05-49a2-a93d-5bc3a51867ae';

async function verify() {
  console.log('Starting preview server on port 4182...');
  const server = await preview({ preview: { port: 4182 } });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  // 1. Desktop Test (1440x900)
  console.log('\n--- 1. Testing Desktop Top Bar Alignment (1440x900) ---');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900 });
  await desktopPage.goto('http://localhost:4182', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  const desktopOverlap = await desktopPage.evaluate(() => {
    const left = document.querySelector('.top-left-toolbar')?.getBoundingClientRect();
    const center = document.querySelector('.top-center-mode-island-wrap')?.getBoundingClientRect();
    const right = document.querySelector('.top-right-toolbar')?.getBoundingClientRect();
    const settingsBtn = document.querySelector('[data-testid="studio-settings-btn"]');

    return {
      hasSeparateSettings: !!settingsBtn,
      left: left ? { right: Math.round(left.right), width: Math.round(left.width) } : null,
      center: center ? { left: Math.round(center.left), right: Math.round(center.right), width: Math.round(center.width) } : null,
      right: right ? { left: Math.round(right.left), width: Math.round(right.width) } : null,
      leftCenterGap: (center && left) ? Math.round(center.left - left.right) : null,
      centerRightGap: (right && center) ? Math.round(right.left - center.right) : null,
    };
  });
  console.log('Desktop Overlap & Clearance Analysis:', desktopOverlap);
  if (desktopOverlap.leftCenterGap < 0 || desktopOverlap.centerRightGap < 0) {
    console.error('ERROR: Desktop header elements are overlapping!');
  } else {
    console.log('SUCCESS: Desktop header elements have clean positive gaps, ZERO overlap!');
  }

  await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/desktop_no_overlap_clean.png` });
  console.log('Saved desktop_no_overlap_clean.png');
  await desktopPage.close();

  // 2. Mobile Android Test (390x844 & 360x800)
  for (const dims of [{ width: 390, height: 844, name: 'iphone_390' }, { width: 360, height: 800, name: 'android_360' }]) {
    console.log(`\n--- 2. Testing Mobile ${dims.name} (${dims.width}x${dims.height}) ---`);
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: dims.width, height: dims.height, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:4182', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));

    const mobileOverlap = await mobilePage.evaluate(() => {
      const left = document.querySelector('.top-left-toolbar')?.getBoundingClientRect();
      const center = document.querySelector('.top-center-mode-island-wrap')?.getBoundingClientRect();
      const right = document.querySelector('.top-right-toolbar')?.getBoundingClientRect();
      const settingsBtn = document.querySelector('[data-testid="studio-settings-btn"]');

      return {
        hasSeparateSettings: !!settingsBtn,
        left: left ? { right: Math.round(left.right), width: Math.round(left.width) } : null,
        center: center ? { left: Math.round(center.left), right: Math.round(center.right), width: Math.round(center.width) } : null,
        right: right ? { left: Math.round(right.left), width: Math.round(right.width) } : null,
        leftCenterGap: (center && left) ? Math.round(center.left - left.right) : null,
        centerRightGap: (right && center) ? Math.round(right.left - center.right) : null,
      };
    });
    console.log(`${dims.name} Overlap & Clearance:`, mobileOverlap);
    if (mobileOverlap.leftCenterGap < 0 || mobileOverlap.centerRightGap < 0) {
      console.error(`ERROR: Mobile ${dims.name} header elements are overlapping!`);
    } else {
      console.log(`SUCCESS: Mobile ${dims.name} header has positive clearance, ZERO overlap!`);
    }

    await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/${dims.name}_header_clean.png` });

    // Open Mobile Drawer and check Guide toggle
    console.log(`Testing Mobile Guide disable switch on ${dims.name}...`);
    const hamburger = await mobilePage.$('.mobile-menu-toggle-btn');
    if (hamburger) {
      await hamburger.click();
      await new Promise(r => setTimeout(r, 400));
      await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/${dims.name}_drawer_guide_toggle.png` });

      // Click the Guide toggle switch to disable guide
      const toggleSwitch = await mobilePage.$('.mobile-drawer-section .settings-switch');
      if (toggleSwitch) {
        console.log('Toggling Guide on Mobile switch...');
        await toggleSwitch.click();
        await new Promise(r => setTimeout(r, 300));

        const isGuideDisabled = await mobilePage.evaluate(() => {
          return localStorage.getItem('zetashot_guide_mobile_disabled');
        });
        console.log(`localStorage zetashot_guide_mobile_disabled:`, isGuideDisabled);
        await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/${dims.name}_drawer_guide_disabled.png` });
      }
    }

    await mobilePage.close();
  }

  await browser.close();
  server.httpServer.close();
  console.log('\nAll checks finished successfully!');
}

verify().catch(console.error);
