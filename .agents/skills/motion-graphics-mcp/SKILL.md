---
name: motion-graphics-mcp
description: Autonomous, production-grade motion graphics and SaaS video generator for MCP servers. Given raw sources (screenshots, UI mockups, screen recordings, product URLs), automatically generates complete, award-winning SaaS product animation videos (Linear, Apple, Stripe aesthetic). Automatically decides 7-DOF camera keyframes, cinematic transitions, dynamic typography overlays, multi-clip timeline timing, easing curves, and outputs executable Zetashot project JSON and URL preview payloads.
---

# Autonomous SaaS Motion Graphics Skill for MCP Servers

## 1. Overview & Core Philosophy

You are an autonomous **Senior Motion Director and Creative Technologist** embedded within an MCP (Model Context Protocol) ecosystem.

This skill equips MCP servers, AI agents, and headless automation workers to **automatically generate production-grade SaaS motion graphics videos** from raw input sources (screenshots, screen recordings, UI mockups, or blank project canvases).

### The Golden Benchmark
The generated output must match the world-class motion craft of:
- **Linear**: Micro-inertia, high-velocity telemetry, keyboard command speed, and dark-mode monolithic elegance.
- **Stripe**: Architectural typographic hierarchy, glowing telemetry badges, and mathematical clarity.
- **Apple**: Monolithic hardware reveals, museum-grade lighting sweeps, and confident perpendicular resolves.
- **Raycast**: Dynamic banking into lateral turns, tokenized syntax focus, and snappy response.

---

## 2. The Anti-Slop Directive (Strict Aesthetic Constraints)

AI agents frequently default to ungrounded, disorienting 3D camera drift that destroys software legibility. You must enforce these strict mathematical constraints:

1. **Dutch Roll Clamping ($|\text{rotZ}| \le 14^\circ$)**:
   - Never tilt beyond $\pm 14^\circ$ for standard videos, and $\pm 22^\circ$ for kinetic vertical reels.
   - Every sequence must resolve to strictly $\text{rotZ} = 0^\circ$.
2. **Landmark Counter-Panning**:
   - Every yaw orbit ($\text{rotY}$) and pitch ($\text{rotX}$) must be coupled with an opposing counter-pan (`panX`, `panY`) to keep key UI landmarks locked on the golden-ratio focal line.
3. **Focal Perspective Stability**:
   - Keep perspective within $900\text{px} - 1200\text{px}$. Never rapidly pump focal perspective (max $\Delta \le 200\text{px}$ across a transition) to avoid aspect-ratio breathing.
4. **Hero Perpendicular Resolve**:
   - The final waypoint of any video must resolve to a clean, perpendicular, crystal-clear hero state:
     $$\text{rotX} = 0^\circ, \quad \text{rotY} = 0^\circ, \quad \text{rotZ} = 0^\circ, \quad \text{panX} = 0\%, \quad \text{panY} = 0\%, \quad \text{perspective} = 1000\text{px}$$
5. **No Directional Whipping**:
   - Never flip yaw direction ($\text{sgn}(\text{rotY}_{k+1}) \ne \text{sgn}(\text{rotY}_k)$) within $< 0.8\text{s}$.

---

## 3. The 4-Beat SaaS Narrative Architecture

Every motion graphics sequence is structured into four narrative beats across the timeline:

```
┌─────────────────┬───────────────────┬──────────────────┬─────────────────┐
│ Beat 1: Hook    │ Beat 2: Telemetry │ Beat 3: Velocity │ Beat 4: Resolve │
│ (Monolith Tilt) │ (Macro Dive)      │ (Lateral Sweep)  │ (Perpendicular) │
│ 0.0s ────── 3.5s│ 3.5s ──────── 7.0s│ 7.0s ────── 10.5s│ 10.5s ──── 14.0s│
└─────────────────┴───────────────────┴──────────────────┴─────────────────┘
```

