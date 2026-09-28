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

### 3.3 The 4-Beat Cinematic Narrative Arc

Every high-end SaaS product animation must follow a strict **4-Beat Narrative Arc** timed to golden-ratio proportions:

```
0.0s                      t1 (~30%)                  t2 (~65%)                 t_end (100%)
 ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
 │         BEAT 1          │          BEAT 2          │         BEAT 3          │      BEAT 4
 │  ESTABLISHING OVERVIEW  │   MACRO FEATURE SWOOP    │  LATERAL DETAIL GLIDE   │ AUTHORITATIVE HERO
 │  (Scale & Perspective)  │    (The Hero Hook)       │  (Ergonomics & Depth)   │  (Conversion Lock)
```

#### Beat 1: Establishing Overview (Orientation & Context)
- **Time Ratio**: $0.0\text{s} \to t_1$ ($\approx 0\% - 30\%$ of total clip; e.g. $0.0\text{s} \to 1.3\text{s}$ in a $4.0\text{s}$ clip).
- **Cinematic Framing**:
  - **Zoom**: $0.75x - 0.88x$ (wide establishing; full device chassis visible with comfortable background margins).
  - **Pitch ($\text{rotX}$)**: $+18^\circ \text{ to } +26^\circ$ (birds-eye overview) or $-14^\circ \text{ to } -20^\circ$ (low specular hero angle).
  - **Yaw ($\text{rotY}$)**: Pronounced 3/4 angle ($-28^\circ \text{ to } -36^\circ$ or $+30^\circ \text{ to } +42^\circ$) revealing 3D device bezel and drop shadow.
  - **Roll ($\text{rotZ}$)**: Dynamic banking ($-8^\circ \text{ to } -12^\circ$) matching entry vector.
  - **Pan ($\text{panX}, \text{panY}$)**: Off-center offset ($-22\% \text{ to } -28\%, -10\% \text{ to } -18\%$) creating negative space for the opening text badge.
  - **Perspective**: $750\text{px} - 850\text{px}$ (wide-angle depth convergence).
- **Narrative Function**: Answers: *"What world am I entering?"* Establishes hardware frame context, software identity, and luxury aesthetic.

#### Beat 2: Macro Feature Swoop (The Hero Hook)
- **Time Ratio**: $t_1 \to t_2$ ($\approx 30\% - 65\%$ of total clip; e.g. $1.3\text{s} \to 2.6\text{s}$).
- **Cinematic Framing**:
  - **Zoom**: Deep Macro Dive ($1.38x - 1.55x$). Fills the viewport with the primary value landmark.
  - **Pitch ($\text{rotX}$)**: Orthogonal recovery ($-6^\circ \text{ to } -12^\circ$ or $+6^\circ \text{ to } +10^\circ$) bringing typography parallel to the lens plane.
  - **Yaw ($\text{rotY}$)**: Dynamic swing across optical center ($+14^\circ \text{ to } +24^\circ$), generating intense parallax between background wallpaper and mockup glass.
  - **Roll ($\text{rotZ}$)**: Counter-banking ($+5^\circ \text{ to } +8^\circ$) flowing into the new motion vector.
  - **Pan ($\text{panX}, \text{panY}$)**: Counter-pan ($+14\% \text{ to } +22\%, +4\% \text{ to } +14\%$) locking the focal card into the golden third.
  - **Perspective**: $700\text{px} - 800\text{px}$ (macro focus falloff).
- **Narrative Function**: Answers: *"What is the core superpower of this product?"* Delivers the instant value spike.

#### Beat 3: Lateral Detail Glide (Dynamic Ergonomics)
- **Time Ratio**: $t_2 \to t_3$ ($\approx 65\% - 85\%$ of total clip; e.g. $2.6\text{s} \to 3.5\text{s}$).
- **Cinematic Framing**:
  - **Zoom**: Medium Detail Framing ($1.18x - 1.28x$). Wider than Beat 2 to reveal secondary controls and workflows.
  - **Pitch ($\text{rotX}$)**: Gentle stabilizing tilt ($+8^\circ \text{ to } +14^\circ$).
  - **Yaw ($\text{rotY}$)**: Stabilizing counter-yaw ($-10^\circ \text{ to } -16^\circ$).
  - **Roll ($\text{rotZ}$)**: Horizon recovery ($-2^\circ \text{ to } -4^\circ$).
  - **Pan ($\text{panX}, \text{panY}$)**: Lateral tracking sweep ($-8\% \text{ to } -15\%, +14\% \text{ to } +24\%$) tracing toward secondary mechanisms (table rows, prompt bar, navigation pills).
  - **Perspective**: $850\text{px} - 920\text{px}$ (progressive distortion relaxation).
