import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public_assets_capture/overlays');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const soraFontPath = path.resolve('Sora-Bold.ttf').replace(/\\/g, '/');
const soraSemiFontPath = path.resolve('Sora-SemiBold.ttf').replace(/\\/g, '/');

const overlayCards = [
  {
    id: 'overlay_scene1_intro',
    html: `
      <div class="card intro-card">
        <div class="badge-row">
          <span class="pill-badge accent-pill"><span class="pulse-dot"></span> STUDIO SHOWCASE</span>
          <span class="pill-badge">60 FPS</span>
          <span class="pill-badge">WEBGL 3D</span>
          <span class="pill-badge">LOCAL-FIRST</span>
        </div>
        <h1 class="main-title">ZETASHOT <span class="gradient-text">STUDIO</span></h1>
        <p class="subtitle">Turn screenshots & screen recordings into cinematic 3D motion graphics videos.</p>
        <div class="specs-grid">
          <div class="spec-item"><span class="spec-label">FRAMES</span><span class="spec-val">60.0 CFR</span></div>
          <div class="spec-item"><span class="spec-label">WATERMARK</span><span class="spec-val">ZERO</span></div>
          <div class="spec-item"><span class="spec-label">PRICING</span><span class="spec-val">100% FREE</span></div>
          <div class="spec-item"><span class="spec-label">ENGINE</span><span class="spec-val">WEBGL & SHADERS</span></div>
        </div>
      </div>
    `,
    position: 'top: 60px; left: 80px; width: 680px;',
  },
  {
    id: 'overlay_scene2_camera',
    html: `
      <div class="card camera-card">
        <div class="badge-row">
          <span class="pill-badge accent-pill"><span class="pulse-dot"></span> 7-DOF MECHANICS</span>
          <span class="pill-badge">CONTINUOUS SPLINES</span>
        </div>
        <h2 class="section-title">7-DOF Camera Engine</h2>
        <p class="subtitle">Full 3D rotation, optical zoom & telephoto perspective with soft-knee damping.</p>
        <div class="telemetry-box">
          <div class="telemetry-row">
            <span class="tele-axis">PITCH (rotX)</span>
            <span class="tele-val text-cyan">+28.5°</span>
          </div>
          <div class="telemetry-row">
            <span class="tele-axis">YAW (rotY)</span>
            <span class="tele-val text-purple">-34.2°</span>
          </div>
          <div class="telemetry-row">
            <span class="tele-axis">ROLL (rotZ)</span>
            <span class="tele-val text-pink">+5.8°</span>
          </div>
          <div class="telemetry-row">
            <span class="tele-axis">OPTICAL ZOOM</span>
            <span class="tele-val text-green">1.25x</span>
          </div>
          <div class="telemetry-row">
            <span class="tele-axis">PERSPECTIVE</span>
            <span class="tele-val text-yellow">1000px</span>
          </div>
        </div>
      </div>
    `,
    position: 'top: 70px; right: 80px; width: 440px;',
  },
  {
    id: 'overlay_scene3_compose',
    html: `
      <div class="card compose-card">
        <div class="badge-row">
          <span class="pill-badge compose-pill"><span class="pulse-dot-blue"></span> ONE-CLICK COMPOSE</span>
          <span class="pill-badge">OPERATOR MODE</span>
        </div>
        <h2 class="section-title">Intelligent Camera Paths</h2>
        <p class="subtitle">Draw multiple points of interest to automatically generate cinematic camera waypoints.</p>
        <div class="compose-features">
          <div class="feature-bullet"><span class="check-icon">✓</span> Cubic Hermite Spline Trajectories</div>
          <div class="feature-bullet"><span class="check-icon">✓</span> Velocity Boundary Clamping (v0 = vend = 0)</div>
          <div class="feature-bullet"><span class="check-icon">✓</span> Golden-Ratio Viewport Framing</div>
          <div class="feature-bullet"><span class="check-icon">✓</span> Continuous Multi-Region Easing</div>
        </div>
      </div>
    `,
    position: 'top: 60px; left: 80px; width: 560px;',
  },
  {
    id: 'overlay_scene4_backgrounds',
    html: `
      <div class="card bg-card">
        <div class="badge-row">
          <span class="pill-badge accent-pill"><span class="pulse-dot"></span> STUDIO COMPOSITION</span>
          <span class="pill-badge">CURATED ASSETS</span>
        </div>
        <h2 class="section-title">Backdrops & Device Mockups</h2>
        <p class="subtitle">Preset photography backdrops, mesh gradients, glass reflections & device bezels.</p>
        <div class="aspect-ratio-row">
          <div class="ratio-pill is-active">16:9 YouTube / X</div>
          <div class="ratio-pill">9:16 Reels / TikTok</div>
          <div class="ratio-pill">1:1 Instagram</div>
          <div class="ratio-pill">21:9 Ultrawide</div>
        </div>
        <div class="device-frames-row">
          <span class="device-tag">macOS Safari</span>
          <span class="device-tag">Chrome</span>
          <span class="device-tag">Mobile / Tablet</span>
          <span class="device-tag">Custom Bezel & Drop Shadows</span>
        </div>
      </div>
    `,
    position: 'bottom: 60px; left: 80px; width: 620px;',
  },
  {
    id: 'overlay_scene5_export_test',
    html: `
      <div class="card test-card">
        <div class="badge-row">
          <span class="pill-badge green-pill"><span class="pulse-dot-green"></span> 100% TESTED & VERIFIED</span>
          <span class="pill-badge">FRAME-ACCURATE</span>
        </div>
        <h2 class="section-title">Deterministic Export Engine</h2>
        <p class="subtitle">Discrete CFR integer clock rendered directly into browser WebCodecs & FFmpeg.</p>
        <div class="test-stats-grid">
          <div class="test-stat-item">
            <span class="stat-big text-green">215 / 215</span>
            <span class="stat-desc">Vitest Unit & Integration Tests Passed</span>
          </div>
          <div class="test-stat-item">
            <span class="stat-big text-cyan">60.0 FPS</span>
            <span class="stat-desc">Zero Jitter · Discrete Integer Frames</span>
          </div>
          <div class="test-stat-item">
            <span class="stat-big text-yellow">4K & 1080p</span>
            <span class="stat-desc">Multi-Resolution Universal MP4</span>
          </div>
          <div class="test-stat-item">
            <span class="stat-big text-purple">100%</span>
            <span class="stat-desc">Client-Side Hardware Acceleration</span>
          </div>
        </div>
      </div>
    `,
    position: 'top: 60px; left: 80px; width: 640px;',
  },
  {
    id: 'overlay_scene6_outro',
    html: `
      <div class="card outro-card">
        <div class="badge-row">
          <span class="pill-badge accent-pill"><span class="pulse-dot"></span> OPEN SOURCE & FREE</span>
          <span class="pill-badge">MIT LICENSE</span>
        </div>
        <h1 class="main-title">START CREATING <span class="gradient-text">TODAY</span></h1>
        <p class="subtitle">Turn screen recordings and screenshots into stunning 3D product animations in seconds.</p>
        <div class="cta-box">
          <div class="cta-url">
            <span class="globe-icon">🌐</span>
            <span class="url-text">zetashot.vercel.app</span>
          </div>
          <div class="github-url">
            <span class="git-icon">💻</span>
            <span class="git-text">github.com/Fazzbro/Zetashot</span>
          </div>
        </div>
        <div class="guarantee-row">
          <span>✓ No Account Required</span>
          <span>✓ No Watermarks</span>
          <span>✓ Local-First Privacy</span>
        </div>
      </div>
    `,
    position: 'bottom: 80px; left: 50%; transform: translateX(-50%); width: 760px; text-align: center;',
  },
];