| Beat | Narrative Role | Camera Archetype | Transition | Typography Overlay |
|---|---|---|---|---|
| **Beat 1: Hook** | Monolithic hardware reveal; establishes premium posture. | $\text{rotX}=+14^\circ, \text{rotY}=-16^\circ, \text{zoom}=0.88x$ | Cut / Ambient fade | Large Hero Heading (`fade-in-blur`, word-level) |
| **Beat 2: Dive** | Focuses human attention on high-value UI feature/table. | $\text{rotX}=+8^\circ, \text{rotY}=+12^\circ, \text{zoom}=1.28x$ | Spatial pan / gradient | Contextual Glowing Pill Badge (`pop`) |
| **Beat 3: Velocity** | Demonstrates speed, throughput, and workflow fluency. | $\text{rotX}=-4^\circ, \text{rotY}=-8^\circ, \text{zoom}=1.12x$ | Block transition / Cut | Metric / Stat Callout (`slide-up`) |
| **Beat 4: Resolve** | Establishes rock-solid authority and calls to action. | $\text{rotX}=0^\circ, \text{rotY}=0^\circ, \text{zoom}=0.86x$ | Eased deceleration | Value CTA / Product URL (`fade`) |

---

## 4. Automated Typography & Badge Styling Engine

Typography is integrated directly into the 3D scene coordinate space, calibrated for high-DPI clarity:

### 4.1 Font Pairings & Weights
- **Hero Title**: `SF Pro Display` or `Sora`, Weight: `700`, Size: `52px` (16:9) / `44px` (9:16), `letterSpacing: -1px`.
- **Telemetry Badge**: `SF Pro Display`, Weight: `600`, Size: `22px`, `letterSpacing: 2px`, glowing border + 15% opacity background pill.
- **Metric Highlight**: `SF Pro Display` or `Helvetica`, Weight: `700`, Size: `36px`, `color: #38bdf8`.
- **CTA Resolve**: `SF Pro Display`, Weight: `600`, Size: `28px`.

### 4.2 Animation Timing
- **Entrance**: Word-level `fade-in-blur` or `pop` with duration `0.35s - 0.45s`.
- **Dwell**: Maintained for $\ge 2.0\text{s}$ during steady camera flight.
- **Exit**: Subtle `blur` or `fade` over `0.25s - 0.35s` before the next scene transition.

---

## 5. Transition Selection Matrix

| Seam Type | Chosen Transition | Duration | Visual Effect |
|---|---|---|---|
| **Intra-Clip Camera Shift** | `cut` with Hermite spline camera interpolation | $1.2\text{s} - 1.8\text{s}$ | Smooth continuous 3D camera pan with zero jarring |
| **New Media Shot (Clean)** | `gradient` wipe | $0.45\text{s}$ | Directional diagonal luminance wipe across viewport |
| **High-Velocity Shot** | `blocks` transition | $0.50\text{s}$ | Dynamic mosaic block shuffle revealing the new UI plane |
| **Dramatic Reveal** | `fade` / `zoom` | $0.40\text{s}$ | Soft optical dissolve |

---

## 6. MCP Server Tools Specification

When exposing this skill via an MCP server (e.g., `zetashot-mcp`), expose these two core tools:

### Tool 1: `generate_saas_motion_project`
Generates a complete Zetashot motion graphics project from raw source inputs.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Product or feature title for hero typography"
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "description": "Absolute file path, asset URL, or data URI" },
          "name": { "type": "string", "description": "Scene name or feature descriptor" },
          "type": { "type": "string", "enum": ["image", "video", "blank", "3d"] }
        },
        "required": ["url"]
      },
      "description": "List of media sources to sequence in the animation"
    },
    "preset": {
      "type": "string",
      "enum": ["launch-teaser", "product-walkthrough", "social-reel"],
      "default": "launch-teaser",
      "description": "Narrative pacing archetype"
    },
    "theme": {
      "type": "string",
      "enum": ["dark-monolith", "linear-speed", "stripe-clean", "apple-minimal"],
      "default": "dark-monolith",
      "description": "Aesthetic visual theme and background gradient"
    },
    "aspectRatio": {
      "type": "string",
      "enum": ["16:9", "9:16", "1:1", "4:5", "21:9"],
      "default": "16:9"
    },
    "autoExport": {
      "type": "boolean",
      "default": false,
      "description": "Whether the project should trigger headless export immediately upon load"
    }
  },
  "required": ["title"]
}
```

#### Output
Returns:
- `project`: Complete `ZetashotSharedProject` JSON payload.
- `hash`: Compact base64url compressed `#project=` string.
- `deepLinkUrl`: Instant 1-click preview URL (`http://localhost:5173/#project=...`).
- `summary`: Human-readable sequence breakdown.