- **Narrative Function**: Answers: *"How does this product actually work?"* Proves interface depth and ergonomic utility.

#### Beat 4: Authoritative Hero Lock (Resolution & Settle)
- **Time Ratio**: $t_3 \to t_{\text{end}}$ ($\approx 85\% - 100\%$ of total clip; e.g. $3.5\text{s} \to 4.0\text{s}$).
- **Cinematic Framing**:
  - **Zoom**: Confident Hero Scale ($1.00x - 1.08x$). Product fills 85% of stage with perfect optical margins.
  - **Pitch ($\text{rotX}$)**: **$0.0^\circ$** (strictly perpendicular alignment).
  - **Yaw ($\text{rotY}$)**: **$0.0^\circ$** (strictly zero azimuthal skew).
  - **Roll ($\text{rotZ}$)**: **$0.0^\circ$** (perfect zero horizon tilt).
  - **Pan ($\text{panX}, \text{panY}$)**: **$0\%, 0\%$** (dead center optical alignment).
  - **Perspective**: **$1000\text{px} - 1100\text{px}$** (standard prime lens perspective, zero fish-eye).
- **Narrative Function**: Answers: *"What should I do next?"* Complete visual stability allowing the eye to lock onto the primary CTA and full product state.

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
                                  [START: Analyze Reference UI Media]
                                                   │
                                                   ▼
                                {Is Aspect Ratio 9:16 or Height > Width?}
                               /                                         \
                             YES                                          NO
                             /                                             \
             {Fast kinetic tempo / viral hook?}                {Contains code tokens / monospaced font?}
                /                        \                                 /                       \
              YES                         NO                             YES                        NO
              /                            \                             /                           \
    [ARCHETYPE 7: Kinetic Social Reel]   [ARCHETYPE 2: Mobile App Flow] [ARCHETYPE 3: Dark Dev Tools] \
                                                                                                       \
                                                    {Contains pricing tiers, $ currency, or checkout form?}
                                                   /                                                      \
                                                 YES                                                       NO
                                                 /                                                          \
                                [ARCHETYPE 5: SaaS Pricing Cards]                                            \
                                                                         {Contains chat bubbles / streaming feed?}
                                                                        /                                     \
                                                                      YES                                      NO
                                                                      /                                         \
                                               [ARCHETYPE 6: Collaborative Chat]                                 \
                                                                         {Contains KPI cards, charts, data tables?}
                                                                        /                                         \
                                                                      YES                                          NO
                                                                      /                                             \
                                               [ARCHETYPE 1: Analytics Dashboard]                                    \
                                                                          {Contains large H1 display hero & CTA?}
                                                                         /                                       \
                                                                       YES                                        NO
                                                                       /                                           \
                                               [ARCHETYPE 4: Landing Page Hero]      [ARCHETYPE 8: Minimalist Studio Luxury]
```

---

## R4: Archetype Keyframe Choreography Matrix

Below is the complete, exhaustive, production-grade 8-Archetype Keyframe Choreography Matrix. Every archetype features calibrated device frames, wallpapers, exact timestamps, 7-DOF camera coordinates, Hermite spline tangent behaviors, and synchronized text badge triggers.

---

### Archetype 1: Analytics Dashboard & Data Visualizations (e.g. Stripe, Datadog)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `bg-purple-wave`
- **Total Duration**: `4.0s` | **Vibe**: Authoritative, analytical precision, real-time KPI metrics

```
Narrative Strategy:
- Beat 1: High birds-eye perspective establishing complex dashboard grid and ambient telemetry.
- Beat 2: Aggressive macro swoop into the top-performing KPI metric card (+248% ARR).
- Beat 3: Lateral glide across the real-time event ledger and live streaming data points.
- Beat 4: Monolithic upright hero lock displaying the complete business intelligence command center.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Establishing Overview | `0.00s` | `1.30s` | `+24°` | `-34°` | `-9°` | `0.82x` | `-24%` | `-12%` | `850px` | `Spline (M0=0)` | **REAL-TIME INTELLIGENCE** / Mission Control Overview |
| **2** | Macro Swoop: Revenue Metric | `1.30s` | `1.30s` | `-6°` | `+18°` | `+6°` | `1.48x` | `+18%` | `+14%` | `780px` | `Cubic Hermite (τ=0.35)` | **+248% ARR GROWTH** / High-Velocity Conversion Engine |
| **3** | Lateral Glide: Event Ledger | `2.60s` | `1.40s` | `+10°` | `-14°` | `-4°` | `1.22x` | `-14%` | `-4%` | `920px` | `Cubic Hermite (τ=0.35)` | **STREAMING LEDGER** / Sub-Millisecond Settlement |
| **4** | Authoritative Hero Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.05x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **STRIPE DATA SUITE** / Unleash Autonomous Growth |