async function generateOverlays() {
  console.log('Launching browser to render transparent overlay graphics...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of overlayCards) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @font-face {
            font-family: 'Sora';
            src: url('file:///${soraFontPath}') format('truetype');
            font-weight: 700;
          }
          @font-face {
            font-family: 'Sora';
            src: url('file:///${soraSemiFontPath}') format('truetype');
            font-weight: 600;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1920px;
            height: 1080px;
            background: transparent;
            font-family: 'Sora', system-ui, -apple-system, sans-serif;
            color: #ffffff;
            position: relative;
            overflow: hidden;
          }
          .card {
            position: absolute;
            ${item.position}
            background: rgba(10, 14, 24, 0.88);
            border: 1px solid rgba(255, 255, 255, 0.16);
            backdrop-filter: blur(28px);
            border-radius: 20px;
            padding: 32px 36px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(99, 102, 241, 0.15);
          }
          .badge-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            justify-content: ${item.id === 'overlay_scene6_outro' ? 'center' : 'flex-start'};
          }
          .pill-badge {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.14);
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #cbd5e1;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .accent-pill {
            background: rgba(99, 102, 241, 0.22);
            border-color: rgba(99, 102, 241, 0.5);
            color: #a5b4fc;
          }
          .compose-pill {
            background: rgba(59, 130, 246, 0.22);
            border-color: rgba(59, 130, 246, 0.5);
            color: #93c5fd;
          }
          .green-pill {
            background: rgba(16, 185, 129, 0.22);
            border-color: rgba(16, 185, 129, 0.5);
            color: #6ee7b7;
          }
          .pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #818cf8;
            box-shadow: 0 0 8px #818cf8;
          }
          .pulse-dot-blue {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #3b82f6;
            box-shadow: 0 0 8px #3b82f6;
          }
          .pulse-dot-green {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
          }
          .main-title {
            font-size: 38px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.15;
            margin-bottom: 10px;
          }
          .section-title {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.01em;
            line-height: 1.2;
            margin-bottom: 10px;
          }
          .gradient-text {
            background: linear-gradient(135deg, #60a5fa, #c084fc, #f472b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 15px;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 22px;
          }
          .specs-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 18px;
          }
          .spec-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .spec-label {
            font-size: 10px;
            color: #64748b;
            font-weight: 700;
            letter-spacing: 0.1em;
          }
          .spec-val {
            font-size: 14px;
            font-weight: 700;
            color: #e2e8f0;
          }
          .telemetry-box {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .telemetry-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
          }
          .tele-axis {
            color: #94a3b8;
            font-weight: 600;
          }
          .tele-val {
            font-weight: 800;
            font-family: monospace;
            font-size: 14px;
          }
          .text-cyan { color: #38bdf8; }
          .text-purple { color: #c084fc; }
          .text-pink { color: #f472b6; }
          .text-green { color: #4ade80; }
          .text-yellow { color: #facc15; }
          .compose-features {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .feature-bullet {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #e2e8f0;
          }
          .check-icon {
            color: #38bdf8;
            font-weight: 800;
          }
          .aspect-ratio-row {
            display: flex;
            gap: 8px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }
          .ratio-pill {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            color: #94a3b8;
          }
          .ratio-pill.is-active {
            background: rgba(99, 102, 241, 0.25);
            border-color: #818cf8;
            color: #ffffff;
          }
          .device-frames-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .device-tag {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            color: #cbd5e1;
          }
          .test-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .test-stat-item {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .stat-big {
            font-size: 24px;
            font-weight: 800;
          }
          .stat-desc {
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.4;
          }
          .cta-box {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-bottom: 20px;
          }
          .cta-url {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            padding: 12px 28px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.5);
          }
          .github-url {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.18);
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .guarantee-row {
            display: flex;
            gap: 20px;
            justify-content: center;
            font-size: 13px;
            color: #94a3b8;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        ${item.html}
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    await new Promise((r) => setTimeout(r, 400));

    const outPath = path.join(outDir, `${item.id}.png`);
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Saved overlay: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    await page.close();
  }

  await browser.close();
  console.log('All transparent motion overlays successfully rendered!');
}

generateOverlays().catch(console.error);
