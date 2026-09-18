---
name: ffmpeg-export-reliability
description: >-
  Enforces deterministic, complete, frame-accurate, and glitch-free video exports across both
  desktop/server FFmpeg and in-browser WebCodecs / WebAssembly (WASM) / WebGL rendering engines.
  Synthesizes 77 hardcore export reliability principles including master timeline normalization,
  hardware-accelerated WebCodecs pipelines, discrete CFR frame-based rendering, preview vs export coordinate normalization, COOP/COEP
  cross-origin isolation, audio mixing & AV sync validation, full-decode stream integrity checks,
  multi-point seekability verification, GPU memory lifecycle safety, and automated failure diagnosis.
---

# FFmpeg Video Export Reliability Skill

## Overview

Video export is **NOT** considered successful merely because FFmpeg exits with code `0`. An exit code of `0` only indicates that the FFmpeg process finished executing—it provides zero guarantee that the exported video is frame-accurate, uncorrupted, playable, seekable, audio-synced, or visually identical to the editor timeline.

This skill equips AI agents and developers with the architectural constraints, rendering protocols, and post-export verification suite required to build and maintain **deterministic NLE-grade video export engines** across both **desktop/server backends** and **in-browser WebGL / WebAssembly (WASM) studios**.

```
EDITOR TIMELINE (State / Keyframes)
      │
NORMALIZED TIMELINE MODEL (Master Integer Clock / Canonical Coordinates)
      │
RENDER PLAN (Explicit Gaps & Layer Resolution)
      │
FRAME-BASED RENDERING & COMPOSITING (Canvas / WebGL / Shaders)
      │
AUDIO RESAMPLING & MIXING (Offline AudioContext / 48kHz WAV)
      │
ENCODING (Deterministic Frames / FFmpeg WASM Virtual FS / Native Pipe)
      │
MUXING (Temporary File / Memory Flush & Atomic Finalize)
      │
POST-EXPORT VALIDATION (Decode + Seek + AV Sync + Visual Integrity)
      │
VERIFIED FINAL FILE
```

---

## Dependencies

- **Desktop/Server**: `ffmpeg` (>= 4.4) and `ffprobe` (>= 4.4) on the system `PATH`. Python 3.8+ for validation suite.
- **In-Browser / WebAssembly**: `@ffmpeg/ffmpeg` (>= 0.12) with `@ffmpeg/util` or equivalent WASM build, requiring `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` for multithreaded `SharedArrayBuffer` support.

---

## Quick Start

### 1. Validate an Exported Video File

Run complete post-export verification against your master timeline specifications:

```bash
python scripts/ffmpeg_export_validator.py validate \
  --input output_video.mp4 \
  --expected-duration 12.500 \
  --expected-fps 60 \
  --expected-width 1920 \
  --expected-height 1080 \
  --expected-frames 750 \
  --output validation_report.json
```

### 2. Inspect Source Media Before Rendering

Extract normalized stream parameters, detect VFR (Variable Frame Rate), and inspect start timestamps:

```bash
python scripts/ffmpeg_export_validator.py inspect \
  --input source_clip.mov \
  --output media_analysis.json
```

### 3. Diagnose an Export Failure

Generate root-cause classification and remediation advice from a failed validation report:

```bash
python scripts/ffmpeg_export_validator.py diagnose \
  --report validation_report.json
```

---

## The 77 Core Directives of Video Export Reliability

### Section I: Architecture & Timeline Foundations
1. **Modular Architecture**: Strictly separate `EditorTimeline`, `NormalizedTimelineModel`, `RenderPlanner`, `FrameRenderer`, `AudioRenderer`, `Encoder`, `Muxer`, and `Validator`. Never let UI or effects code assemble ad-hoc FFmpeg strings.
2. **Never Trust Floating-Point Timeline Math**: Store internal time as **integer microseconds** or **integer frame indices**. For CFR, derive timestamp `t = frame_index / fps`. Avoid cumulative addition (`t += dt`) to prevent long-video drift.
3. **One Authoritative Master Timeline**: Single master definition of `start`, `end`, `duration`, `fps`, `resolution`, `sample_rate`. Never let individual clip durations decide when export stops.
4. **Normalize All Inputs**: Probe every input media clip with `ffprobe` for codec, SAR/DAR, pixel format, duration, start time, and VFR status before rendering.
5. **Normalize Source Timestamps**: Handle negative PTS, non-zero start timestamps, and timestamp resets prior to compositing.
6. **Never Trust Source Duration Blindly**: Calculate duration from decoded packet timestamps rather than untrusted container headers.