---

### Archetype 2: Mobile App Flows & Social Interactions (e.g. iOS App Teaser)
- **Aspect Ratio**: `9:16` | **Device Frame**: `3d-phone` | **Wallpaper**: `bg-purple-wave`
- **Total Duration**: `4.0s` | **Vibe**: Tactile, intimate, titanium chassis, thumb-friendly micro-gestures

```
Narrative Strategy:
- Beat 1: High-angle angled reveal showing titanium chassis bezel and edge glass curvature.
- Beat 2: Deep macro dive onto the primary social feed card and interaction heart pill.
- Beat 3: Downward tracking glide revealing bottom navigation bar and active gesture pill.
- Beat 4: Perfectly centered vertical smartphone lock with subtle floating shadow.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Titanium Rim Entry | `0.00s` | `1.20s` | `+28°` | `-32°` | `-12°` | `0.88x` | `-18%` | `-16%` | `720px` | `Spline (M0=0)` | **NEXT-GEN MOBILE UX** / Designed for iOS 18 |
| **2** | Macro Feed & Gesture Dive | `1.20s` | `1.30s` | `-10°` | `+24°` | `+8°` | `1.52x` | `+20%` | `+10%` | `700px` | `Cubic Hermite (τ=0.35)` | **INSTANT ENGAGEMENT** / Fluid Gesture Navigation |
| **3** | Tab Bar & Action Glide | `2.50s` | `1.50s` | `+12°` | `-10°` | `-3°` | `1.26x` | `-8%` | `-22%` | `850px` | `Cubic Hermite (τ=0.35)` | **SEAMLESS DISCOVERY** / Explore Without Friction |
| **4** | Upright Center Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.06x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **DOWNLOAD TODAY** / Available on the App Store |

---

### Archetype 3: Dark-Mode Developer Tools & Syntax Terminals (e.g. Raycast, Cursor, Linear)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `#09090b`
- **Total Duration**: `4.0s` | **Vibe**: Cyberpunk, keyboard-driven velocity, monospace precision, deep zinc contrast

```
Narrative Strategy:
- Beat 1: Moody isometric workstation perspective emphasizing deep obsidian dark mode.
- Beat 2: Extreme macro zoom (1.55x) locking onto active syntax token parsing and fuzzy omnibar.
- Beat 3: Lateral panning glide across terminal build output and zero-config deployment logs.
- Beat 4: Imposing monolithic developer workstation lock with crisp border luminance.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Workstation Isometric Angle | `0.00s` | `1.25s` | `+22°` | `-36°` | `-10°` | `0.84x` | `-26%` | `-8%` | `820px` | `Spline (M0=0)` | **KEYBOARD-FIRST VELOCITY** / Built for 10x Engineers |
| **2** | Macro Omnibar & Syntax Dive | `1.25s` | `1.25s` | `-4°` | `+16°` | `+5°` | `1.55x` | `+16%` | `+2%` | `760px` | `Cubic Hermite (τ=0.35)` | **SUB-5MS FUZZY SEARCH** / Raycast Omnibar Engine |
| **3** | Terminal Output Stream | `2.50s` | `1.50s` | `+8°` | `-12°` | `-3°` | `1.28x` | `-10%` | `-18%` | `900px` | `Cubic Hermite (τ=0.35)` | **STREAMING CI/CD LOGS** / Instant Zero-Config Deploy |
| **4** | Monolithic Code Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.04x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **LINEAR ARCHITECTURE** / Streamline Your Workflow |

---

### Archetype 4: High-Conversion Landing Pages & Hero Headers (e.g. Framer, Vercel)
- **Aspect Ratio**: `16:9` | **Device Frame**: `mac-safari` | **Wallpaper**: `bg-green-hills`
- **Total Duration**: `4.0s` | **Vibe**: Expansive, bold typographic hierarchy, ambient lighting, high conversion

```
Narrative Strategy:
- Beat 1: Low-angle specular chrome sweep across Safari toolbar and grand H1 display headline.
- Beat 2: Focused macro dive into the core product proposition badge and interactive UI widget.
- Beat 3: Downward glide tracing social proof client logos and primary action button.
- Beat 4: Level Safari window centered cleanly against lush warm ambient gradient.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Low Specular Chrome Sweep | `0.00s` | `1.30s` | `-16°` | `+38°` | `+12°` | `0.88x` | `+26%` | `+18%` | `800px` | `Spline (M0=0)` | **CRAFTED FOR SCALE** / Ship at the Speed of Thought |
| **2** | Hero Headline Macro Zoom | `1.30s` | `1.30s` | `+6°` | `-18°` | `-6°` | `1.40x` | `-14%` | `-10%` | `900px` | `Cubic Hermite (τ=0.35)` | **GLOBAL EDGE NETWORK** / 99.999% Fault-Tolerant Uptime |
| **3** | Primary CTA Pill Glide | `2.60s` | `1.40s` | `-8°` | `+14°` | `+4°` | `1.25x` | `+12%` | `+18%` | `900px` | `Cubic Hermite (τ=0.35)` | **START BUILDING TODAY** / Zero Setup Required |
| **4** | Centered Safari Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.02x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **DEPLOY WITH VERCEL** / Loved by 100k+ Teams |

