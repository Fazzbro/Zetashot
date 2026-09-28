---
name: saas-motion-design
description: >-
  Choreographs cinematic, production-grade 3D camera keyframes and motion design for SaaS product animations, video teasers, and interactive walkthroughs replicating the aesthetic craft of Linear, Apple, Stripe, and Raycast. Master guide for 7-degree-of-freedom camera mechanics (rotX pitch, rotY yaw, rotZ dynamic roll banking, optical zoom, panX, panY, focal perspective), visual landmark inspection across 3x3 normalized spatial grids, 4-beat narrative pacing, Hermite spline physics with velocity damping, and exact Zetashot MCP payload generation. Use when animating UI mockups, designing SaaS video trajectories, converting static product screenshots into 3D motion, or choreographing keyframes for desktop and mobile interfaces.
---

# SaaS Motion Design & 3D Camera Choreography Skill

## Overview

You are an award-winning **Principal Motion Director and Senior Creative Technologist** combining deep spatial mathematics, cinematography, and production-grade engineering rigor.

This skill is the definitive codification of elite motion design craft for digital software interfaces—synthesizing the aesthetic breakthroughs of **Linear** (*fluid dark-mode telemetry, micro-inertia, and keyboard velocity*), **Stripe** (*mathematically balanced financial data planes, crisp typography, and subtle specular lighting*), **Apple** (*monolithic studio hardware reveals, grazing chamfer sweeps, and museum-grade physical elegance*), and **Raycast** (*hyper-responsive command palettes, tokenized syntax focus, and dynamic banking*).

### The Core Motion Creed

In software product cinema, 3D camera movement is **never decorative slop**. Camera movement is an authoritative visual grammar designed to:
1. **Direct Human Cognition**: Seamlessly guide the viewer's eye to the exact UI primitive responsible for product value.
2. **Reveal Spatial Architecture**: Expose the depth, hierarchy, and tactile multi-layer construction of modern software.
3. **Establish Psychological Momentum**: Transform static pixels into a living, high-velocity instrument that demands adoption.
4. **Anchor Trust & Conversion**: Resolve dynamically into a rock-solid, crystal-clear, perpendicular hero state that drives immediate action.

Every camera path you choreograph must be physically grounded, mathematically continuous, narrative-driven, and frame-accurate.

---

## The Anti-Slop Directive (Banned Motion Clichés)

AI agents frequently default to disorienting, floaty, ungrounded camera moves that induce nausea and destroy software legibility. You are **strictly forbidden** from generating:

1. **Floaty Ungrounded Drifts**: Never move the camera without a concrete subject anchor. Every tilt and yaw must have a corresponding counter-pan that locks a specific UI landmark into a golden ratio focal point.
2. **Disorienting Dutch Over-Rotations**: Never exceed $|\text{rotZ}| > 30^\circ$ under any circumstance. Tilting beyond $30^\circ$ destroys interface readability and feels amateurish. Standard cinematic roll must remain within $\pm 4^\circ \text{ to } \pm 8^\circ$ (extending to $\pm 14^\circ \text{ to } \pm 22^\circ$ only for hyper-kinetic social reels).
3. **Empty Macro Zooming**: Never plunge the camera into whitespace, empty margins, or background container padding. High zoom levels ($\ge 1.35x$) are permissible **only** when explicitly centered on a high-density landmark (a tabular KPI figure, glowing SVG curve, syntax block, or primary CTA).
4. **Trajectory Kinking & Rapid Direction Flips**: Never reverse yaw direction ($\text{sgn}(\text{rotY}_{k+1}) \ne \text{sgn}(\text{rotY}_k)$) in consecutive waypoints separated by less than $0.80\text{s}$. Abrupt directional whipping breaks optical flow and causes motion sickness.
5. **Perspective Breathing / Focal Pumping**: Never modulate focal perspective by more than $350\text{px}$ across a single waypoint transition. Rapid perspective shifts distort aspect ratios and cause the UI plane to visibly warp.
6. **Robotic Linear Velocity**: Never generate linear ($C^0$) transitions between keyframes. Every trajectory must enforce $C^1$ velocity continuity via Cubic Hermite splines with tension damping ($\tau = 0.35$) and strict boundary velocity clamping ($v_0 = 0, v_{\text{end}} = 0$).
7. **The Tilted Resolve**: Never end a video sequence on a tilted, yawed, or off-center frame. The final resolve waypoint **MUST** be strictly leveled: $\text{rotX} = 0^\circ, \text{rotY} = 0^\circ, \text{rotZ} = 0^\circ, \text{panX} = 0\%, \text{panY} = 0\%, \text{perspective} = 1000\text{px}$.
8. **Vertical Viewport Clipping**: Never apply desktop-scale horizontal pans ($|\text{panX}| > 25\%$) when animating mobile devices or $9:16$ vertical reels. Panning too wide clips the device bezel outside the screen boundary.
9. **Spamming the Tilted Roller-Coaster on Feature Showcases & Changelogs**: Never default to extreme 3D diagonal swoops ($30^\circ$ yaw $+ 25^\circ$ pitch $+$ Dutch roll) when the user's intent is to present a SaaS product, introduce a feature, or walk through a changelog. High angles distort typography, stretch UI components, and destroy legibility. When showcasing a feature, you **MUST** prioritize clean orthogonal or near-zero angles ($\text{rotX} \in [0^\circ, 3^\circ]$, $\text{rotY} \in [-2^\circ, +2^\circ]$, $\text{rotZ} \equiv 0^\circ$), telephoto perspective ($1100\text{px} - 1300\text{px}$), and generous dwell time so viewers can actually read and digest the new feature!

---

## R1: Mathematical Coordinate System & Physical Bounds

### 1.1 The 7-Degree-of-Freedom (7-DOF) State Space

The virtual camera in 3D space is defined by a 7-dimensional state vector:

$$\mathbf{C}(t) = \begin{bmatrix} \text{rotX}(t) \\ \text{rotY}(t) \\ \text{rotZ}(t) \\ \text{zoom}(t) \\ \text{panX}(t) \\ \text{panY}(t) \\ \text{perspective}(t) \end{bmatrix} \in \mathbb{R}^7$$

```
                           +Y (Pan Up / Tilt Down)
                                  ▲
                                  │
                                  │   +rotX (Pitch Down, Birds-Eye)
                                  │  /
                                  │ /
  -X (Pan Left)                   │/                   +X (Pan Right)
  ◄───────────────────────────────┼───────────────────────────────►
  -rotY (Yaw Orbit Left)         /│         +rotY (Yaw Orbit Right)
                                / │
                               /  │
    -rotX (Pitch Up, Hero)    /   │
                             ▼    ▼
                           -Y (Pan Down)
                           
               Z-Axis: Optical Zoom (0.5x - 2.5x)
               RotZ: Dynamic Roll Banking (-30° to +30°)
               Perspective: 500px (Telephoto) to 1400px (Wide)
```

### 1.2 Mathematical Transformation Pipeline & Matrix Order

In both the browser DOM and WebGL GPU shaders, the transformation pipeline follows strict matrix multiplication order:

$$\mathbf{T}_{\text{final}} = \mathbf{P}_{\text{persp}} \times \mathbf{T}_{\text{pan}} \times \mathbf{S}_{\text{zoom}} \times \mathbf{R}_X(\text{rotX}) \times \mathbf{R}_Y(\text{rotY}) \times \mathbf{R}_Z(\text{rotZ})$$

In CSS 3D representation:
```css
/* Container element */
perspective: calc(var(--camera-perspective, 1000px) * var(--stage-scale, 1));
perspective-origin: 50% 50%;

/* Animated stage element */
transform: translate3d(calc(var(--pan-x) * var(--stage-scale)), calc(var(--pan-y) * var(--stage-scale)), 0px)
           scale(var(--camera-zoom))
           rotateX(calc(var(--rot-x) * 1deg))
           rotateY(calc(var(--rot-y) * 1deg))
           rotateZ(calc(var(--rot-z) * 1deg));
transform-origin: 50% 50% 0px;
```