### Section II: Deterministic Frame Rendering
7. **Deterministic Frame Loop**: Render on a strict integer frame clock:
   ```python
   for frame_index in range(total_expected_frames):
       timestamp = frame_index / fps
       frame = render_composited_frame(timestamp)
       encode(frame)
   ```
8. **Prevent First-Frame-Only Exports**: Calculate `expected_frames = ceil(duration * fps)`. If `actual_frames == 1` for a multi-second timeline, **FAIL EXPORT IMMEDIATELY**.
9. **Never Rely Blindly on -t or -shortest**: FFmpeg stream-cutting flags can terminate prematurely if any input stream or filter runs out of packets. Enforce duration programmatically.
10. **Independent Clip Lifetimes**: When Clip A ends at 10s on a 20s timeline, the renderer must not terminate. Evaluate "what exists at timestamp T" rather than "is the clip producing frames."
11. **Explicit Timeline Gap Handling**: Define fallback for gaps (black, transparent canvas, background). Never allow decoder stall to dictate output.
12. **Variable Frame Rate (VFR) Normalization**: Map VFR source timestamps into the master timeline's constant frame clock.
13. **Force Consistent Output Frame Clock**: Enforce fixed output FPS and timebase (e.g. 60 fps, `1/60` timebase) across the entire export.

### Section III: Audio Pipeline & AV Synchronization
14. **Independent Audio Mixing Pipeline**: Mix and resample all audio streams to standard master sample rate (48 kHz, 16-bit or 32-bit float stereo) prior to muxing.
15. **Mandatory AV Sync Validation**: Compare video duration vs audio duration. If discrepancy exceeds tolerance (> 80ms), declare **EXPORT FAILED**.

### Section IV: Buffer Safety & GPU Synchronization
16. **Eliminate Blinking & Glitches**: Treat every frame render(N) as an independent deterministic operation. Avoid shared mutable state across render passes.
17. **Frame Buffer Safety**: Never pass a mutable buffer to an asynchronous encoder and reuse it in the next render iteration. Use copy-on-write or reference-counted immutable frame buffers.
18. **Explicit GPU Synchronization**: Synchronize GPU render pipelines (`glFinish()`, `vkQueueWaitIdle()`, or fence sync) before reading pixels back to CPU / encoder memory.
19. **Sequential Decoding Over Random Seeks**: Read source media sequentially to avoid decoder seeking artifacts, dropped B-frames, or frozen frames.
20. **Timeline-Aware Frame Cache**: Cache keys must include `(clip_id, source_timestamp, effect_state, timeline_timestamp)`.

### Section V: Pipeline Safety & File Management
21. **Decouple Preview and Export**: Never share downscaled preview caches or approximate shaders with final export pipelines.
22. **Export to Temporary File First**: Render to `export.tmp.mp4`. Run full validation. Only perform an atomic rename to final destination on 100% pass.
23. **Container-Extension Agreement**: Enforce strict mapping (`.mp4` -> MP4 muxer, `.mov` -> MOV muxer, `.webm` -> WebM muxer).
24. **Pre-Validate Codec/Container Compatibility**: Reject invalid combinations (e.g. ProRes in MP4) before launching the render.
25. **Never Silently Fall Back**: If hardware or requested codec fails, report explicit failure rather than silently switching codecs.
26. **Structured ExportConfig Model**: Generate CLI arguments exclusively from validated configuration dataclasses/schemas.
27. **Machine-Readable Progress & Parsing**: Use `-progress pipe:1` or structured logging rather than regexing human console output.
28. **Comprehensive Diagnostics Capture**: Record environment, timings, frame counts, FFmpeg logs, and validation results per export.
29. **12-State Export State Machine**: Maintain strict state progression (`IDLE` -> `VALIDATING_PROJECT` -> ... -> `SUCCESS`).
30. **Master Timeline Progress Calculation**: Progress = `rendered_seconds / total_duration`. Never display 100% until post-validation passes.