---

### Archetype 5: Multi-Step Checkout / SaaS Pricing Cards
- **Aspect Ratio**: `16:9` | **Device Frame**: `frameless` | **Wallpaper**: `bg-midnight-gradient`
- **Total Duration**: `4.0s` | **Vibe**: Reassuring, high-trust, friction-free checkout, clear value tiers

```
Narrative Strategy:
- Beat 1: Wide angled establishing view showcasing the complete 3-tier pricing matrix.
- Beat 2: Direct swoop into the "Recommended Pro" card and annual billing discount pill.
- Beat 3: Downward glide tracing enterprise security compliance badges and 1-click checkout CTA.
- Beat 4: Rock-solid level lock providing complete clarity over plan features and guarantees.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Tier Comparison Overview | `0.00s` | `1.20s` | `+18°` | `-34°` | `-9°` | `0.86x` | `-24%` | `-10%` | `850px` | `Spline (M0=0)` | **TRANSPARENT PRICING** / Predictable Scaling for Every Team |
| **2** | Pro Card & Toggle Focus | `1.20s` | `1.30s` | `-10°` | `+22°` | `+7°` | `1.46x` | `+18%` | `+6%` | `800px` | `Cubic Hermite (τ=0.35)` | **MOST POPULAR TIER** / Unlock Unlimited AI Workflows |
| **3** | Secure Checkout CTA Glide | `2.50s` | `1.50s` | `+8°` | `-12°` | `-4°` | `1.30x` | `-10%` | `-20%` | `900px` | `Cubic Hermite (τ=0.35)` | **1-CLICK CHECKOUT** / 30-Day Money-Back Guarantee |
| **4** | High-Trust Resolve Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.05x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **START 14-DAY TRIAL** / No Credit Card Required |

---

### Archetype 6: Collaborative Chat & Real-Time Feed Interfaces (e.g. Slack, Claude Chat)
- **Aspect Ratio**: `16:9` | **Device Frame**: `macbook-pro` | **Wallpaper**: `bg-purple-wave`
- **Total Duration**: `4.0s` | **Vibe**: Conversational, dynamic streaming tokens, collaborative presence

```
Narrative Strategy:
- Beat 1: Dynamic channel feed angle capturing multi-user presence avatars and room sidebar.
- Beat 2: Focused macro dive on the live streaming AI assistant response bubble.
- Beat 3: Downward tracking glide landing on the multimodal prompt bar and attachment pill.
- Beat 4: Level workstation lock displaying collaborative intelligence synchronized in real time.
```

| Beat | Name | Time | Dur | rotX | rotY | rotZ | Zoom | panX | panY | Persp | Easing / Tangent | Text Badge (Title / Subtitle) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Channel Feed Perspective | `0.00s` | `1.25s` | `+26°` | `-28°` | `-8°` | `0.85x` | `-18%` | `-18%` | `780px` | `Spline (M0=0)` | **REAL-TIME WORKSPACES** / Seamless Collective Intelligence |
| **2** | Macro Stream: AI Reasoning | `1.25s` | `1.35s` | `-6°` | `+18°` | `+5°` | `1.44x` | `+14%` | `+4%` | `820px` | `Cubic Hermite (τ=0.35)` | **GENERATIVE SYNTHESIS** / Sub-Second Claude Reasoning |
| **3** | Prompt Bar & Context Pill | `2.60s` | `1.40s` | `+10°` | `-8°` | `-2°` | `1.32x` | `-6%` | `-24%` | `880px` | `Cubic Hermite (τ=0.35)` | **MULTIMODAL CONTEXT** / Drop Code, Images & Docs |
| **4** | Centered Collaboration Lock | `4.00s` | `0.00s` | `0°` | `0°` | `0°` | `1.05x` | `0%` | `0%` | `1000px` | `Clamp (M1=0)` | **HYPERSCALE TEAMS** / Synchronized Worldwide |

---

### Archetype 7: High-Energy Kinetic Social Reels (9:16 Vertical for TikTok / Shorts)
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

### Archetype 8: Minimalist Studio Luxury Reveals (Apple-Style Specular Sweeps)
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