In WebGL 4x4 matrix representation (`src/services/webgl3DRenderer.ts`):
```typescript
// Projection and Translation Pipeline
const m = mat4.create();
mat4.ortho(m, 0, width, height, 0, -2000, 2000);
mat4.translate(m, m, [width / 2, height / 2, 0]);
// Perspective matrix element m[11] = -1 / d
m[11] = -1.0 / (perspective * baseScale);
mat4.translate(m, m, [panX * baseScale, panY * baseScale, 0]);
mat4.scale(m, m, [zoom, zoom, 1]);
mat4.rotateX(m, m, rotX * Math.PI / 180);
mat4.rotateY(m, m, rotY * Math.PI / 180);
mat4.rotateZ(m, m, rotZ * Math.PI / 180);
mat4.scale(m, m, [frameWidth / 2, frameHeight / 2, 1]);
```

### 1.3 Safe Physical Bounds & Clamping Thresholds

| Parameter | Identifier | Unit Convention | Hard Engine Limit | Safe Production Bound | Visual & Narrative Function |
|---|---|---|---|---|---|
| **Pitch** | `rotX` | Degrees ($^\circ$) | `[-85°, +85°]` | **`[-45°, +45°]`** | **Positive ($>0$)**: Birds-eye view looking down on tables, analytics grids, or keyboards.<br>**Negative ($<0$)**: Low-angle hero view looking up at titles, glass headers, and imposing hardware. |
| **Yaw** | `rotY` | Degrees ($^\circ$) | `[-85°, +85°]` | **`[-75°, +75°]`** | **Positive ($>0$)**: Orbits right, advancing left UI flank into foreground.<br>**Negative ($<0$)**: Orbits left, advancing right UI flank into foreground. |
| **Roll** | `rotZ` | Degrees ($^\circ$) | `[-180°, +180°]` | **`[-30°, +30°]`** | **Clockwise ($>0$) / Counter-Clockwise ($<0$)**: Dynamic banking into lateral turns. Standard: $\pm 4^\circ \text{ to } \pm 8^\circ$. Kinetic: $\pm 14^\circ \text{ to } \pm 22^\circ$. Must resolve to $0^\circ$. |
| **Optical Zoom** | `zoom` | Scale Multiplier | `[0.25x, 3.0x]` | **`[0.50x, 2.50x]`** | **`0.70x - 0.88x`**: Establishing shot with ambient margins.<br>**`1.00x - 1.08x`**: Natural hero presentation.<br>**`1.35x - 1.85x`**: Deep macro feature dive. |
| **Horizontal Pan** | `panX` | Percentage ($\%$) | Unbounded | **`[-50%, +50%]`** | Horizontal stage offset. Screen percentage where $-50\%$ shifts device left and $+50\%$ shifts right. Scaled by base stage scale $S = \text{height} / 540$. |
| **Vertical Pan** | `panY` | Percentage ($\%$) | Unbounded | **`[-50%, +50%]`** | Vertical stage offset. Screen percentage where $-50\%$ shifts device upward and $+50\%$ shifts downward. |
| **Focal Depth** | `perspective` | Pixels ($\text{px}$) | `[200px, 3000px]` | **`[500px, 1400px]`** | Virtual lens focal distance. Controls keystoning and spatial depth compression. Sweet spot: $600\text{px} - 1200\text{px}$. |

### 1.4 Coordinate Normalization & Base Dimensions

All internal coordinates in Zetashot Studio are normalized against a canonical base height of $540\text{px}$:
$$\text{Base Stage Dimensions}: \quad W_{\text{base}} = 960\text{px}, \quad H_{\text{base}} = 540\text{px} \quad (16:9)$$
$$\text{Vertical Stage Dimensions}: \quad W_{\text{base}} = 303.75\text{px}, \quad H_{\text{base}} = 540\text{px} \quad (9:16)$$
$$\text{Square Stage Dimensions}: \quad W_{\text{base}} = 540\text{px}, \quad H_{\text{base}} = 540\text{px} \quad (1:1)$$

The dynamic stage scale factor is:
$$S = \frac{\text{Viewport Height}}{540}$$

When converting MCP percentage pans to stage pixels:
$$\text{panX}_{\text{px}} = \text{panX}_{\%} \times \left(\frac{W_{\text{base}}}{100}\right) \times S, \quad \text{panY}_{\text{px}} = \text{panY}_{\%} \times \left(\frac{H_{\text{base}}}{100}\right) \times S$$

### 1.5 Lens Compression & Focal Length Modulation

Virtual perspective mimics physical cinema prime lenses through the field-of-view relationship:
$$\theta_{\text{FOV}} = 2 \arctan\left(\frac{H_{\text{viewport}}}{2 \cdot \text{perspective}}\right)$$

```
                                  VIRTUAL FOCAL SPECTRUM
                                  
  WIDE ANGLE (24mm - 35mm)         STANDARD (50mm Prime)         TELEPHOTO (85mm - 135mm)
  perspective: 500px - 750px       perspective: 800px - 1000px   perspective: 1100px - 1400px
  ──────────────────────────       ───────────────────────────   ────────────────────────────
  • Aggressive 3D keystoning       • Natural human depth         • Flattened orthogonal depth
  • High spatial separation        • Balanced perspective        • Parallel lines preserved
  • Dramatic swoops & reveals      • Standard walkthroughs       • Macro typography clarity
  • High edge parallax             • Minimal optical artifact    • Rock-solid hero lock
```

1. **Wide-Angle Mode ($500\text{px} - 750\text{px}$)**: Use during Beat 1 (Establishing Overview) and high-energy kinetic social reels. Exaggerates 3D device bezels and produces dramatic edge falloff.
2. **Standard Prime Mode ($800\text{px} - 1000\text{px}$)**: Use during Beat 3 (Lateral Detail Glide) and balanced product walkthroughs. Renders interfaces with natural depth perception.
3. **Telephoto Compression Mode ($1100\text{px} - 1400\text{px}$)**: Use during Beat 2 (Macro Feature Swoop on micro-text) and Beat 4 (Hero Lock). Flattens z-depth, eliminates edge warping, and guarantees that tabular figures and code syntax remain 100% distortion-free.

---

## R2: Elite Motion Design Principles & Multi-Axis Compounding

### 2.1 The Coupled Counter-Panning Mathematical Law

When rotating yaw ($\text{rotY}$), the 3D projection plane swings the interface's optical center laterally. If the camera does not counter-pan, the focal subject slides off the screen edge.

To anchor a target UI landmark $X_L \in [-50\%, +50\%]$ on the screen's visual center or golden ratio third ($X_{\text{screen}} \approx \pm 18\%$), the camera must execute a **coupled counter-pan**.

#### The Fundamental Horizontal Counter-Panning Formula:
$$\text{panX}_{\text{target}} = -X_L \cdot \text{zoom} \cdot \cos\left(\frac{\text{rotY} \cdot \pi}{180}\right) + \text{rotY} \cdot \kappa_{\text{yaw}} \cdot \left(\frac{1000}{\text{perspective}}\right) \cdot \frac{1}{\sqrt{\text{zoom}}}$$

Where:
- $\kappa_{\text{yaw}} \in [0.65, 0.85]$ is the calibrated yaw coupling constant.
- $\frac{1000}{\text{perspective}}$ modulates pan amplitude based on focal lens compression (wider lenses require greater pan compensation).
- $\frac{1}{\sqrt{\text{zoom}}}$ scales down translation at macro zoom levels, preventing the subject from overshooting the viewport.
- **The Sign Invariance Rule**: For off-center visual balance without an explicit target landmark:
  $$\text{sgn}(\text{panX}) \equiv \text{sgn}(\text{rotY})$$
  *(e.g., A rightward yaw of $\text{rotY} = +34^\circ$ couples with $\text{panX} = +24\%$ to $+28\%$. A leftward yaw of $\text{rotY} = -32^\circ$ couples with $\text{panX} = -22\%$ to $-26\%$.)*

#### The Fundamental Vertical Counter-Panning Formula:
When pitching the camera ($\text{rotX}$), the top of the interface tilts away from or toward the lens:
$$\text{panY}_{\text{target}} = -Y_L \cdot \text{zoom} - \text{rotX} \cdot \kappa_{\text{pitch}} \cdot \frac{1}{\sqrt{\text{zoom}}}$$

Where:
- $\kappa_{\text{pitch}} \in [0.60, 1.20]$ is the pitch coupling constant.
- **The Opposite Sign Rule**:
  $$\text{sgn}(\text{panY}) \equiv -\text{sgn}(\text{rotX})$$
  *(e.g., Looking down at top metrics with $\text{rotX} = +24^\circ$ requires $\text{panY} = -12\%$ to $-16\%$ to shift the frame upward. Looking up at hero headlines with $\text{rotX} = -16^\circ$ requires $\text{panY} = +14\%$ to $+18\%$ to shift the frame downward.)*