### Section VI: Post-Export Validation (Mandatory Gates)
31. **Mandatory Post-Export Validation Pass**: Every export must pass independent verification before user notification.
32. **100% Full-Decode Test**: Execute `ffmpeg -v error -i <file> -f null -`. Any decoding error fails the export.
33. **Multi-Point Seekability Test**: Seek to 0%, 10%, 25%, 50%, 75%, 90%, 99% and verify frame decode.
34. **Random Frame Validation**: Compare decoded PTS against expected timeline timestamps across checkpoints.
35. **Frozen Output Detection**: Identify unwanted static frame spans in dynamic scenes.
36. **First-Frame Replication Detection**: Detect encoder pipeline stalls where frame 0 is repeated continuously.
37. **Blinking & Flash Detection**: Detect rapid luminance alternating patterns caused by buffer race conditions.
38. **Black Frame Detection**: Spot-check for unrendered layers or failed texture uploads.
39. **Timestamp Monotonicity**: Verify packet DTS/PTS strictly increments without backward jumps.
40. **Final Duration Verification**: Check duration with frame-aware tolerance (±2 frames).
41. **Host Application Reopen Test**: Verify the application's own playback component can parse and render the output.
42. **Complete Pipeline Flush**: Flush frame renderer, video encoder, audio encoder, and muxer before closing file handles.
43. **Encoder Delay Compensation**: Account for buffered frames in hardware or B-frame pipelines during flush.
44. **Controlled Hardware Fallback**: Log GPU driver errors and only fallback to software if explicitly permitted by config.
45. **Pixel Dimension Verification**: Confirm output `width` and `height` exactly match requested preset.
46. **Pixel Format Preservation**: Maintain color space and chroma subsampling (`yuv420p`, `nv12`, etc.).
47. **Rotation Metadata Normalization**: Handle smartphone portrait flags without applying double-rotation.

### Section VII: Testing, Quality & Error Recovery
48. **Maintain Regression Media Suite**: Test clips of varying lengths (1s, 5s, 60s, 10m), silent, audio-only, 4K, portrait, VFR, and gaps.
49. **Export Preset Test Matrix**: Validate matrix of container/codec/resolution combinations.
50. **Layered Failure Isolation**: Isolate timeline -> renderer -> encoder -> muxer -> decoder when triaging bugs.
51. **Export Debug Mode (EXPORT_DEBUG=1)**: Dump intermediate render plans, analysis JSON, and ffmpeg logs upon request.
52. **Automated Failure Classification**: Map errors to standard taxonomy (`DURATION_MISMATCH`, `AUDIO_VIDEO_DESYNC`, etc.).
53. **Actionable Developer Feedback**: Emit stage, expected vs actual values, and likely subsystem causes.
54. **Targeted Retry Strategy**: Never blindly retry identical commands; diagnose and patch root causes.
55. **No Trial-and-Error Flag Guessing**: Understand timestamp and filter graph mechanics before changing FFmpeg flags.
56. **Golden Export Baselines**: Compare visual and structural outputs against known-good reference exports.
57. **Configurable Quality Presets**: Map `LOW`, `MEDIUM`, `HIGH`, `LOSSLESS` to explicit codec bitrates and CRF/CQP values.
58. **Immutable Export Presets**: Snapshot settings at render initiation; reject mid-export mutation.
59. **Immutable Project Snapshot**: Freeze timeline objects before rendering starts.
60. **14-Gate Success Criteria**: Display "EXPORT SUCCESS" only after all 14 validation gates pass.
61. **The Golden Rule**: Exit code 0 != export success.
62. **NLE-Grade Mindset**: Build export systems with the rigor of professional non-linear editing render engines.

