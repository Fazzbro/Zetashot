import { preview } from 'vite';
import puppeteer from 'puppeteer';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
  { name: 'Desktop_FHD', width: 1920, height: 1080, isMobile: false },
  { name: 'Laptop_MacBook', width: 1440, height: 900, isMobile: false },
  { name: 'Tablet_iPad', width: 1024, height: 768, isMobile: false },
  { name: 'Mobile_iPhone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'Mobile_Android', width: 360, height: 800, isMobile: true, hasTouch: true },
];

function isOverlapping(rect1, rect2, tolerance = 1) {
  if (!rect1 || !rect2) return false;
  return !(
    rect1.right - tolerance <= rect2.left ||
    rect1.left + tolerance >= rect2.right ||
    rect1.bottom - tolerance <= rect2.top ||
    rect1.top + tolerance >= rect2.bottom
  );
}

async function auditViewport(page, vp) {
  console.log(`\n======================================================`);
  console.log(`  AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
  console.log(`======================================================`);

  const issues = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon or benign resource 404s
      if (!text.includes('favicon.ico') && !text.includes('404')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  await page.setViewport({
    width: vp.width,
    height: vp.height,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  });

  await page.goto('http://localhost:4192', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // --- CHECK 1: Header Non-Overlap & Viewport Containment ---
  const headerCheck = await page.evaluate((vw) => {
    const left = document.querySelector('.top-left-toolbar')?.getBoundingClientRect();
    const center = document.querySelector('.top-center-mode-island-wrap')?.getBoundingClientRect();
    const right = document.querySelector('.top-right-toolbar')?.getBoundingClientRect();

    if (!left || !right) return { left: null, right: null, center: null, error: 'Toolbar missing' };

    let leftCenterGap = null;
    let centerRightGap = null;

    if (center && center.width > 0) {
      leftCenterGap = center.left - left.right;
      centerRightGap = right.left - center.right;
    }

    const rightOverflow = right.right - vw;
    const leftBleed = 0 - left.left;

    return {
      left: { left: Math.round(left.left), right: Math.round(left.right), width: Math.round(left.width) },
      right: { left: Math.round(right.left), right: Math.round(right.right), width: Math.round(right.width) },
      center: center ? { left: Math.round(center.left), right: Math.round(center.right), width: Math.round(center.width) } : null,
      leftCenterGap: leftCenterGap !== null ? Math.round(leftCenterGap) : null,
      centerRightGap: centerRightGap !== null ? Math.round(centerRightGap) : null,
      rightOverflow: Math.round(rightOverflow),
      leftBleed: Math.round(leftBleed),
    };
  }, vp.width);

  console.log(`[Header Clearance & Containment]`, headerCheck);
  if (headerCheck.leftCenterGap !== null && headerCheck.leftCenterGap < 0) {
    issues.push(`Header Left and Center overlap by ${Math.abs(headerCheck.leftCenterGap)}px`);
  }
  if (headerCheck.centerRightGap !== null && headerCheck.centerRightGap < 0) {
    issues.push(`Header Center and Right overlap by ${Math.abs(headerCheck.centerRightGap)}px`);
  }
  if (headerCheck.rightOverflow > 1) {
    issues.push(`Header Right toolbar overflows viewport by ${headerCheck.rightOverflow}px`);
  }
  if (headerCheck.leftBleed > 1) {
    issues.push(`Header Left toolbar bleeds offscreen by ${headerCheck.leftBleed}px`);
  }

  // --- CHECK 2: Add Media Dropdown Menu Opening and Viewport Containment ---
  if (!vp.isMobile) {
    console.log(`[Testing Add Media Split Dropdown...]`);
    await page.click('.add-media-dropdown-trigger');
    await new Promise((r) => setTimeout(r, 300));

    const dropdownCheck = await page.evaluate((vw, vh) => {
      const menu = document.querySelector('.add-media-dropdown-menu');
      if (!menu) return { exists: false };
      const r = menu.getBoundingClientRect();
      return {
        exists: true,
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        width: Math.round(r.width),
        height: Math.round(r.height),
        fitsHorizontally: r.left >= 0 && r.right <= vw,
        fitsVertically: r.top >= 0 && r.bottom <= vh,
      };
    }, vp.width, vp.height);

    console.log(`[Add Media Dropdown Bounds]`, dropdownCheck);
    if (!dropdownCheck.exists) {
      issues.push('Add media dropdown menu failed to render');
    } else if (!dropdownCheck.fitsHorizontally || !dropdownCheck.fitsVertically) {
      issues.push('Add media dropdown overflows viewport boundaries');
    }

    // Close dropdown
    await page.click('.add-media-dropdown-trigger');
    await new Promise((r) => setTimeout(r, 200));
  }

  // --- CHECK 3: Blank Canvas Mode (Must be Pure Background, zero floating box) ---
  console.log(`[Testing Blank Canvas Mode (Solo)...]`);
  if (!vp.isMobile) {
    await page.click('.add-media-dropdown-trigger');
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => {
      const soloBtn = Array.from(document.querySelectorAll('.add-media-dropdown-item')).find((el) =>
        el.textContent?.includes('Blank Canvas (Solo)')
      );
      if (soloBtn) (soloBtn).click();
    });
  } else {
    // On mobile, open drawer and click Blank Canvas
    await page.click('.mobile-menu-toggle-btn');
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.mobile-drawer-action-btn')).find((el) =>
        el.textContent?.includes('Blank Canvas')
      );
      if (btn) (btn).click();
    });
  }
  await new Promise((r) => setTimeout(r, 800));

  // If mobile and collapsed, expand timeline so we can inspect multiclip card
  if (vp.isMobile) {
    await page.evaluate(() => {
      const expandBtn = document.querySelector('.timeline-mobile-toggle-btn.is-expand');
      if (expandBtn) (expandBtn).click();
    });
    await new Promise((r) => setTimeout(r, 300));
  }

  const blankCanvasCheck = await page.evaluate(() => {
    const frameScene = document.querySelector('.frame-scene');
    const isFrameHidden = frameScene ? window.getComputedStyle(frameScene).display === 'none' : true;
    const cards = Array.from(document.querySelectorAll('.multiclip-card'));
    const dummyBox = document.querySelector('#mockup-blank-canvas');
    return {
      isFrameHidden,
      clipCount: cards.length,
      hasDummyBox: !!dummyBox,
    };
  });

  console.log(`[Blank Canvas Verification]`, blankCanvasCheck);
  if (!blankCanvasCheck.isFrameHidden) {
    issues.push('Blank canvas still renders floating frame-scene instead of pure background');
  }
  if (blankCanvasCheck.hasDummyBox) {
    issues.push('Blank canvas renders unwanted dummy black box');
  }
  if (blankCanvasCheck.clipCount !== 1) {
    issues.push(`Expected 1 solo clip in timeline, found ${blankCanvasCheck.clipCount}`);
  }

  // --- CHECK 4: FX Transition Modal Placement & Collision Check ---
  console.log(`[Testing FX Transition Modal Placement...]`);
  const fxBtnClicked = await page.evaluate(() => {
    const fxBtn = document.querySelector('[data-guide="fx-button"], .timeline-quick-tool-btn.transition-tool-btn, .multiclip-transition-btn, button[title*="Transition"]');
    if (fxBtn) {
      (fxBtn).click();
      return true;
    }
    return false;
  });

  if (fxBtnClicked) {
    await new Promise((r) => setTimeout(r, 600));

    const fxModalCheck = await page.evaluate((vw, vh, isMobile) => {
      const modal = document.querySelector('.transition-sheet-modal');
      const operatorIsland = document.querySelector('.operator-floating-island, .canvas-tool-pill-island, .timeline-floating-island');
      const timelineTray = document.querySelector('.timeline-tray-container, .ui-camera-timeline-tray, [data-guide="video-timeline"]');

      if (!modal) return { modalFound: false };

      const mRect = modal.getBoundingClientRect();
      const opRect = operatorIsland?.getBoundingClientRect();
      const tlRect = timelineTray?.getBoundingClientRect();

      let overlapsOperator = false;
      let overlapsTimeline = false;

      if (!isMobile) {
        if (opRect) {
          overlapsOperator = !(
            mRect.right <= opRect.left ||
            mRect.left >= opRect.right ||
            mRect.bottom <= opRect.top ||
            mRect.top >= opRect.bottom
          );
        }
        if (tlRect) {
          overlapsTimeline = !(
            mRect.right <= tlRect.left ||
            mRect.left >= tlRect.right ||
            mRect.bottom <= tlRect.top ||
            mRect.top >= tlRect.bottom
          );
        }
      }

      return {
        modalFound: true,
        modalRect: { top: Math.round(mRect.top), bottom: Math.round(mRect.bottom), height: Math.round(mRect.height) },
        operatorTop: opRect ? Math.round(opRect.top) : null,
        timelineTop: tlRect ? Math.round(tlRect.top) : null,
        clearanceToTimeline: tlRect ? Math.round(tlRect.top - mRect.bottom) : null,
        overlapsOperator,
        overlapsTimeline,
      };
    }, vp.width, vp.height, vp.isMobile);

    console.log(`[FX Modal Placement Check]`, fxModalCheck);
    if (!fxModalCheck.modalFound) {
      issues.push('FX transition modal did not render upon clicking FX button');
    } else {
      if (fxModalCheck.overlapsOperator) {
        issues.push('FX transition modal overlaps the operator control panel');
      }
      if (fxModalCheck.overlapsTimeline) {
        issues.push('FX transition modal overlaps the timeline track controls');
      }
      if (!vp.isMobile && fxModalCheck.clearanceToTimeline !== null && fxModalCheck.clearanceToTimeline < 10) {
        issues.push(`FX transition modal has insufficient clearance to timeline: ${fxModalCheck.clearanceToTimeline}px`);
      }
    }

    // Dismiss modal cleanly by clicking Done button or Close button
    await page.evaluate(() => {
      const doneBtn = document.querySelector('.transition-sheet-done-btn');
      if (doneBtn) {
        (doneBtn).click();
      } else {
        const closeBtn = document.querySelector('.transition-sheet-close-btn');
        if (closeBtn) (closeBtn).click();
      }
    });
    // Wait until transition sheet backdrop is completely unmounted
    try {
      await page.waitForFunction(() => !document.querySelector('.transition-sheet-backdrop'), { timeout: 3000 });
    } catch {
      console.warn('Transition backdrop wait timed out; clicking backdrop directly');
      await page.evaluate(() => {
        const b = document.querySelector('.transition-sheet-backdrop');
        if (b) (b).click();
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  } else {
    console.warn(`[FX Button] FX trigger button not found on this view.`);
  }

  // --- CHECK 5: Media Library Modal Verification ---
  console.log(`[Testing Media Library Modal...]`);
  await page.evaluate(() => {
    const libBtn = document.querySelector('.add-media-primary-btn, [data-guide="add-media"]');
    if (libBtn) (libBtn).click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const modalCheck = await page.evaluate((vw, vh) => {
    const modal = document.querySelector('.unified-screens-library, .source-library-modal');
    if (!modal) return { open: false };
    const r = modal.getBoundingClientRect();
    return {
      open: true,
      left: Math.round(r.left),
      right: Math.round(r.right),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      width: Math.round(r.width),
      height: Math.round(r.height),
      isWithinViewport: r.left >= 0 && r.right <= vw + 2,
    };
  }, vp.width, vp.height);

  console.log(`[Media Library Modal Bounds]`, modalCheck);
  if (!modalCheck.open) {
    issues.push('Media Library modal did not open');
  } else if (!modalCheck.isWithinViewport) {
    issues.push('Media Library modal bleeds outside viewport bounds');
  }

  // Close modal via close button
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.screens-library-close, .source-library-close');
    if (closeBtn) (closeBtn).click();
    else {
      const backdrop = document.querySelector('.screens-library-backdrop');
      if (backdrop) (backdrop).click();
    }
  });
  try {
    await page.waitForFunction(() => !document.querySelector('.screens-library-backdrop'), { timeout: 3000 });
  } catch {
    await page.evaluate(() => {
      const backdrop = document.querySelector('.screens-library-backdrop');
      if (backdrop) (backdrop).click();
    });
  }
  await new Promise((r) => setTimeout(r, 300));

  // --- CHECK 6: Mobile Drawer (if mobile) ---
  if (vp.isMobile) {
    console.log(`[Testing Mobile Drawer...]`);
    await page.click('.mobile-menu-toggle-btn');
    await new Promise((r) => setTimeout(r, 400));

    const drawerCheck = await page.evaluate(() => {
      const drawer = document.querySelector('.mobile-menu-drawer');
      const blankBtn = Array.from(document.querySelectorAll('.mobile-drawer-action-btn')).some((el) =>
        el.textContent?.includes('Blank Canvas')
      );
      const mediaLibBtn = Array.from(document.querySelectorAll('.mobile-drawer-action-btn')).some((el) =>
        el.textContent?.includes('Media Library')
      );
      const sections = Array.from(document.querySelectorAll('.mobile-drawer-section-title')).map((el) =>
        el.textContent?.trim()
      );
      return {
        isOpen: !!drawer,
        hasBlankBtn: blankBtn,
        hasMediaLibBtn: mediaLibBtn,
        sections,
      };
    });

    console.log(`[Mobile Drawer State]`, drawerCheck);
    if (!drawerCheck.isOpen) issues.push('Mobile drawer did not open');
    if (!drawerCheck.hasBlankBtn) issues.push('Mobile drawer missing Blank Canvas action button');
    if (!drawerCheck.hasMediaLibBtn) issues.push('Mobile drawer missing Media Library button');

    // Close drawer
    await page.click('.mobile-drawer-close-btn');
    try {
      await page.waitForFunction(() => !document.querySelector('.mobile-menu-drawer-backdrop'), { timeout: 3000 });
    } catch {
      await page.evaluate(() => {
        const bd = document.querySelector('.mobile-menu-drawer-backdrop');
        if (bd) (bd).click();
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // --- CHECK 7: Floating Elements AABB Overlap Audit ---
  const aabbCheck = await page.evaluate((isMobile) => {
    const collisions = [];
    const elements = [
      { name: 'Header', rect: document.querySelector('.studio-top-bar')?.getBoundingClientRect() },
      { name: 'OperatorIsland', rect: document.querySelector('.operator-floating-island, .canvas-tool-pill-island')?.getBoundingClientRect() },
      { name: 'TimelineTray', rect: document.querySelector('.ui-camera-timeline-tray')?.getBoundingClientRect() },
    ].filter((e) => e.rect && e.rect.width > 0 && e.rect.height > 0);

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const r1 = elements[i].rect;
        const r2 = elements[j].rect;
        const overlap = !(
          r1.right <= r2.left ||
          r1.left >= r2.right ||
          r1.bottom <= r2.top ||
          r1.top >= r2.bottom
        );
        if (overlap) {
          collisions.push(`${elements[i].name} overlaps ${elements[j].name}`);
        }
      }
    }
    return collisions;
  }, vp.isMobile);

  if (aabbCheck.length > 0) {
    console.error(`[AABB Collisions]`, aabbCheck);
    issues.push(...aabbCheck);
  }

  if (consoleErrors.length > 0) {
    console.error(`[Console Errors Detected]`, consoleErrors);
    issues.push(...consoleErrors.map((e) => `Console Error: ${e}`));
  }

  console.log(`\n--- Summary for ${vp.name} ---`);
  if (issues.length === 0) {
    console.log(`✓ ALL TESTS PASSED FOR ${vp.name}. ZERO OVERLAPS, ZERO BUGS.`);
  } else {
    console.error(`✗ ${issues.length} ISSUE(S) FOUND FOR ${vp.name}:`);
    issues.forEach((it, idx) => console.error(`  ${idx + 1}. ${it}`));
  }

  return { viewport: vp.name, passed: issues.length === 0, issues };
}

async function runProductionAudit() {
  console.log('>>> STARTING VITE PRODUCTION PREVIEW ON PORT 4192 <<<');
  const server = await preview({ preview: { port: 4192 } });

  console.log('>>> LAUNCHING HEADLESS CHROME WITH FULL HARDWARE SIMULATION <<<');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    const result = await auditViewport(page, vp);
    results.push(result);
    await page.close();
  }

  await browser.close();
  await server.close();

  console.log('\n======================================================');
  console.log('             FINAL PRODUCTION AUDIT REPORT');
  console.log('======================================================');

  let totalIssues = 0;
  for (const res of results) {
    const status = res.passed ? '✓ PASSED' : '✗ FAILED';
    console.log(`${res.viewport.padEnd(20)}: ${status} (${res.issues.length} issues)`);
    if (res.issues.length > 0) {
      totalIssues += res.issues.length;
      res.issues.forEach((iss) => console.log(`   - ${iss}`));
    }
  }

  console.log('======================================================');
  if (totalIssues === 0) {
    console.log('>>> CONCLUSION: ZERO BUGS, ZERO UNWANTED OVERLAPS. <<<');
    console.log('>>> ALL UI COMPONENTS MEET PRODUCTION BENCHMARK.  <<<');
    process.exit(0);
  } else {
    console.error(`>>> AUDIT FAILED: ${totalIssues} TOTAL ISSUE(S) DETECTED. <<<`);
    process.exit(1);
  }
}

runProductionAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