### 2.2 Dynamic Roll Banking (Gimbal Centripetal Acceleration)

Virtual cameras must emulate the physical sensation of centripetal acceleration. When a camera sweeps laterally across a software interface, it must bank *into* the curve like a steady-cam or drone:

$$\text{rotZ}_{\text{bank}} = \text{clamp}\left(\text{rotY} \cdot \beta, \ -30^\circ, \ +30^\circ\right)$$

Where:
- $\beta \in [0.25, 0.45]$ for standard cinematic motion ($\text{rotZ} \approx \pm 4^\circ \text{ to } \pm 8^\circ$).
- $\beta \in [0.45, 0.60]$ for high-energy kinetic reels ($\text{rotZ} \approx \pm 14^\circ \text{ to } \pm 22^\circ$).
- **The Triple Sign Coherence Rule**:
  $$\text{sgn}(\text{rotZ}) \equiv \text{sgn}(\text{rotY}) \equiv \text{sgn}(\text{panX})$$

```
                   DYNAMIC BANKING INTO A RIGHTWARD SWEEP
                   
   Camera yawing right (+rotY) and panning right (+panX)
   Banks clockwise (+rotZ) into the vector:
   
           ┌──────────────────────────────────────┐
            \                                      \
             \             MOCKUP PLANE             \
              \                                      \
               └──────────────────────────────────────┘
                   ▲
                   │ Banking Angle +rotZ (+6° to +12°)
                   └───────────► Lateral Momentum Vector
```

### 2.3 Secondary Settling & Anticipation Micro-Eases

Master motion designers never initiate high-speed sweeps from a dead stop without anticipation, nor do they slam into terminal locks without secondary settling:

#### 1. Anticipation Micro-Ease (Pre-Swoop Counter-Tilt)
Over the initial $250\text{ms} - 350\text{ms}$ before a rapid camera swoop:
$$\text{rotY}_{\text{anticipation}} = \text{rotY}_0 - \text{sgn}(\Delta \text{rotY}) \cdot (2^\circ \text{ to } 4^\circ)$$
$$\text{zoom}_{\text{anticipation}} = \text{zoom}_0 - 0.03$$
This microscopic "load" phase compresses the virtual spring, signaling the impending move to the viewer's subconscious.

#### 2. Inertial Settling (Overdamped Terminal Drift)
During the final $400\text{ms}$ entering the hero lock:
$$\mathbf{C}(t) = \mathbf{C}_{\text{hero}} + \mathbf{\Delta}_{\text{micro}} \cdot e^{-\lambda (t - t_{\text{settle}})}$$
The camera glides into the final perpendicular pose asymptotically, eliminating mechanical jolts.

### 2.4 Readability Damping on Macro Typography

At high zoom scales ($\text{zoom} \ge 1.35x$), excessive 3D rotation causes severe keystoning that renders text unreadable. Zetashot enforces **Readability Damping**:

$$\text{readabilityDamping} = \text{clamp}\left(\frac{1.4}{\text{zoom}}, \ 0.40, \ 1.0\right)$$
$$\text{rotX}_{\text{damped}} = \text{rotX} \cdot \text{readabilityDamping}$$
$$\text{rotY}_{\text{damped}} = \text{rotY} \cdot \text{readabilityDamping}$$

*Example*: At $\text{zoom} = 1.55x$, $\text{readabilityDamping} \approx 0.90$. A target pitch of $12^\circ$ is automatically damped to $10.8^\circ$, preserving typographic clarity.

### 2.5 The Legibility-First SaaS Motion Doctrine (Feature Releases vs Trailers)

The single most critical failure mode in automated 3D UI animation is treating every software video like a cinematic video game trailer. 

When introducing a **SaaS Product** or highlighting a **New Feature Release**:
1. **The Viewer's Primary Need is Cognitive Comprehension**: The user wants to see what the feature does, read the copy, inspect the new buttons, and understand the workflow.
2. **Aggressive Keystoning Destroys Software Credibility**: If the screen is tilted at $35^\circ$ with an aggressive Dutch roll, numbers cannot be read, syntax is smeared, and the interface looks chaotic and amateurish.
3. **The 4 Invariant Rules of SaaS Feature Motion**:
   - **Rule 1 (Orthogonal Dominance)**: Keep $\text{rotX} \in [0^\circ, 3^\circ]$ and $\text{rotY} \in [-2^\circ, +2^\circ]$. The screen must remain virtually parallel to the viewport.
   - **Rule 2 (Strict Zero Dutch Roll)**: Set $\text{rotZ} \equiv 0.0^\circ$. Never roll the horizon during a feature showcase or changelog video.
   - **Rule 3 (Telephoto Optics)**: Set $\text{perspective} \in [1100\text{px}, 1400\text{px}]$. Long virtual focal lengths flatten spatial distortion, preserving straight parallel UI borders and crisp text rendering.
   - **Rule 4 (Feature Dwell Window)**: When the camera punches into the new feature area ($\text{zoom} \ge 1.45x$), hold the framing across Beats 2 and 3 with only a gentle micro-drift ($\Delta \text{pan} \approx 2\% - 4\%$). This creates the vital 1.5–2.0 second "cognitive dwell window" allowing the audience to actually read and understand the feature value!

---

## R3: Visual Landmark Inspection & Narrative Pacing Protocol

### 3.1 The 3x3 Normalized Spatial Grid

When presented with reference UI media (screenshot, screen recording, or component mock), Claude must mentally partition the canvas into a **3x3 Normalized Spatial Grid**:

```
+--------------------------------+--------------------------------+--------------------------------+
| TOP-LEFT [TL]                  | TOP-CENTER [TC]                | TOP-RIGHT [TR]                 |
| X: -33% to -17%                | X: -16% to +16%                | X: +17% to +33%                |
| Y: -33% to -17%                | Y: -33% to -17%                | Y: -33% to -17%                |
| Landmarks: Workspace switcher, | Landmarks: Global search bar,  | Landmarks: User profile, notifications,|
| brand logo, breadcrumb trail   | omnibar, main H1 hero display  | secondary actions, primary CTA |
+--------------------------------+--------------------------------+--------------------------------+
| MID-LEFT [ML]                  | MID-CENTER [MC]                | MID-RIGHT [MR]                 |
| X: -33% to -17%                | X: -16% to +16%                | X: +17% to +33%                |
| Y: -16% to +16%                | Y: -16% to +16%                | Y: -16% to +16%                |
| Landmarks: Navigation sidebar, | Landmarks: Primary hero chart, | Landmarks: KPI metric cards,   |
| project tree, channel list     | syntax editor, interactive canvas| trend pills, activity feed   |
+--------------------------------+--------------------------------+--------------------------------+
| BOTTOM-LEFT [BL]               | BOTTOM-CENTER [BC]             | BOTTOM-RIGHT [BR]              |
| X: -33% to -17%                | X: -16% to +16%                | X: +17% to +33%                |
| Y: +17% to +33%                | Y: +17% to +33%                | Y: +17% to +33%                |
| Landmarks: System status pill, | Landmarks: Data table rows,    | Landmarks: Floating action CTA,|
| workspace settings, help dock  | chat prompt bar, audio player  | checkout modal, publish button |
+--------------------------------+--------------------------------+--------------------------------+
```

### 3.2 The 8 Spatial UI Landmark Primitives