---

### Section VIII: In-Browser, WebGL & WebAssembly (WASM) Export Reliability
63. **Deterministic Sequential WASM Frame Loop**:
    - **Never use `MediaRecorder` or `requestAnimationFrame` for high-resolution exports**. Real-time canvas recording drops frames under heavy GPU load and causes severe first-frame duplication when frame rendering takes >16.6ms.
    - Drive the export loop strictly by discrete integer frame indices:
      ```typescript
      const totalFrames = Math.round(duration * fps);
      for (let k = 0; k < totalFrames; k++) {
        const timestamp = k / fps;
        await renderSceneAtTimestamp(timestamp);
        const pngBlob = await canvasToBlob(offscreenCanvas, 'image/png');
        const buffer = new Uint8Array(await pngBlob.arrayBuffer());
        const fileName = `frame_${k.toString().padStart(6, '0')}.png`;
        await ffmpeg.writeFile(fileName, buffer);
        onProgress(Math.round(((k + 1) / totalFrames) * 100));
      }
      // Encode image sequence at constant frame rate
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', 'frame_%06d.png',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'output.mp4'
      ]);
      ```
64. **Cross-Origin Isolation for SharedArrayBuffer**:
    - Multi-threaded FFmpeg WASM strictly requires `SharedArrayBuffer`, which modern browsers disable unless Cross-Origin Isolation is active.
    - Web servers (Netlify, Vercel, Vite, Cloudflare Pages) must send:
      ```http
      Cross-Origin-Opener-Policy: same-origin
      Cross-Origin-Embedder-Policy: credentialless
      ```
    - The client-side export engine must detect `crossOriginIsolated === true` and provide a clear, user-friendly diagnostic or fallback path if isolated context is missing.
65. **Preview vs Export Deterministic Coordinate Normalization (S)**:
    - The live DOM preview canvas and final 1920x1080 export canvas run at different physical pixel dimensions.
    - Establish a **canonical reference coordinate space** (e.g., 960x540 base canvas with 720x405 mockup frame = exact 75.000% frame fill).
    - **Preview Scale Factor**: `S_preview = currentStageHeight / 540` (derived via `ResizeObserver`).
    - **Export Scale Factor**: `S_export = exportCanvasHeight / 540` (e.g., 1080 / 540 = 2.0).
    - Scale all spatial coordinates uniformly by S:
      - `Width = Width_base * S`
      - `Height = Height_base * S`
      - `PanX = PanX_base * S`, `PanY = PanY_base * S`
      - `Perspective = Perspective_base * S`
      - `BorderRadius = BorderRadius_base * S`
    - This mathematical guarantee eliminates all framing, zoom-out, and aspect ratio discrepancies between preview and exported video.
66. **WebGL & Canvas Zero-Leak Streaming Memory Architecture**:
    - Never hold hundreds of raw frame blobs or `ImageData` objects in browser memory arrays during export loop.
    - Allocate a single persistent offline canvas and 2D/WebGL context for the entire export session.
    - After writing each frame to FFmpeg WASM virtual filesystem, delete the frame from the virtual filesystem immediately after muxing to prevent browser tab crashes (OOM):
      ```typescript
      for (let k = 0; k < totalFrames; k++) {
        const fileName = `frame_${k.toString().padStart(6, '0')}.png`;
        await ffmpeg.deleteFile(fileName);
      }
      ```
67. **Boundary-Clamped Trajectory Splines & Monotone Slope Limiting**:
    - Camera keyframe trajectories must use Monotone Cubic Hermite interpolation (Fritsch-Carlson slope limiting).
    - Clamp boundary velocity to zero (`v(t0) = 0`, `v(tend) = 0`) to eliminate camera velocity kicks and trajectory overshoot when entering or leaving keyframe spans.
    - Ensure smooth C1 derivative continuity across multi-point waypoint transitions.
