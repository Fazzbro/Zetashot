# System Architecture — OpenShot UI Camera

```
+------------------------------------------------------------------------------------+
|                                 OpenShot UI Camera                                 |
+------------------------------------------------------------------------------------+
|  [ Web Studio Application (Vite + React + TS) ]  /  [ Chromium Extension (MV3) ]   |
+------------------------------------------------------------------------------------+
|                                CORE SUBSYSTEMS                                     |
|                                                                                    |
|  1. Composition & Transform Canvas Engine                                          |
|     - Zoom (25%-400% smooth, cursor-centered), Pan, Rotate, Crop, Position         |
|     - Pixel-scale ruler system, Alignment guides, Safe-area grids, Snapping        |
|                                                                                    |
|  2. Viewport & Webpage Emulation System                                            |
|     - Interactive vs Transform mode (live scrolling, clicking, navigation)        |
|     - Presets: Desktop 4K/1080p, MacBook 1440/1280, iPad, iPhone 16 Pro, etc.     |
|     - Live URL embedding, Screen Capture Stream (getDisplayMedia), Image drop      |
|                                                                                    |
|  3. Device Mockup & Browser Chrome Engine                                          |
|     - Frames: macOS Safari / Chrome (traffic lights, search, tabs, URL simulation) |
|     - Frames: Windows 11 Fluent, MacBook Pro with Notch, Studio Display, iPad,     |
|               iPhone (Dynamic Island), Clean Frameless                             |
|     - Custom bevel, shadows, corner radii, material colors                         |
|                                                                                    |
|  4. Background & Visual Effects Layer                                              |
|     - Solid colors, Linear / Radial / Mesh Gradients, Custom Image Wallpaper       |
|     - Effects: Multi-layer elevation shadow, Neon glow, Blur, Brightness, Saturation|
|                                                                                    |
|  5. High-Resolution Screenshot Pipeline                                            |
|     - Multipliers: 1x, 2x, 3x, 4x genuine high-resolution rasterization           |
|     - Formats: PNG (with transparency), WebP (lossless/lossy), JPEG                |
|     - Copy to Clipboard (ClipboardItem API) & Save to Downloads                    |
|                                                                                    |
|  6. Screen Recording & Presentation Timeline Engine                                |
|     - MediaRecorder (WebM / MP4, 24/30/60 FPS, 720p-4K, configurable bitrate)     |
|     - Presentation keyframe timeline: position X/Y, zoom, rotation, duration       |
|     - Smooth interpolation (Linear, Ease-In, Ease-Out, Ease-In-Out, Cubic, Spring)  |
|                                                                                    |
|  7. Cursor & Interaction Simulation                                                |
|     - Modes: Hidden, Normal, Enlarged, Highlighted Ring, Click Ripple, Cursor Trail|
|                                                                                    |
|  8. Element Inspector & Selection Overlay                                          |
|     - Live DOM element picker, bounding box highlights, DOM selector path          |
|     - Capture Element, Center Element, Zoom to Element, Isolate Element            |
|                                                                                    |
|  9. Local-First Project Management & History (IndexedDB)                           |
|     - Offline save/load, duplicate, JSON export/import, capture history preview    |
+------------------------------------------------------------------------------------+
```

## Directory Structure

```
d:/mockup/
├── public/
│   ├── manifest.json            # Chromium Extension Manifest V3
│   └── popup.html               # Extension Quick Action Popup
├── src/
│   ├── components/
│   │   ├── CompositionCanvas.tsx# Central zoom/pan/ruler workspace
│   │   ├── CursorSimulator.tsx  # Cursor glow & ripple simulator
│   │   ├── DeviceMockupFrame.tsx# Mac, Windows, MacBook, Display, Mobile frames
│   │   ├── ElementPickerOverlay.tsx # Interactive DOM element inspector
│   │   ├── Header.tsx           # Top navigation bar
│   │   ├── HistoryModal.tsx     # Capture gallery dialog
│   │   ├── LeftToolbar.tsx      # Modes & tool toggles
│   │   ├── ProjectModal.tsx     # Project manager dialog
│   │   ├── RegionCaptureOverlay.tsx # Marquee region selector
│   │   ├── RightInspector.tsx   # Properties tabs (Device, Bg, Effects, Cursor, Export)
│   │   ├── ShortcutsModal.tsx   # Keyboard shortcuts dialog
│   │   └── TimelinePanel.tsx    # Keyframe camera timeline
│   ├── extension/
│   │   ├── background.ts        # Service worker for MV3
│   │   ├── content.ts           # Injected DOM script
│   │   └── manifest.json
│   ├── services/
│   │   ├── captureEngine.ts     # 1x-4x rasterizer & clipboard service
│   │   ├── extensionBridge.ts   # Chrome API bridge & getDisplayMedia
│   │   ├── fullPageStitcher.ts  # Vertical scroll stitcher
│   │   ├── recorderEngine.ts    # Canvas MediaRecorder pipeline
│   │   └── storageService.ts    # IndexedDB persistence
│   ├── styles/
│   │   ├── app.css
│   │   ├── canvas.css
│   │   ├── devices.css
│   │   ├── index.css
│   │   └── timeline.css
│   ├── test/
│   │   └── setup.ts             # Vitest test mocks
│   ├── utils/
│   │   ├── easing.ts
│   │   ├── exportResolution.ts
│   │   ├── gradientUtils.ts
│   │   ├── projectSerialization.ts
│   │   ├── transformMath.ts
│   │   └── viewportPresets.ts
│   ├── App.tsx
│   └── main.tsx
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── LICENSE
├── PRIVACY.md
├── README.md
├── SECURITY.md
├── package.json
└── vite.config.ts
```