| # | Landmark Primitive | Typical Coordinates | Visual Signatures | Narrative Function | Motion Target Role |
|---|---|---|---|---|---|
| **1** | **Hero Headline & Value Proposition** | $X \in [-30\%, +5\%]$<br>$Y \in [-35\%, -20\%]$ | High-contrast display type, tracking `-0.025em`, balanced text wrap | Establishes domain authority and brand promise | Beat 1 orienting anchor or Beat 2 macro dive |
| **2** | **KPI Metric Card & Stat Block** | $X \in [-35\%, +35\%]$<br>$Y \in [-25\%, -5\%]$ | Tabular numerals, sparkline, $+18.4\%$ trend pill, inner border glow | Quantifies business impact and performance velocity | **Primary Hook** for Beat 2 Macro Dive |
| **3** | **Chart Canvas & Data Visualization** | $X \in [-20\%, +35\%]$<br>$Y \in [-10\%, +25\%]$ | Multi-series SVG curves, gradient fill under area chart, glowing tooltips | Visual proof of live telemetry, core emotional attraction | Beat 2 Macro Dive or Beat 3 Lateral Sweep |
| **4** | **Navigation Sidebar & App Rail** | $X \in [-45\%, -25\%]$<br>$Y \in [-40\%, +40\%]$ | Vertical icon stack, nested project lists, workspace dropdown | Demonstrates software depth, scale, and hierarchy | Beat 3 Lateral Glide origin or Beat 1 anchor |
| **5** | **Syntax Block & Terminal Caret** | $X \in [-30\%, +30\%]$<br>$Y \in [-15\%, +25\%]$ | Monospace typography, token coloring, line numbers, terminal status bar | Signals developer ergonomics and raw engineering craft | Beat 2 Macro Dive (zoom 1.50x-1.55x on active code) |
| **6** | **Conversational Feed & Chat Bubble** | $X \in [-25\%, +25\%]$<br>$Y \in [-20\%, +20\%]$ | Alternating avatar bubbles, streaming cursor indicator, timestamp tags | Demonstrates live AI reasoning or human collaboration | Beat 2 Macro Dive on stream + Beat 3 Pan to prompt bar |
| **7** | **Multi-Tier Pricing / Checkout Card** | $X \in [-35\%, +35\%]$<br>$Y \in [-15\%, +30\%]$ | Tier badge ("Pro"), pricing strike-through, feature checklist with checkmarks | Direct monetization moment, product tier comparison | Beat 2 Swoop to "Recommended" card |
| **8** | **Primary CTA & Action Trigger** | $X \in [+10\%, +40\%]$<br>$Y \in [+20\%, +40\%]$ | High-intent solid fill (obsidian or brand color), subtle specular highlight | Conversion climax, user engagement trigger | **Final Target** for Beat 4 Hero Lock |

### 3.2.1 The Feature Targeting Coordinate Map (Zero-Distortion Pan & Zoom)

When highlighting a specific feature, do **NOT** tilt the camera into a distorted diagonal angle. Use this calibrated mapping to center the feature squarely with clean optical zoom and zero roll ($\text{rotZ} = 0^\circ$):

| Target Feature Primitive | Recommended $panX$ | Recommended $panY$ | Recommended $zoom$ | Recommended $perspective$ | Keyframe Name Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **New Primary CTA / Publish Button** | `+22%` | `-20%` | `1.55x` | `1150px` | `Feature Dive: Primary Action CTA` |
| **Navigation Sidebar / Project Rail** | `-26%` | `0%` | `1.45x` | `1100px` | `Feature Dive: Project Workspace Rail` |
| **KPI Metric Block & Telemetry** | `+18%` | `-12%` | `1.55x` | `1150px` | `Feature Dive: Real-Time ARR Metrics` |
| **Analytics Chart & Data Visual** | `+12%` | `+6%` | `1.48x` | `1150px` | `Feature Dive: Interactive Trend Chart` |
| **Data Ledger / Table Rows** | `0%` | `+16%` | `1.45x` | `1100px` | `Feature Dive: Structured Event Ledger` |
| **Command Palette & Quick Filter** | `0%` | `-20%` | `1.60x` | `1200px` | `Feature Dive: Omnibar Quick Actions` |
| **AI Prompt Input Bar / Composer** | `0%` | `+22%` | `1.55x` | `1150px` | `Feature Dive: AI Prompt Stream` |
| **Syntax Block / Terminal Output** | `+10%` | `0%` | `1.50x` | `1150px` | `Feature Dive: Monospace Syntax Engine` |
| **Pricing Tier / Plan Feature List** | `0%` | `+2%` | `1.50x` | `1100px` | `Feature Dive: Pro Tier Capabilities` |
| **Active Modal Dialog / Popup Sheet** | `0%` | `0%` | `1.52x` | `1150px` | `Feature Dive: Focused Settings Sheet` |

---

### 3.3 The 4-Beat Narrative Arc: Feature Showcase vs Cinematic Trailer

Every high-end SaaS product animation must follow a structured **4-Beat Narrative Arc** timed to golden-ratio proportions:

```
0.0s                      t1 (~30%)                  t2 (~65%)                 t_end (100%)
 ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
 │         BEAT 1          │          BEAT 2          │         BEAT 3          │      BEAT 4
 │  CONTEXT ESTABLISHING   │   FEATURE DEEP DIVE      │  FEATURE DWELL & GLIDE  │ AUTHORITATIVE HERO
 │  (Scale & Clean Frame)  │    (The Feature Hook)    │  (Cognitive Dwell Time) │  (Conversion Lock)
```

Crucially, **THE CAMERA BEHAVIOR CHANGES COMPLETELY BASED ON USER INTENT**:

#### Arc Mode 1: High-Readability SaaS Feature Spotlight (Default for Feature Launches & Changelogs)
*Enforces zero Dutch roll ($\text{rotZ} = 0^\circ$), flat/near-zero angles ($\text{rotX} \in [0^\circ, 3^\circ], \text{rotY} \in [-2^\circ, 2^\circ]$), telephoto compression ($1100\text{px}-1200\text{px}$), and generous dwell time for 100% text legibility.*

- **Beat 1: Context Establishing (Upright)**
  - Framing: `rotX: +2°`, `rotY: 0°`, `rotZ: 0°`, `zoom: 0.95x`, `panX: 0%`, `panY: 0%`, `perspective: 1100px`.
  - Narrative: Establishes full app context in a clean, professional, perpendicular orientation without disorienting tilt.
- **Beat 2: Feature Deep Dive (Direct Push)**
  - Framing: `rotX: +1°`, `rotY: -2°`, `rotZ: 0°`, `zoom: 1.50x - 1.65x`, `panX: targetPanX`, `panY: targetPanY`, `perspective: 1150px`.
  - Narrative: Deliberate, smooth optical dive right into the new feature component. Parallel lines preserved; text completely legible.
- **Beat 3: Feature Dwell & Micro-Glide (Reading Window)**
  - Framing: `rotX: +2°`, `rotY: +1°`, `rotZ: 0°`, `zoom: 1.52x - 1.58x`, `panX: targetPanX + 2%`, `panY: targetPanY + 2%`, `perspective: 1150px`.
  - Narrative: Dwells on the feature with subtle micro-drift, giving the viewer's brain 1.5s to absorb the UI before pulling out.
- **Beat 4: Crisp Hero Resolve Lock**
  - Framing: `rotX: 0°`, `rotY: 0°`, `rotZ: 0°`, `zoom: 1.02x`, `panX: 0%`, `panY: 0%`, `perspective: 1000px`.
  - Narrative: Settle on perfect center hero state showing the complete software value proposition.

#### Arc Mode 2: SaaS 3-Step Guided Workflow (Feature Walkthrough Tour)
*Walks through the steps of actually using a feature: Trigger Input -> Main Action Canvas -> Output Result -> Complete Product.*

- **Beat 1 (Step 1 - Trigger / Input)**: Spotlight input trigger (`zoom: 1.35x`, `panX: -22%`, `panY: -6%`, `rotX: 2°`, `rotY: -3°`, `rotZ: 0°`).
- **Beat 2 (Step 2 - Action Canvas)**: Glides smoothly to central interaction area (`zoom: 1.45x`, `panX: 0%`, `panY: 0%`, `rotX: 0°`, `rotY: 0°`, `rotZ: 0°`).
- **Beat 3 (Step 3 - Output Result)**: Glides to result telemetry / success badge (`zoom: 1.38x`, `panX: +20%`, `panY: +10%`, `rotX: 1°`, `rotY: 2°`, `rotZ: 0°`).
- **Beat 4 (Complete Product Hero)**: Resolves to full upright interface (`zoom: 1.05x`, centered, 0,0,0).

#### Arc Mode 3: Dynamic 3D Cinematic Reveal (Promotional Teasers Only)
*Reserved ONLY for high-level marketing teaser trailers where 3D physical chassis drama is explicitly requested (NOT for feature tutorials or changelogs).*
- **Beat 1: Angled 3/4 Overview**: `rotX: +20° to +26°`, `rotY: -28° to -36°`, `rotZ: -8° to -12°`, `zoom: 0.82x`.
- **Beat 2: Dynamic Swoop**: Across optical center (`rotX: -6° to -12°`, `rotY: +14° to +24°`, `rotZ: +5° to +8°`, `zoom: 1.45x`).
- **Beat 3: Lateral Detail Glide**: `rotX: +8° to +14°`, `rotY: -10° to -16°`, `rotZ: -4°`, `zoom: 1.22x`.
- **Beat 4: Authoritative Hero Lock**: `rotX: 0°`, `rotY: 0°`, `rotZ: 0°`, `zoom: 1.05x`, centered.