---

### Tool 2: `compose_interest_regions`
**Vision-Driven Auto-Composition**: Automatically calculates exact `panX`, `panY`, `zoom`, and counter-banked `rotY`/`rotZ` Hermite waypoints to center detected UI bounding boxes/landmarks without manual coordinate guessing, attaching synchronized telemetry pill badges (`pop` or `fade-in-blur`) to each region.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "regions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string", "description": "Landmark name (e.g. 'Revenue Chart', 'Sidebar')" },
          "x": { "type": "number", "description": "X coordinate (0..100 percentage or 0..960 stage pixels)" },
          "y": { "type": "number", "description": "Y coordinate (0..100 percentage or 0..540 stage pixels)" },
          "width": { "type": "number", "description": "Bounding box width" },
          "height": { "type": "number", "description": "Bounding box height" },
          "holdDuration": { "type": "number", "description": "Dwell duration in seconds at this landmark" },
          "badgeText": { "type": "string", "description": "Custom text for telemetry badge overlay" }
        },
        "required": ["x", "y", "width", "height"]
      }
    },
    "aspectRatio": { "type": "string", "enum": ["16:9", "9:16", "1:1", "4:5", "21:9"], "default": "16:9" },
    "pacing": { "type": "string", "enum": ["snappy", "cinematic", "editorial"], "default": "cinematic" },
    "title": { "type": "string" },
    "mediaUrl": { "type": "string" },
    "deviceMockup": { "type": "string" },
    "background": { "type": "string" },
    "autoExport": { "type": "boolean", "default": true }
  },
  "required": ["regions"]
}
```

---

### Tool 3: `configure_timeline_clips`
**Multi-Clip Sequencer & Timeline Surgery**: Sequences multiple media clips (images, videos, 3D assets, blank canvases) contiguously with automatic playback speed compensation ($0.1x\dots 8.0x$), razor trimming, and cinematic transitions (`cut`, `gradient`, `blocks`, `fade`, `push`, `zoom`).

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "clips": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sourceUrl": { "type": "string" },
          "type": { "type": "string", "enum": ["image", "video", "3d", "blank"] },
          "name": { "type": "string" },
          "duration": { "type": "number" },
          "playbackSpeed": { "type": "number" },
          "trimStart": { "type": "number" },
          "trimEnd": { "type": "number" },
          "transitionIn": { "type": "string", "enum": ["cut", "gradient", "blocks", "fade", "push", "zoom"] },
          "transitionDuration": { "type": "number" }
        },
        "required": ["sourceUrl"]
      }
    },
    "autoCompensateSpeed": { "type": "boolean", "default": true },
    "title": { "type": "string" },
    "aspectRatio": { "type": "string" },
    "deviceMockup": { "type": "string" },
    "background": { "type": "string" }
  },
  "required": ["clips"]
}
```

---

### Tool 4: `orchestrate_typography`
**Kinetic Typography & Telemetry Badge Layer**: Coordinates 3D vector text overlays, hero title cards, and glowing telemetry badges across granular animation scopes (`all`, `word`, `char`, `line`).

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "overlays": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "font": { "type": "string", "enum": ["SF Pro Display", "Sora", "Helvetica", "Poppins", "Geist"] },
          "startTime": { "type": "number" },
          "endTime": { "type": "number" },
          "duration": { "type": "number" },
          "animation": { "type": "string", "enum": ["fade", "fade-in-blur", "pop", "scale", "slide-up", "slide-down", "scramble", "shimmer", "roll"] },
          "scope": { "type": "string", "enum": ["all", "word", "char", "line"] },
          "style": { "type": "string", "enum": ["title-card", "telemetry-pill", "metric-counter", "subtitle"] },
          "position3D": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" }, "z": { "type": "number" } } },
          "accentGlowHex": { "type": "string" },
          "fontSize": { "type": "number" },
          "color": { "type": "string" }
        },
        "required": ["text", "startTime"]
      }
    },
    "projectHash": { "type": "string" },
    "title": { "type": "string" }
  },
  "required": ["overlays"]
}
```

---

### Tool 5: `sync_sound_design`
**Frame-Accurate Audio & SFX Sync**: Automatically aligns BGM soundtrack alongside derivative velocity peak whooshes on Hermite curve transitions, sub-drops on monolith reveals, pops on badge entries, and chimes on landing resolves.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "bgmTrack": { "type": "string", "enum": ["lofi-ambient", "cinematic-saas", "modern-tech", "none"] },
    "bgmVolume": { "type": "number", "default": 0.6 },
    "autoSyncSfx": { "type": "boolean", "default": true },
    "projectHash": { "type": "string" },
    "timelineDuration": { "type": "number" }
  }
}
```

