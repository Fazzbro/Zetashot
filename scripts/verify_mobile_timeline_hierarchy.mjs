import { preview } from 'vite';
import puppeteer from 'puppeteer';

const ARTIFACT_DIR = 'C:/Users/NEW/.gemini/antigravity/brain/09fa3cb6-fd05-49a2-a93d-5bc3a51867ae';

async function runVerification() {
  console.log('--- 1. Launching Vite Preview Server on Port 4185 ---');
  const server = await preview({ preview: { port: 4185 } });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    console.log('\n--- 2. Testing Android Viewport (360x780, DPR: 2) ---');
    const page = await browser.newPage();
    await page.setViewport({
      width: 360,
      height: 780,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    await page.goto('http://localhost:4185', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // 1. Expand Timeline
    const expandBtn = await page.$('.timeline-mobile-toggle-btn.is-expand');
    if (expandBtn) {
      console.log('Expanding mobile timeline tray via .timeline-mobile-toggle-btn.is-expand...');
      await expandBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    // 2. Add multiple keyframes to create P01, P02, P03, P04 sequence
    const addKeyframeBtn = await page.$('.timeline-add-sequence-btn');
    if (addKeyframeBtn) {
      console.log('Adding keyframes P03 and P04...');
      await addKeyframeBtn.click();
      await new Promise(r => setTimeout(r, 500));
      await addKeyframeBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // 3. Add a second media clip or split at playhead to test multi-clip seam
    console.log('Seeking to 5.0s to split media clip...');
    await page.evaluate(() => {
      const track = document.querySelector('.timeline-clips-track') || document.querySelector('.timeline-multiclip-track');
      if (track) {
        const rect = track.getBoundingClientRect();
        const evt = new MouseEvent('click', {
          bubbles: true,
          clientX: rect.left + rect.width * 0.5,
          clientY: rect.top + 10
        });
        track.dispatchEvent(evt);
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const splitBtn = await page.$('[data-testid="split-media-clip-btn"]');
    if (splitBtn) {
      console.log('Clicking Split Media button...');
      await splitBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    // 4. Set transition on second clip to Gradient
    const transitionPill = await page.$('.multiclip-transition-btn');
    if (transitionPill) {
      console.log('Clicking transition junction badge to open transition sheet...');
      await transitionPill.click();
      await new Promise(r => setTimeout(r, 600));

      const gradBtn = await page.$('.transition-sheet-pill.is-gradient, .transition-option-pill.is-gradient-pill');
      if (gradBtn) {
        console.log('Selecting GRADIENT transition...');
        await gradBtn.click();
        await new Promise(r => setTimeout(r, 400));
      }

      const doneBtn = await page.$('.transition-sheet-done-btn, .transition-sheet-close-btn');
      if (doneBtn) {
        await doneBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 5. Select the first media clip to test if duration stepper appears (it must NOT on mobile!)
    await page.evaluate(() => {
      const firstClip = document.querySelector('.multiclip-card');
      if (firstClip) {
        (firstClip).click();
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // 6. Inspect Elements on Mobile Viewport
    const auditResults = await page.evaluate(() => {
      // Check 1: Media Duration Stepper [- +]
      const stepperBtns = Array.from(document.querySelectorAll('.multiclip-dur-step-btn')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
      });

      // Check 2: In-card duplicate transition trigger
      const inCardTransitionTriggers = Array.from(document.querySelectorAll('.multiclip-card-transition-trigger')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
      });

      // Check 3: Symmetrical transition junction badge
      const junctionContainer = document.querySelector('.multiclip-transition-junction-container');
      let junctionInfo = null;
      if (junctionContainer) {
        const rect = junctionContainer.getBoundingClientRect();
        const style = window.getComputedStyle(junctionContainer);
        junctionInfo = {
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          zIndex: style.zIndex,
          transform: style.transform
        };
      }

      // Check 4: Keyframe labels (P01, P02, P03, P04...)
      const keyframeLabels = Array.from(document.querySelectorAll('.clip-name-label')).map(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent?.trim(),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          fontSize: style.fontSize,
          overflow: style.overflow
        };
      });

      // Check for horizontal collisions between adjacent keyframe labels
      let labelCollisions = 0;
      for (let i = 0; i < keyframeLabels.length - 1; i++) {
        const a = keyframeLabels[i];
        const b = keyframeLabels[i + 1];
        if (a.width > 0 && b.width > 0 && a.right > b.left) {
          labelCollisions++;
        }
      }

      // Check 5: Media cards layout
      const mediaCards = Array.from(document.querySelectorAll('.multiclip-card')).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          isActive: el.classList.contains('is-active-clip'),
          hasIncomingTransition: el.classList.contains('has-incoming-transition'),
          hasOutgoingTransition: el.classList.contains('has-outgoing-transition')
        };
      });

      // Check 6: Duration texts on media cards
      const durationTexts = Array.from(document.querySelectorAll('.multiclip-card-dur')).map(el => el.textContent?.trim());

      return {
        stepperBtnCount: stepperBtns.length,
        inCardTransitionCount: inCardTransitionTriggers.length,
        junctionInfo,
        keyframeLabelCount: keyframeLabels.length,
        labelCollisions,
        keyframeLabels,
        mediaCards,
        durationTexts
      };
    });

    console.log('\n--- AUDIT RESULTS ON MOBILE (360px) ---');
    console.log('1. Media Duration Stepper Buttons [- +] visible:', auditResults.stepperBtnCount, auditResults.stepperBtnCount === 0 ? '(PASSED: NONE visible)' : '(FAILED)');
    console.log('2. Duplicate in-card transition triggers visible:', auditResults.inCardTransitionCount, auditResults.inCardTransitionCount === 0 ? '(PASSED: NONE visible)' : '(FAILED)');
    console.log('3. Transition Junction Info:', auditResults.junctionInfo);
    console.log('4. Keyframe labels count:', auditResults.keyframeLabelCount);
    console.log('5. Keyframe label collisions:', auditResults.labelCollisions, auditResults.labelCollisions === 0 ? '(PASSED: ZERO overlap)' : '(FAILED)');
    console.log('   Labels detail:', auditResults.keyframeLabels);
    console.log('6. Media cards:', auditResults.mediaCards);
    console.log('   Duration texts:', auditResults.durationTexts);

    // Save screenshots
    await page.screenshot({ path: `${ARTIFACT_DIR}/android_360_timeline_expanded_verified.png` });
    console.log('\nSaved full screen: android_360_timeline_expanded_verified.png');

    const timelineTray = await page.$('.timeline-bottom-tray, .timeline-dock-container');
    if (timelineTray) {
      await timelineTray.screenshot({ path: `${ARTIFACT_DIR}/android_360_timeline_tray_detail.png` });
      console.log('Saved tray detail: android_360_timeline_tray_detail.png');
    }

  } finally {
    await browser.close();
    server.httpServer.close();
    console.log('Cleaned up browser and server.');
  }
}

runVerification().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