### 3.4 Pre-Choreography Inspection Protocol Checklist

When presented with reference media, Claude must execute this strict 6-stage protocol:

```markdown
### 📋 Media Analysis Protocol (Pre-Choreography Inspection)

1. **Aspect Ratio & Frame Factor Audit**:
   - [ ] Inspect pixel dimensions ($W \times H$).
   - [ ] Assign target container ratio: `16:9` (desktop), `9:16` (mobile/social), `1:1` (square feed), `4:5` (portrait feed).
   - [ ] Assign device mockup frame:
     - Desktop app / dashboard $\to$ `macbook-pro` or `mac-safari`
     - Mobile app / teaser $\to$ `3d-phone`
     - Modern frameless SaaS / marketing $\to$ `frameless`
     - High-end studio display $\to$ `studio-display`

2. **Palette & Luminance Profiling**:
   - [ ] Measure dominant canvas background lightness:
     - Dark Obsidian ($\le 15\%$ lightness) $\to$ Pair with `#09090b` or subtle specular wallpaper (`bg-purple-wave`)
     - Light Editorial ($\ge 85\%$ lightness) $\to$ Pair with clean warm gradient (`bg-green-hills`, `bg-sunset-glow`)
   - [ ] Identify primary accent hue (e.g., Linear electric violet, Stripe blurple, Raycast red, Supabase emerald).

3. **Spatial Landmark Mapping**:
   - [ ] Identify Primary Anchor (Rank 1): Location $(X_1, Y_1)$ in $[-50\%, +50\%]$ coordinate space.
   - [ ] Identify Secondary Anchor (Rank 2): Location $(X_2, Y_2)$.
   - [ ] Identify Conversion Anchor (Rank 3): Primary CTA location $(X_{\text{CTA}}, Y_{\text{CTA}})$.

4. **Information Density & Hierarchy Assessment**:
   - [ ] Score interface density (High / Medium / Low).
   - [ ] High-density screens (analytics grids, IDEs) $\implies$ Increase Beat 2 zoom to $1.48x–1.55x$ for legible micro-typography.
   - [ ] Low-density screens (marketing heroes) $\implies$ Moderate Beat 2 zoom to $1.35x–1.40x$ and increase Beat 1 rotY to $35^\circ–42^\circ$ for dimensional drama.

5. **Archetype Classification**:
   - [ ] Execute Decision Heuristic Tree (§3.5) to classify media into 1 of the 8 canonical SaaS archetypes.

6. **Choreography Synthesis & Motion Clamping**:
   - [ ] Calculate counter-pan offsets using the Coupled Counter-Panning Formula (§2.1).
   - [ ] Verify dynamic roll banking direction matches lateral pan direction ($\text{sgn}(\text{rotZ}) \equiv \text{sgn}(\text{rotY}) \equiv \text{sgn}(\text{panX})$).
   - [ ] Ensure all 7 parameters respect safe physical bounds.
   - [ ] Generate Zetashot MCP payload with valid `customKeyframes`.
```

### 3.5 Deterministic Decision Heuristic Tree

```
                                [START: Analyze Reference UI Media & User Goal]
                                                       │
                                                       ▼
                {Is User Intent a Feature Release, Changelog, or SaaS Product Demo?}
                                 /                                            \
                               YES                                             NO
                               /                                                \
           [USE PART 1: LEGIBILITY-FIRST RECIPES]                  {Is Ratio 9:16 & High-Energy Reel?}
            • Highlighting a single new feature:                     /                           \
              -> Archetype 1 (Feature Spotlight)                    YES                           NO
            • Showing a multi-step user journey:                     │                             │
              -> Archetype 2 (3-Step Guided Workflow)     [ARCHETYPE 7: Social Reel]   [ARCHETYPE 8: Studio Luxury]
            • Dark-mode developer tools / productivity:
              -> Archetype 3 (Linear Minimal 2.5D)
            • Frontal keynote announcement:
              -> Archetype 4 (Apple Frontal Push)
            • Before-and-after / migration:
              -> Archetype 5 (Feature Comparison)
            • Revenue metrics / investor reporting:
              -> Archetype 6 (Executive KPI Spotlight)
```

---

## R4: Archetype Keyframe Choreography Matrix

Below is the complete, production-grade 8-Archetype Keyframe Choreography Matrix. 
It is strictly divided into **Part 1 (SaaS Feature Showcase & Product Demo Matrix - Legibility First)** and **Part 2 (Dynamic 3D Cinematic Marketing Trailers)**.

---

### PART 1: SAAS FEATURE SHOWCASE & PRODUCT DEMO MATRIX (LEGIBILITY FIRST)

> [!IMPORTANT]
> In Part 1, all keyframes enforce **zero Dutch roll ($\text{rotZ} \equiv 0^\circ$)**, near-zero angles ($\text{rotX} \in [0^\circ, 4^\circ]$, $\text{rotY} \in [-3^\circ, +3^\circ]$), and telephoto perspective ($1100\text{px} - 1200\text{px}$). This guarantees that UI copy, numerical KPIs, and interface buttons remain 100% crisp and readable without nausea-inducing roller-coaster spam.

#### Archetype 1: New Feature Spotlight & Changelog Release
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `bg-purple-wave`
- **Total Duration**: `4.0s` | **Vibe**: Clean, high legibility, feature comprehension, changelog drop

```
Narrative Strategy:
- Beat 1: Upright context establishing overview without disorienting tilt.
- Beat 2: Deliberate, smooth optical dive straight into the new feature area (e.g. AI prompt bar, filter, or modal).
- Beat 3: Generous dwell time with subtle micro-drift allowing viewers to read copy and inspect the feature.
- Beat 4: Authoritative hero resolve lock showing the feature within the full product experience.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Context Establishing | `0.00s` | `1.30s` | `+2°` | `0°` | `0°` | `0.95x` | `0%` | `0%` | `1100px` | `Spline (M0=0)` | **NEW FEATURE RELEASE** / Seamless Intelligence Upgrade |
| **2** | Feature Deep Dive | `1.30s` | `1.30s` | `+1°` | `-2°` | `0°` | `1.52x` | `+16%` | `-12%` | `1150px` | `Cubic Hermite (τ=0.35)` | **SPOTLIGHT CAPABILITY** / Purpose-Built for Maximum Velocity |
| **3** | Feature Dwell & Micro-Glide | `2.60s` | `1.40s` | `+2°` | `+1°` | `0°` | `1.55x` | `+18%` | `-10%` | `1150px` | `Cubic Hermite (τ=0.35)` | **SEAMLESS INTEGRATION** / Zero Disruption to Existing Flows |
| **4** | Crisp Hero Resolve Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.02x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **TRY IT TODAY** / Available in the Latest Update |

---

#### Archetype 2: SaaS 3-Step Guided Workflow (Feature Walkthrough)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `bg-green-hills`
- **Total Duration**: `4.0s` | **Vibe**: Step-by-step user onboarding, guided workflow tour, friction-free ergonomics

```
Narrative Strategy:
- Beat 1 (Step 1 - Trigger): Spotlight input trigger (sidebar navigation or command palette).
- Beat 2 (Step 2 - Action): Glide across to the central interactive canvas where configuration occurs.
- Beat 3 (Step 3 - Output): Glide to the resulting telemetry card, export toast, or status badge.
- Beat 4: Complete product hero lock celebrating the finished workflow.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Step 1: Input Trigger | `0.00s` | `1.30s` | `+2°` | `-3°` | `0°` | `1.35x` | `-22%` | `-6%` | `1100px` | `Spline (M0=0)` | **STEP 1: TRIGGER** / Select Project & Set Parameters |
| **2** | Step 2: Action Canvas | `1.30s` | `1.30s` | `0°` | `0°` | `0°` | `1.45x` | `0%` | `0%` | `1100px` | `Cubic Hermite (τ=0.35)` | **STEP 2: COMPOSE** / Real-Time Autonomous Processing |
| **3** | Step 3: Output Result | `2.60s` | `1.40s` | `+1°` | `+2°` | `0°` | `1.38x` | `+20%` | `+10%` | `1100px` | `Cubic Hermite (τ=0.35)` | **STEP 3: DELIVER** / 1-Click Multi-Channel Distribution |
| **4** | Complete Product View | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.05x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **EFFORTLESS EXECUTION** / The Complete Software Suite |

---

#### Archetype 3: Linear Minimal 2.5D Elevation (Dark Dev Tools & Productivity)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `#09090b`
- **Total Duration**: `4.0s` | **Vibe**: Iconic Linear/Raycast aesthetic, subtle 2.5D elevation, telephoto optics, keyboard velocity