68. **HTML5 Video Seeking Synchronization & Pre-Decoding Barriers**:
    - When compositing uploaded video layers onto the 3D canvas, never use `.play()`.
    - Seek the HTML5 video element explicitly to `t = k / FPS` using a `seeked` event Promise barrier:
      ```typescript
      async function seekVideoToTime(video: HTMLVideoElement, targetTime: number): Promise<void> {
        return new Promise((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = targetTime;
        });
      }
      ```
    - Ensure `<video>` has `crossOrigin="anonymous"` and `playsInline` attributes to prevent tainted canvas exceptions.
69. **Macroblock & Chroma Subsampling Dimension Clamping (W, H % 2 == 0)**:
    - Video codecs (such as H.264 `libx264` with `yuv420p` subsampling) strictly fail if width or height is odd.
    - Clamp all export dimensions to even integers before rendering:
      ```typescript
      const width = Math.floor(rawWidth / 2) * 2;
      const height = Math.floor(rawHeight / 2) * 2;
      ```
70. **Web Audio Timeline Resampling & OfflineBuffer Audio Synthesis**:
    - Pre-decode timeline sound effects and background audio into `AudioBuffer` objects using `AudioContext.decodeAudioData()`.
    - Synthesize complete timeline audio using `OfflineAudioContext` at 48 kHz sample rate.
    - Export audio as an uncompressed WAV buffer and pass directly to FFmpeg WASM:
      ```typescript
      await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', 'frame_%06d.png',
        '-i', 'audio.wav',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        'output.mp4'
      ]);
      ```
71. **FFmpeg Virtual FS Lifecycle & File Cleanup**:
    - Ensure virtual input files (`frame_*.png`, `audio.wav`) and output artifacts (`output.mp4`) are explicitly unlinked from WASM memory after binary download.
    - Wrap the export routine in a `try...finally` block that guarantees cleanup even on export cancellation or runtime error.
72. **Client-Side Export Progress Smoothing & Worker Message Protocol**:
    - Separate frame rendering progress (0% -> 85%) from FFmpeg WASM muxing progress (85% -> 100%).
    - Run FFmpeg encoding in a dedicated Web Worker to keep the UI thread fully responsive during long rendering jobs.
