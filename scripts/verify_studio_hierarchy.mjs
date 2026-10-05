import { preview } from 'vite';
import puppeteer from 'puppeteer';

const ARTIFACT_DIR = 'C:/Users/NEW/.gemini/antigravity/brain/09fa3cb6-fd05-49a2-a93d-5bc3a51867ae';

async function verify() {
  console.log('Starting preview server on port 4180...');
  const server = await preview({ preview: { port: 4180 } });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  // 1. Desktop Test (1440x900)
  console.log('\n--- Testing Desktop (1440x900) ---');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900 });
  await desktopPage.goto('http://localhost:4180', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // Check stage visibility
  const stageStatsDesktop = await desktopPage.evaluate(() => {
    const stage = document.querySelector('.capture-stage');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    const style = window.getComputedStyle(stage);
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      border: style.border,
      boxShadow: style.boxShadow,
      backgroundColor: style.backgroundColor,
    };
  });
  console.log('Desktop Stage Stats:', stageStatsDesktop);

  await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/desktop_canvas_stage.png` });
  console.log('Saved desktop_canvas_stage.png');

  // Click Settings button in Header
  const settingsBtn = await desktopPage.$('[data-testid="studio-settings-btn"]');
  if (settingsBtn) {
    console.log('Clicking Settings button...');
    await settingsBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/desktop_settings_drawer_open.png` });
    console.log('Saved desktop_settings_drawer_open.png');

    // Click Camera Tab
    await desktopPage.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.settings-tab-btn'));
      const cameraTab = tabs.find(t => t.textContent.includes('Camera'));
      if (cameraTab) cameraTab.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/desktop_settings_camera_tab.png` });
    console.log('Saved desktop_settings_camera_tab.png');

    // Switch to dark mode via Canvas tab
    await desktopPage.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.settings-tab-btn'));
      const canvasTab = tabs.find(t => t.textContent.includes('Canvas'));
      if (canvasTab) canvasTab.click();
    });
    await new Promise(r => setTimeout(r, 300));
    const darkBtn = await desktopPage.$('[data-testid="theme-dark-btn"]');
    if (darkBtn) await darkBtn.click();
    await new Promise(r => setTimeout(r, 400));
    await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/desktop_dark_mode_canvas.png` });
    console.log('Saved desktop_dark_mode_canvas.png');
  } else {
    console.warn('Could not find settings button on desktop!');
  }
  await desktopPage.close();

  // 2. Mobile Android Test (390x844)
  console.log('\n--- Testing Mobile Android (390x844) ---');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://localhost:4180', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const stageStatsMobile = await mobilePage.evaluate(() => {
    const stage = document.querySelector('.capture-stage');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    const style = window.getComputedStyle(stage);
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      border: style.border,
      boxShadow: style.boxShadow,
      backgroundColor: style.backgroundColor,
    };
  });
  console.log('Mobile Stage Stats:', stageStatsMobile);

  await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/mobile_canvas_stage.png` });
  console.log('Saved mobile_canvas_stage.png');

  // Click Settings button directly on mobile header or via mobile menu
  const mobileSettingsBtn = await mobilePage.$('[data-testid="studio-settings-btn"]');
  if (mobileSettingsBtn) {
    console.log('Clicking Settings button on mobile header...');
    await mobileSettingsBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/mobile_settings_drawer_open.png` });
    console.log('Saved mobile_settings_drawer_open.png');
  } else {
    console.log('Trying via mobile hamburger menu...');
    const hamburger = await mobilePage.$('.mobile-menu-toggle-btn');
    if (hamburger) {
      await hamburger.click();
      await new Promise(r => setTimeout(r, 400));
      const drawerBtn = await mobilePage.$('[data-testid="mobile-drawer-settings-btn"]');
      if (drawerBtn) {
        await drawerBtn.click();
        await new Promise(r => setTimeout(r, 600));
        await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/mobile_settings_drawer_open.png` });
        console.log('Saved mobile_settings_drawer_open.png via hamburger menu');
      }
    }
  }
  await mobilePage.close();

  await browser.close();
  server.httpServer.close();
  console.log('Verification finished successfully!');
}

verify().catch(console.error);