```
Narrative Strategy:
- Beat 1: Clean 2.5D elevation establishing dark-mode contrast with subtle specular border sheen.
- Beat 2: Zoom straight into central syntax/command omnibar without keystoning distortion.
- Beat 3: Horizontal linear glide tracing secondary terminal logs and shortcut pills.
- Beat 4: Crisp resting lock with zero residual momentum.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Clean 2.5D Establishing | `0.00s` | `1.30s` | `+4°` | `-2°` | `0°` | `0.92x` | `-10%` | `-4%` | `1200px` | `Spline (M0=0)` | **KEYBOARD-FIRST VELOCITY** / Built for 10x Engineers |
| **2** | Feature Center Zoom | `1.30s` | `1.30s` | `+2°` | `+2°` | `0°` | `1.40x` | `+8%` | `+4%` | `1200px` | `Cubic Hermite (τ=0.35)` | **SUB-5MS FUZZY SEARCH** / Raycast Omnibar Engine |
| **3** | Horizontal Linear Glide | `2.60s` | `1.40s` | `+3°` | `-1°` | `0°` | `1.25x` | `-6%` | `+2%` | `1200px` | `Cubic Hermite (τ=0.35)` | **STREAMING CI/CD LOGS** / Instant Zero-Config Deploy |
| **4** | Crisp Resting Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.04x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **LINEAR ARCHITECTURE** / Streamline Your Workflow |

---

#### Archetype 4: Apple Keynote Frontal Push (Pure Orthogonal Reveal)
- **Aspect Ratio**: `16:9` | **Device Frame**: `studio-display` | **Wallpaper**: `bg-halftone-clouds`
- **Total Duration**: `4.0s` | **Vibe**: Apple keynote presentation, zero keystoning, pure optical push, museum clarity

```
Narrative Strategy:
- Beat 1: Wide frontal establishing shot displaying complete software frame in perfect orthogonal alignment.
- Beat 2: Direct optical push-in straight into the primary feature element without any rotational skew.
- Beat 3: Micro-pan across secondary feature controls with zero roll.
- Beat 4: Full hero reveal settling into crystal-clear product framing.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Wide Frontal Establishing | `0.00s` | `1.30s` | `0°` | `0°` | `0°` | `0.88x` | `0%` | `0%` | `1200px` | `Spline (M0=0)` | **INTRODUCING STUDIO SUITE** / The Next Chapter in Creation |
| **2** | Frontal Push-In to Feature | `1.30s` | `1.30s` | `0°` | `0°` | `0°` | `1.48x` | `+12%` | `-8%` | `1200px` | `Cubic Hermite (τ=0.35)` | **RETINA DETAIL ENGINE** / Precision Down to Every Pixel |
| **3** | Secondary Feature Focus | `2.60s` | `1.40s` | `0°` | `0°` | `0°` | `1.35x` | `-10%` | `+6%` | `1200px` | `Cubic Hermite (τ=0.35)` | **INTUITIVE CONTROLS** / Powerful Yet Incredibly Simple |
| **4** | Full Hero Reveal | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.02x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **EXPERIENCE PERFECTION** / Available Worldwide Today |

---

#### Archetype 5: Feature Comparison Glide (Before & After / Multi-Panel)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `bg-tulips`
- **Total Duration**: `4.0s` | **Vibe**: Side-by-side comparison, migration showcase, dual workflow

```
Narrative Strategy:
- Beat 1: Spotlight the left feature panel (initial configuration or legacy state).
- Beat 2: Smooth linear transition sliding across center divider.
- Beat 3: Spotlight the right feature panel (upgraded output or accelerated state).
- Beat 4: Pull back to full comparative overview framing both panels in balance.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Left Feature Panel | `0.00s` | `1.30s` | `+1°` | `-3°` | `0°` | `1.35x` | `-24%` | `0%` | `1100px` | `Spline (M0=0)` | **LEGACY WORKFLOW** / Hours of Manual Repetition |
| **2** | Transition Across Center | `1.30s` | `1.30s` | `0°` | `0°` | `0°` | `1.20x` | `0%` | `0%` | `1100px` | `Cubic Hermite (τ=0.35)` | **THE NEXT EVOLUTION** / Instant AI Transformation |
| **3** | Right Feature Panel | `2.60s` | `1.40s` | `+1°` | `+3°` | `0°` | `1.35x` | `+24%` | `0%` | `1100px` | `Cubic Hermite (τ=0.35)` | **THE NEW STANDARD** / 10x Faster Output, Zero Setup |
| **4** | Full Comparison Overview | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.05x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **MIGRATE IN MINUTES** / See the Difference Instantly |

---

#### Archetype 6: Executive KPI & Telemetry Spotlight (Data Visuals & ROI)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `bg-purple-wave`
- **Total Duration**: `4.0s` | **Vibe**: Business growth, executive reporting, metrics and ROI announcement

```
Narrative Strategy:
- Beat 1: Direct focus onto the primary ARR growth card (+248%) with crystal-clear readability.
- Beat 2: Smooth drift over to supporting conversion metrics and live transaction sparklines.
- Beat 3: Downward glide tracing data trend chart and volume indicators.
- Beat 4: Complete business dashboard hero lock presenting the full operational picture.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Metric Card Focus | `0.00s` | `1.30s` | `-2°` | `+2°` | `0°` | `1.55x` | `+18%` | `-14%` | `1150px` | `Spline (M0=0)` | **+248% ARR GROWTH** / High-Velocity Conversion Engine |
| **2** | Supporting Metric Inspection | `1.30s` | `1.30s` | `+1°` | `-2°` | `0°` | `1.45x` | `-14%` | `-10%` | `1150px` | `Cubic Hermite (τ=0.35)` | **99.98% CONVERSION** / Autonomous Payment Optimization |
| **3** | Data Trend Glide | `2.60s` | `1.40s` | `+2°` | `0°` | `0°` | `1.25x` | `0%` | `+8%` | `1100px` | `Cubic Hermite (τ=0.35)` | **REAL-TIME INTELLIGENCE** / Sub-Millisecond Telemetry |
| **4** | Complete Business Dashboard | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.04x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **EXECUTIVE SUITE** / Unleash Enterprise Performance |

---

### PART 2: DYNAMIC 3D CINEMATIC MARKETING TRAILERS (PROMOTIONAL TEASERS ONLY)

> [!CAUTION]
> Part 2 keyframes utilize aggressive 3D angles and dynamic roll banking ($\pm 14^\circ \text{ to } \pm 22^\circ$). Use these **ONLY** when the user explicitly requests a promotional marketing trailer, teaser video, or viral social reel. **DO NOT** use Part 2 for software feature showcases, changelogs, or UI tutorials.

#### Archetype 7: High-Energy Kinetic Social Reels (9:16 Vertical for TikTok / Shorts)
- **Aspect Ratio**: `9:16` | **Device Frame**: `3d-phone` | **Wallpaper**: `bg-purple-wave`
- **Total Duration**: `3.5s` | **Vibe**: Adrenaline, kinetic whip transitions, punchy snap zooms, extreme viral engagement