73. **Native Child Process Pipe Drainage & Zero-Copy Binary IPC (Eliminating the 99% Deadlock)**:
    - **The Stderr Deadlock Problem**: When spawning native desktop/server FFmpeg via child process pipes (e.g. in Node.js, Electron, Python, or C#) with `stdio: ['pipe', 'ignore', 'pipe']` or `stderr=subprocess.PIPE`, the OS allocates a fixed pipe buffer (typically 64 KB). FFmpeg continuously writes frame encoding telemetry, stream timestamps, and muxing statistics to `stderr`. If the parent process does **not continuously read or drain `stderr`**, the 64 KB OS buffer completely fills up during the final container flush and stream finalization (right at 99% progress). FFmpeg synchronously blocks on `write(stderr, ...)`, waiting for the pipe to drain, while the parent process waits for the process to exit (`process.on('close')`), causing an **unrecoverable deadlock where export hangs indefinitely at 99%**.
    - **Continuous Stderr Drainage**: Always attach an active data listener that drains `stderr` into a rolling ring buffer (retaining the last 4 KB for failure diagnostics without unbounded memory growth):
      ```typescript
      const ffmpegProc = spawn('ffmpeg', args, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
      let stderrLog = '';
      ffmpegProc.stderr.on('data', (chunk: Buffer) => {
        stderrLog = ((stderrLog || '') + chunk.toString()).slice(-4000);
      });
      ```
    - **Zero-Copy Binary IPC vs. Base64 Main-Thread Freezing**: Never serialize 50MB–100MB+ finalized video files into base64 strings (`fileBuffer.toString('base64')`). Base64 adds 33% memory bloat and causes a catastrophic 10–30 second renderer main-thread freeze when decoded with `atob()` and character loops. Transfer raw binary `Uint8Array` / Node.js `Buffer` directly over Electron/Worker IPC via structured cloning, instantiating the client `Blob` in $<1\text{ms}$:
      ```typescript
      const finalBlob = new Blob([finishRes.fileBuffer as BlobPart], { type: mimeType });
      ```
    - **Explicit Finalization State & Safety Watchdog**: Clearly distinguish the frame rendering phase (0%–98%) from container finalization and container header writing (99%–100%). Display informative status text (*"Finalizing & Muxing Video... • Writing container headers and flushing stream..."*) and enforce a hard safety timeout watchdog (e.g. 45–60s) to terminate stuck processes cleanly.
74. **In-Browser Hardware-Accelerated WebCodecs Pipeline (300x Speedup & Zero-Blob RAM Accumulation)**:
    - **The Single-Threaded WASM Bottleneck**: In client-side web apps (e.g. deployed on Vercel, Netlify, or AWS), relying strictly on single-threaded software WebAssembly `libx264` (`@ffmpeg/core`) to encode 1080p60 frames creates an untenable CPU bottleneck. Software WASM encodes at only ~0.3 to 0.7 frames per second, causing a 10–15s clip (600–900 frames) to take **15 to 30 minutes** while accumulating 200MB+ of JPEG/PNG blobs in RAM and WASM MEMFS, frequently crashing browser tabs with Out-of-Memory (OOM) errors.
    - **Native WebCodecs Hardware Acceleration**: Modern browsers (Chrome 94+, Edge 94+, Safari 16.4+, Firefox) natively expose GPU video encoders via the WebCodecs API (`window.VideoEncoder`).
    - **Direct Canvas Frame Ingestion**: Feed the render canvas directly into `new VideoFrame(canvas, { timestamp })` in $<1\text{ms}$ on the GPU. Immediately dispatch to `VideoEncoder.encode(videoFrame, { keyFrame })` and call `videoFrame.close()`. Never accumulate arrays of `Blob` or `ImageData` objects in browser memory.
    - **Lightweight Native Container Muxing**: Pair WebCodecs with a pure TypeScript/JavaScript zero-dependency multiplexer (e.g. `mp4-muxer`). Mux video and audio chunks synchronously as they are emitted from the hardware encoder callbacks.
    - **Performance Yield**: Renders and encodes a 1080p60 video in **~3 to 6 seconds** instead of 20+ minutes (a 300x–600x acceleration) with constant $<50\text{MB}$ memory footprint.
75. **FFmpeg Image Sequence Demuxer Duration Blindness & Real-Time Log Telemetry (Eliminating the 68% Progress Freeze)**:
    - **The Image2 Demuxer Duration Blindness**: When demuxing raw image sequences in FFmpeg WASM (`-i seq_%05d.jpg`), FFmpeg has no container header to inspect and cannot calculate the total stream duration ahead of time. Consequently, internal `@ffmpeg/ffmpeg` progress events report `progress: 0` throughout the entire encoding pass.
    - **The Hardcoded Progress Lock Anti-Pattern**: If an export engine attempts to report a staged milestone (e.g., `onProgress(68)`) prior to launching FFmpeg WASM encoding, the progress bar freezes completely at 68% for 15–30 minutes, misleading users into believing the web application has crashed or hung indefinitely.
    - **Real-Time Log Telemetry**: Always parse FFmpeg stdout/stderr logs in real time using a regex matching `frame=\s*(\d+)`. Compare the parsed frame count against the master timeline's known `totalExpectedFrames` to compute true, smooth progress:
      ```typescript
      ffmpeg.on('log', ({ message }) => {
        const match = message.match(/frame=\s*(\d+)/);
        if (match && totalExpectedFrames > 0) {
          const currentFrame = parseInt(match[1], 10);
          const percent = Math.min(99, Math.round((currentFrame / totalExpectedFrames) * 100));
          onProgress(percent);
        }
      });
      ```
    - **Dynamic Progress Callback Attachment**: Never lock progress callbacks inside a singleton instance closure. Expose dynamic listener setters (`setFFmpegProgressListener`) to ensure subsequent exports receive live progress events.
76. **Direct Planar PCM Web Audio Multiplexing & Stream-Copy Remuxing (`-c:v copy`)**:
    - **The Audio Round-Trip Waste**: When timeline effects (sound effects, transitions, typography stingers) synthesize procedural audio, forcing audio through WAV blob creation and subsequent software re-encoding in WASM alongside video frames exhausts browser threads.
    - **Direct PCM Audio Ingestion**: Extract raw planar PCM channel data (`audioBuffer.getChannelData(c)`) directly into `AudioData` chunks for native hardware `AudioEncoder` (`mp4a.40.2`).
    - **Fast Stream-Copy Audio Remuxing**: If the host browser supports hardware `VideoEncoder` but lacks native `AudioEncoder`, finalize the video stream first with WebCodecs, then perform an ultra-fast audio remux via FFmpeg WASM using `-c:v copy -c:a aac`. Stream copying bypasses video re-encoding completely, muxing audio and video in $<300\text{ms}$.
77. **WASM Software Fallback Preset Profiling (`-preset ultrafast -tune zerolatency -crf 23`)**:
    - **Fallback Profile Requirements**: If WebCodecs is unsupported (e.g. legacy browsers or headless CI environments) and software WASM `libx264` must be used as fallback, never use production desktop presets like `-preset veryfast` or `-crf 17` at 1080p.
    - **Zero-Latency Ultrafast Configuration**: Enforce `-preset ultrafast -tune zerolatency -crf 23 -pix_fmt yuv420p`. This cuts software WASM encoding time by over 10x while maintaining acceptable visual quality for web previews and fallbacks.
    - **Direct ArrayBuffer Write**: Transfer blobs to MEMFS using `new Uint8Array(await blob.arrayBuffer())` directly, avoiding unnecessary `FileReader` abstractions or intermediate data URL serialization.

---

## Automated Failure Classifications

| Classification | Primary Cause | Immediate Remediation |
|---|---|---|
| `FIRST_FRAME_REPLICATION` | Real-time `MediaRecorder` starvation or render loop failed to increment discrete frame index | Replace real-time recorder with deterministic sequential frame loop (`k = 0 ... N-1`) |
| `PREVIEW_EXPORT_SCALE_MISMATCH` | Coordinates or perspective calculated in unnormalized screen pixels rather than canonical base scale (S) | Multiply width, height, pan, perspective, and border radius by canonical scale factor `S = height / 540` |
| `SHARED_ARRAY_BUFFER_DISABLED` | Missing COOP / COEP cross-origin headers preventing multi-threaded WASM execution | Configure `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` |
| `CANVAS_CONTEXT_LOST` | WebGL memory leak or holding array of large frame buffers in RAM | Reuse single offline canvas, avoid buffer retention, delete WASM FS frames immediately |
| `MACROBLOCK_ODD_DIMENSION` | Target resolution width or height is not divisible by 2 for YUV420p | Clamp dimensions with `floor(dim / 2) * 2` |
| `DISCONTINUOUS_SPLINE_KICK` | Unclamped cubic tangents causing camera velocity jump or overshoot | Apply Fritsch-Carlson slope limiting and clamp boundary velocity (`v0 = 0`, `vend = 0`) |
| `DURATION_MISMATCH` | Render loop terminated on source EOF instead of master timeline duration | Drive loop by master frame count `ceil(duration * fps)` |
| `AUDIO_VIDEO_DESYNC` | Audio clock diverged from video frame clock or unaligned start PTS | Synthesize audio at 48 kHz using `OfflineAudioContext` and pad/trim to video duration |
| `INVALID_CONTAINER` | Container format header incompatible with file extension | Map extension to muxer explicitly (`-f mp4` for `.mp4`, `-f webm` for `.webm`) |
| `SEEK_FAILURE` | Missing MP4 `moov` atom at file start or corrupted index | Add `-movflags +faststart` for MP4 containers |
| `DECODE_FAILURE` | Corrupted bitstream or unflushed encoder buffer | Flush encoder completely before closing container |
| `GPU_SYNC_FAILURE` | Asynchronous GPU texture readback without barrier | Add `glFinish()` or await canvas blob resolution before encoding frame |
| `PIPE_BUFFER_DEADLOCK` | Child process `stderr` pipe buffer filled (64KB OS limit) during final muxing without being drained, freezing FFmpeg at 99% | Attach active data listener to continuously drain `stderr` into a rolling diagnostic ring buffer |
| `BASE64_IPC_THREAD_STARVATION` | Large video file converted to base64 string and decoded with `atob()`, freezing browser/UI main thread for tens of seconds | Transfer raw binary `Uint8Array` / `Buffer` directly across IPC via structured cloning |
| `IMAGE2_DURATION_BLINDNESS_FREEZE` | FFmpeg WASM image2 demuxer does not know duration; progress callback emits 0 while hardcoded milestone freezes UI (e.g. 68%) | Parse stderr log `frame=\s*(\d+)` against master frame count for real-time progress |
| `WASM_CPU_STARVATION_BOTTLENECK` | Single-threaded WASM libx264 veryfast/CRF17 encoding 1080p frames at 0.4 FPS, locking tab for 20+ minutes | Switch to hardware-accelerated WebCodecs `VideoEncoder` with zero-allocation `VideoFrame` streaming |

---

## Common Mistakes & Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Using `canvas.captureStream()` + `MediaRecorder` for 4K/60FPS export | GPU / CPU frame lag drops frames, leading to stuttering or single-frame output | Use sequential frame-by-frame rendering into FFmpeg WASM image2 demuxer |
| Hardcoding pixel positions in 3D camera transforms | Preview looks right on 1080p monitor but shrinks on export canvas | Normalize all coordinates to canonical coordinate base (`S = height / 540`) |
| Assuming `SharedArrayBuffer` is always available | Fails with `ReferenceError` on Netlify or Vercel without COOP/COEP headers | Add COOP/COEP headers to `netlify.toml` and `_headers` |
| Accumulating `Array<Blob>` for every frame in memory | Browser tab runs out of memory (OOM) on 10+ second 60 FPS exports | Stream each frame directly to WASM FS and delete temporary files after encoding |
| Not clamping output dimensions to even numbers | FFmpeg `libx264` throws `width not divisible by 2` | Always apply `Math.floor(dim / 2) * 2` to export resolutions |
| Relying on `process.exitCode === 0` | FFmpeg can write broken headers or 1 frame and exit 0 | Run mandatory post-export `validate` suite |
| Adding `current_time += 0.03333` in a loop | Floating point rounding error accumulates over long videos | Use discrete frame clock: `timestamp = frame_index / fps` |
| Overwriting target file directly | If export crashes halfway, previous good export is destroyed | Write to `.tmp.mp4` and atomically rename on validation pass |
| Spawning FFmpeg with `stdio: ['pipe', ..., 'pipe']` without draining `stderr` | 64KB OS pipe buffer fills up during final container flush; FFmpeg deadlocks on write and hangs at 99% forever | Continuously consume `stderr.on('data', ...)` into a rolling buffer or redirect to file/ignore |
| Converting video file buffer to base64 over IPC and parsing with `atob()` | Freezes renderer main thread for 10–30s on 50MB+ exports, appearing as an export stall | Pass raw `Uint8Array` directly over IPC and create `Blob` in $<1\text{ms}$ |
| Relying on software WASM `libx264` (`-preset veryfast -crf 17`) for 1080p60 on web | Single-thread WASM encodes at ~0.4 FPS, taking 15–30 minutes and holding hundreds of JPEGs in MEMFS | Use hardware-accelerated WebCodecs `VideoEncoder` + `mp4-muxer` (3–5s render) |
| Hardcoding progress milestone (e.g. 68%) before image sequence `ffmpeg.exec()` | Image2 demuxer emits `progress: 0`; progress bar freezes completely for tens of minutes | Parse real-time `frame=\s*(\d+)` log telemetry dynamically during transcode |
| Re-encoding full video in software WASM just to attach procedural audio | Wasteful CPU re-encode when video bitstream is already valid | Use `-c:v copy -c:a aac` for $<300\text{ms}$ stream-copy audio remuxing |