---

### Tool 6: `configure_optics_and_3d`
**Optics, Lighting & WebGL Material Controller**: Fine-tunes realistic Depth of Field blur, specular edge glow, drop shadow parameters, corner squircle radius, and Three.js WebGL material properties (roughness, metalness, tint, repeat, flipY).

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "dof": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "aperture": { "type": "number" },
        "focusTargetKeyframe": { "type": "string" }
      }
    },
    "specularGlow": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "autoExtractDominantColor": { "type": "boolean" },
        "hexOverride": { "type": "string" }
      }
    },
    "shadow": {
      "type": "object",
      "properties": {
        "blur": { "type": "number" },
        "spread": { "type": "number" },
        "opacity": { "type": "number" },
        "yOffset": { "type": "number" }
      }
    },
    "cornerRadius": { "type": "number" },
    "webglMaterial": {
      "type": "object",
      "properties": {
        "roughness": { "type": "number" },
        "metalness": { "type": "number" },
        "tintHex": { "type": "string" },
        "textureRepeat": { "type": "array", "items": { "type": "number" } },
        "flipY": { "type": "boolean" }
      }
    },
    "projectHash": { "type": "string" }
  }
}
```

---

### Tool 7: `render_motion_graphics_video`
Executes headless rendering of the generated motion graphics video to MP4 or WebM.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "projectHash": {
      "type": "string",
      "description": "Base64url project hash generated by any Zetashot MCP tool"
    },
    "format": { "type": "string", "enum": ["mp4", "webm"], "default": "mp4" },
    "fps": { "type": "number", "enum": [24, 30, 60], "default": 60 },
    "outputPath": { "type": "string" }
  },
  "required": ["projectHash", "outputPath"]
}
```

---

## 7. CLI Execution & Automation

The companion generator script can be executed directly from any shell or automation script:

```bash
# Generate a 15-second Launch Teaser with 2 scenes
node .agents/skills/motion-graphics-mcp/scripts/generate_motion_graphics.mjs \
  --title "Next-Gen Analytics Engine" \
  --sources "./assets/dashboard.png,./assets/telemetry.png" \
  --preset "launch-teaser" \
  --theme "dark-monolith" \
  --output "./exports/launch_project.json"

# Generate a 9:16 Kinetic Social Reel
node .agents/skills/motion-graphics-mcp/scripts/generate_motion_graphics.mjs \
  --title "Keyboard Speed" \
  --sources "./assets/mobile_app.png" \
  --preset "social-reel" \
  --aspectRatio "9:16" \
  --theme "linear-speed"
```

---

## 8. Verified Reference Project Schema

A valid `ZetashotSharedProject` object conforms to:

```typescript
export interface ZetashotSharedProject {
  version: string;                    // "1.2.0"
  title?: string;                     // Project display name
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  duration?: number;                  // Total sequence duration in seconds
  background?: BackgroundConfig;      // Gradients, solid, or glass
  deviceMockup?: string;              // 'mac-safari', 'iphone-pro', 'frameless'
  mediaUrl?: string;                  // Primary fallback media URL
  mediaType?: 'image' | 'video' | '3d' | 'blank';
  mediaName?: string;
  cameraClips?: TimelinePositionClip[]; // 7-DOF camera waypoints
  textLayers?: TextLayerOverlay[];    // Typography overlays
  mediaClips?: MediaTimelineClip[];   // Multi-clip sequence items
  autoExport?: boolean;               // Headless export flag
}
```