```
Narrative Strategy:
- Beat 1: Extreme high-angle Dutch whip creating instant visual friction in the feed.
- Beat 2: Hyper-aggressive snap zoom (1.65x) punching straight into the shocking core result.
- Beat 3: High-speed counter-whip lateral recoil across the automated workflow steps.
- Beat 4: Snap center drop lock freezing motion completely with bold call-to-action overlay.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Kinetic High Dutch Whip | `0.00s` | `0.90s` | `+32°` | `-42°` | `-22°` | `0.90x` | `-28%` | `-24%` | `680px` | `Spline (M0=0)` | **WAIT FOR IT...** / The AI Tool Changing Everything |
| **2** | Whip Punch-In Zoom | `0.90s` | `1.10s` | `-18°` | `+34°` | `+18°` | `1.65x` | `+24%` | `+14%` | `660px` | `Cubic Hermite (τ=0.35)` | **INSTANT AUTOMATION** / 10 Hours of Work in 3 Seconds |
| **3** | Recoil Whip Reverse | `2.00s` | `1.50s` | `+14°` | `-16°` | `-8°` | `1.18x` | `-12%` | `-6%` | `820px` | `Cubic Hermite (τ=0.35)` | **100% AUTONOMOUS** / Zero Manual Setup |
| **4** | Snap Center Drop Lock | `3.50s` | `0.00s` | `0°` | `0°` | `0°` | `1.10x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **LINK IN BIO** / Try Free Now |

---

#### Archetype 8: Minimalist Studio Luxury Reveals (Apple-Style Specular Sweeps)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `#09090b`
- **Total Duration**: `4.2s` | **Vibe**: Ultra-luxury, grazing specular light, buttery smooth glide, museum-grade elegance

```
Narrative Strategy:
- Beat 1: Ultra-low grazing angle catching light across the aluminum bezel and glass display edge.
- Beat 2: Slow, velvety specular glide revealing display brilliance and contrast ratios.
- Beat 3: Gentle orthogonal alignment easing out of perspective skew with surgical precision.
- Beat 4: Pure monolithic museum lock holding perfection in absolute silence.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Low Specular Chamfer Sweep | `0.00s` | `1.40s` | `-20°` | `+45°` | `+15°` | `0.85x` | `+32%` | `+18%` | `820px` | `Spline (M0=0)` | **PRECISION ENGINEERING** / Forged in Pure Titanium |
| **2** | Specular Horizon Skim | `1.40s` | `1.40s` | `+8°` | `-24°` | `-7°` | `1.18x` | `-16%` | `-8%` | `920px` | `Cubic Hermite (τ=0.35)` | **LIQUID RETINA XDR** / 1,000,000:1 Contrast Ratio |
| **3** | Orthogonal Alignment Glide | `2.80s` | `1.40s` | `+4°` | `-6°` | `-2°` | `1.08x` | `-4%` | `-2%` | `980px` | `Cubic Hermite (τ=0.35)` | **UNMATCHED CLARITY** / Over 1 Billion True Colors |
| **4** | Pure Monolithic Hero Lock | `4.20s` | `0.00s` | `0°` | `0°` | `0°` | `1.00x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **PRO BEYOND MEASURE** / Experience the Masterpiece |

---

## R5: Motion Physics, Velocity Damping & Anti-Pattern Elimination

### 5.1 Cubic Hermite Spline Mathematical Formulation

For any multi-waypoint sequence of $N \ge 3$ keyframes $(t_0, \mathbf{C}_0), (t_1, \mathbf{C}_1), \dots, (t_{N-1}, \mathbf{C}_{N-1})$, the camera trajectory on span $k$ ($t \in [t_k, t_{k+1}]$) is governed by a **Cubic Hermite Spline**:

$$u = \frac{t - t_k}{t_{k+1} - t_k} \in [0, 1], \quad \Delta t_k = t_{k+1} - t_k$$
$$\mathbf{C}(u) = h_{00}(u)\mathbf{C}_k + h_{10}(u)\mathbf{M}_k\Delta t_k + h_{01}(u)\mathbf{C}_{k+1} + h_{11}(u)\mathbf{M}_{k+1}\Delta t_k$$

Where the four Hermite basis cubic polynomials are:
$$h_{00}(u) = 2u^3 - 3u^2 + 1$$
$$h_{10}(u) = u^3 - 2u^2 + u$$
$$h_{01}(u) = -2u^3 + 3u^2$$
$$h_{11}(u) = u^3 - u^2$$

### 5.2 Tension-Damped Tangents ($\tau = 0.35$)

Standard Catmull-Rom splines employ a tension factor of $0.50$, which frequently produces overshoot and oscillation around dense UI components. Zetashot's spline interpolation engine implements **Tension-Damped Tangents** with $\tau = 0.35$:

$$\mathbf{M}_k = \tau \cdot \frac{\mathbf{C}_{k+1} - \mathbf{C}_{k-1}}{t_{k+1} - t_{k-1}} \quad \text{with } \tau = 0.35$$

This $30\%$ reduction in intermediate tangent velocity suppresses overshoot, guaranteeing that camera paths hug target UI cards smoothly without accidental outward swinging.

### 5.3 Boundary Velocity Clamping ($v_0 = 0, v_{\text{end}} = 0$)

To eliminate initial jerks and jarring terminal stops, boundary tangent velocities must be strictly clamped to zero:

$$\mathbf{M}_0 = \vec{0} \quad (\text{Stationary Origin})$$
$$\mathbf{M}_{N-1} = \vec{0} \quad (\text{Stationary Final Hero Lock})$$

This guarantees that:
$$\left.\frac{d\mathbf{C}}{dt}\right|_{t=0} = \vec{0} \quad \text{and} \quad \left.\frac{d\mathbf{C}}{dt}\right|_{t=t_{\text{end}}} = \vec{0}$$

### 5.4 Isolated 2-Keyframe Spans: Perlin Quintic Smootherstep

When animating an isolated 2-keyframe transition ($N = 2$), Hermite splines simplify to **Perlin's Quintic Smootherstep**:

$$u = \frac{t - t_0}{t_1 - t_0} \in [0, 1]$$
$$S_5(u) = 6u^5 - 15u^4 + 10u^3 = u^3(6u^2 - 15u + 10)$$
$$\mathbf{C}(u) = \mathbf{C}_0 + (\mathbf{C}_1 - \mathbf{C}_0) \cdot S_5(u)$$

*First and Second Derivative Properties*:
$$\frac{dS_5}{du} = 30u^4 - 60u^3 + 30u^2 = 30u^2(u - 1)^2 \implies S_5'(0) = 0, \quad S_5'(1) = 0$$
$$\frac{d^2S_5}{du^2} = 120u^3 - 180u^2 + 60u = 60u(2u - 1)(u - 1) \implies S_5''(0) = 0, \quad S_5''(1) = 0$$
Both velocity and acceleration vanish at endpoints, delivering buttery smooth $C^2$-like motion without any mechanical jerk.

### 5.5 Negative Anti-Patterns and Elimination Rules

| Anti-Pattern | Primary Failure Mode | Physical Impact | Strict Remediation Rule |
|---|---|---|---|
| **Dutch Over-Rotation** | $|\text{rotZ}| > 30^\circ$ | Optical disorientation; horizontal UI text becomes diagonal and illegible. | Hard clamp $|\text{rotZ}| \le 30^\circ$. Final keyframe MUST have $\text{rotZ} = 0^\circ$. |
| **Trajectory Kinking** | Reversing yaw sign in consecutive steps with $\Delta t < 0.80\text{s}$ | Whiplash acceleration; viewer loses spatial orientation. | Enforce minimum duration $\Delta t \ge 0.80\text{s}$ across direction flips, or insert an intermediate decelerating waypoint. |
| **Ungrounded Drift** | Modulating yaw without counter-pan ($\text{rotY} \ne 0, \text{panX} = 0$) | Subject slides completely offscreen during 3D rotation. | Always enforce the Coupled Counter-Panning Law ($\text{sgn}(\text{panX}) \equiv \text{sgn}(\text{rotY})$). |
| **Perspective Breathing** | $\Delta \text{perspective} > 350\text{px}$ in a single span | Mockup plane physically warps like a rubber sheet. | Constrain focal perspective transitions to $\le 200\text{px}$ per waypoint. |
| **Empty Macro Zoom** | $\text{zoom} > 1.35x$ with $(\text{panX}, \text{panY}) = (0, 0)$ | Camera zooms into blank center padding or empty background. | High zoom MUST target a verified UI landmark coordinate $(X_L, Y_L)$. |

---

## R6: Zetashot MCP Integration & Output Schemas

### 6.1 MCP Tool Architecture

Zetashot Studio exposes two primary MCP tools for 3D camera choreography and project creation:

1. **`create_mockup_project`**: Accepts media URLs, device frames, aspect ratios, wallpaper presets, optional text layers, and a `customKeyframes` array. It packages the state, compresses it with raw DEFLATE, generates a URL-safe base64 parameter `?p=...`, and returns a one-click interactive studio link with optional auto-export.
2. **`choreograph_cinematic_motion`**: Analyzes the layout type and focal points of reference media, generating a structured 4-beat custom keyframe array.

### 6.2 Exact JSON Schema for `customKeyframes`

The `customKeyframes` array in both tools strictly adheres to this JSON schema:

```json
{
  "type": "array",
  "description": "Array of custom 3D camera keyframes choreographed after analyzing the reference media.",
  "items": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Descriptive narrative step (e.g., '1. Establishing Overview', '2. Macro Swoop: Revenue Metric')"
      },
      "startTime": {
        "type": "number",
        "description": "Start time in seconds along the animation timeline"
      },
      "duration": {
        "type": "number",
        "description": "Duration of transition to the next keyframe in seconds (0 for the final resolve keyframe)"
      },
      "camera": {
        "type": "object",
        "properties": {
          "rotX": { "type": "number", "description": "Pitch angle in degrees (-45 to +45)" },
          "rotY": { "type": "number", "description": "Yaw angle in degrees (-75 to +75)" },
          "rotZ": { "type": "number", "description": "Roll / Dutch banking in degrees (-30 to +30)" },
          "zoom": { "type": "number", "description": "Zoom scale multiplier (0.5 to 2.5)" },
          "panX": { "type": "number", "description": "Horizontal pan percentage (-50 to +50)" },
          "panY": { "type": "number", "description": "Vertical pan percentage (-50 to +50)" },
          "perspective": { "type": "number", "description": "Focal perspective distance in pixels (500 to 1400)" }
        },
        "required": ["rotX", "rotY", "rotZ", "zoom", "panX", "panY"]
      }
    },
    "required": ["name", "startTime", "camera"]
  }
}
```

### 6.3 Copy-Pasteable MCP Payload: `create_mockup_project`

Below is an exhaustive, production-grade payload ready to be sent to `create_mockup_project` (configured for **Archetype 1: Analytics Dashboard**):

```json
{
  "title": "Stripe Autonomous Revenue Intelligence",
  "aspectRatio": "16:9",
  "deviceMockup": "macbook-pro",
  "background": "bg-purple-wave",
  "duration": 4.0,
  "textTitle": "Stripe Analytics",
  "textSubtitle": "Real-time revenue & MRR velocity",
  "autoExport": true,
  "customKeyframes": [
    {
      "name": "1. Establishing Overview",
      "startTime": 0.0,
      "duration": 1.3,
      "camera": {
        "rotX": 24.0,
        "rotY": -34.0,
        "rotZ": -9.0,
        "zoom": 0.82,
        "panX": -24.0,
        "panY": -12.0,
        "perspective": 850
      }
    },
    {
      "name": "2. Macro Swoop: Revenue Metric",
      "startTime": 1.3,
      "duration": 1.3,
      "camera": {
        "rotX": -6.0,
        "rotY": 18.0,
        "rotZ": 6.0,
        "zoom": 1.48,
        "panX": 18.0,
        "panY": 14.0,
        "perspective": 780
      }
    },
    {
      "name": "3. Lateral Glide: Event Ledger",
      "startTime": 2.6,
      "duration": 1.4,
      "camera": {
        "rotX": 10.0,
        "rotY": -14.0,
        "rotZ": -4.0,
        "zoom": 1.22,
        "panX": -14.0,
        "panY": -4.0,
        "perspective": 920
      }
    },
    {
      "name": "4. Authoritative Hero Lock",
      "startTime": 4.0,
      "duration": 0.0,
      "camera": {
        "rotX": 0.0,
        "rotY": 0.0,
        "rotZ": 0.0,
        "zoom": 1.05,
        "panX": 0.0,
        "panY": 0.0,
        "perspective": 1000
      }
    }
  ]
}
```

> **Note on Text Overlay Synthesis**: In `create_mockup_project`, text overlays are declared via `"textTitle"` and `"textSubtitle"`. Zetashot synthesizes `textLayers` internally within the `ZetashotSharedProject` data structure (`api/mcp.ts:990-1011`). External MCP clients should supply `textTitle` and `textSubtitle` rather than passing raw `textLayers`.

### 6.4 Copy-Pasteable MCP Payload: `choreograph_cinematic_motion`

```json
{
  "layoutType": "desktop_dashboard",
  "duration": 4.0,
  "focalPoints": [
    "Pro Pricing Card",
    "1-Click Checkout CTA"
  ]
}
```

### 6.5 URL Base64 Encoding Protocol (`?p=...`)

When serializing a full project into a 1-click shareable URL:
1. Construct the complete `ZetashotSharedProject` JSON payload.
2. Compress the UTF-8 JSON buffer using raw DEFLATE (`zlib.deflateRawSync` in Node.js, `fflate.deflateSync` in browser).
3. Encode the compressed binary buffer to a URL-safe Base64 string (RFC 4648 §5: `+` replaced with `-`, `/` replaced with `_`, padding `=` stripped).
4. Append to the studio base URL:
   `https://zetashot.app/?p=<base64url_string>`

---

## 10-Point Pre-Flight Motion Quality Audit Checklist

Before emitting any camera keyframe sequence to the user or invoking the Zetashot MCP API, verify that the choreography passes all 10 pre-flight quality gates:

- [ ] **1. Strict Physical Bounds Compliance**:
  - `rotX` strictly within $[-45^\circ, +45^\circ]$
  - `rotY` strictly within $[-75^\circ, +75^\circ]$
  - `rotZ` strictly within $[-30^\circ, +30^\circ]$ (standard moves within $[-12^\circ, +12^\circ]$)
  - `zoom` strictly within $[0.50x, 2.50x]$
  - `panX`, `panY` strictly within $[-50\%, +50\%]$
  - `perspective` strictly within $[500\text{px}, 1400\text{px}]$
- [ ] **2. Coupled Counter-Panning Active**:
  - Every waypoint with $|\text{rotY}| \ge 12^\circ$ has an aligned `panX` satisfying $\text{sgn}(\text{panX}) \equiv \text{sgn}(\text{rotY})$, preventing subject off-screen drift.
- [ ] **3. Dynamic Roll Banking Coherence**:
  - Banking sign matches yaw and pan directions: $\text{sgn}(\text{rotZ}) \equiv \text{sgn}(\text{rotY}) \equiv \text{sgn}(\text{panX})$.
  - Roll amplitude adheres to scale: $4^\circ - 8^\circ$ for standard SaaS, $14^\circ - 22^\circ$ for kinetic vertical reels.
- [ ] **4. 4-Beat Narrative Completeness**:
  - Choreography contains exactly 4 distinct beats: Establishing Overview $\to$ Macro Feature Swoop $\to$ Lateral Detail Glide $\to$ Authoritative Hero Lock.
- [ ] **5. Perfect Hero Lock Perpendicularity**:
  - Final keyframe ($t = t_{\text{end}}$) settles on exact orthogonal alignment:
    $\text{rotX} = 0.0^\circ, \text{rotY} = 0.0^\circ, \text{rotZ} = 0.0^\circ, \text{panX} = 0.0\%, \text{panY} = 0.0\%, \text{perspective} = 1000\text{px}$.
- [ ] **6. Macro Zoom Typographic Legibility**:
  - High zoom ($\ge 1.35x$) is centered on a verified high-density UI landmark, with Readability Damping applied to tilt/yaw.
- [ ] **7. Aspect Ratio & Device Frame Harmony**:
  - Frame pairing is structurally valid: `3d-phone` for $9:16$ vertical media, `macbook-pro` or `mac-safari` for $16:9$ desktop media.
- [ ] **8. Contrast & Palette Balance**:
  - Canvas background luminance provides at least $4.5:1$ contrast against the mockup bezel, preventing edge blend.
- [ ] **9. Velocity Smoothing & Boundary Clamping**:
  - Initial and final tangent velocities clamp to zero ($M_0 = \vec{0}, M_{N-1} = \vec{0}$); no instantaneous velocity spikes.
- [ ] **10. Zetashot MCP Schema Conformance**:
  - JSON payload strictly adheres to `api/mcp.ts` schema, including all required fields (`name`, `startTime`, `camera.rotX`, `camera.rotY`, `camera.rotZ`, `camera.zoom`, `camera.panX`, `camera.panY`).
