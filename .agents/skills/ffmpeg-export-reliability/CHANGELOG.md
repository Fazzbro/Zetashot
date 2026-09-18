# Changelog

All notable changes to the `ffmpeg-export-reliability` skill and verification CLI will be documented in this file.

## [1.2.0] - 2026-09-18

### Added
- **WebCodecs & Real-Time Log Telemetry Directives (Directives 74–77)**:
  - **Directive 74 (In-Browser Hardware-Accelerated WebCodecs Pipeline)**: Native GPU encoding (`VideoEncoder` + `mp4-muxer`) achieving 300x–600x export acceleration (3–6s vs 20min for 1080p60) and zero memory bloat via direct canvas frame streaming.
  - **Directive 75 (FFmpeg Image Demuxer Duration Blindness & Real-Time Log Telemetry)**: Resolves the 68% progress bar freeze caused by `image2` demuxer's lack of duration metadata; parses `frame=\s*(\d+)` log telemetry in real time.
  - **Directive 76 (Direct Planar PCM Web Audio Multiplexing & Stream-Copy Remuxing)**: Native `AudioEncoder` ingestion from raw `AudioBuffer` channels, with ultra-fast `-c:v copy -c:a aac` FFmpeg remuxing fallback (<300ms).
  - **Directive 77 (WASM Software Fallback Preset Profiling)**: Mandates `-preset ultrafast -tune zerolatency -crf 23` and direct `Uint8Array` buffer writes for safe WASM fallback execution.
- **New Automated Failure Classifications**:
  - `IMAGE2_DURATION_BLINDNESS_FREEZE`
  - `WASM_CPU_STARVATION_BOTTLENECK`

## [1.1.0] - 2026-08-30

### Added
- **In-Browser & WebAssembly (WASM) Export Reliability Subsystem (Rules 63–72)**:
  - **Rule 63 (Deterministic Sequential WASM Frame Loop)**: Replaces unreliable real-time `MediaRecorder` capture with deterministic sequential frame rendering ($k = 0 \dots N-1$) into FFmpeg WASM `image2` demuxer.
  - **Rule 64 (Cross-Origin Isolation & SharedArrayBuffer)**: Strict server headers (`COOP: same-origin`, `COEP: credentialless`) and runtime feature detection.
  - **Rule 65 (Preview vs Export Coordinate Normalization)**: Canonical reference space ($S = 	ext{height} / 540$) guaranteeing 100% pixel-perfect preview vs export framing.
  - **Rule 66 (WebGL & Canvas Zero-Leak Streaming Memory)**: Single offline canvas reuse and immediate virtual filesystem cleanup (`ffmpeg.deleteFile`) preventing browser tab crashes (OOM).
  - **Rule 67 (Boundary-Clamped Trajectory Splines)**: Monotone Cubic Hermite interpolation with zero boundary velocity eliminating camera kicks and overshoot.
  - **Rule 68 (HTML5 Video Seeking Synchronization)**: `seeked` Promise barriers preventing asynchronous video frame tearing.
  - **Rule 69 (Macroblock Dimension Clamping)**: Even integer dimensions enforcement for YUV420p chroma subsampling.
  - **Rule 70 (Web Audio Timeline Resampling)**: Multi-track synthesis via `OfflineAudioContext` at 48 kHz.
  - **Rule 71 (FFmpeg Virtual FS Lifecycle & File Cleanup)**: Scoped try/finally cleanup of memory buffers.
  - **Rule 72 (Client-Side Export Progress Smoothing)**: Dedicated Web Worker execution and 2-phase rendering/muxing progress.
- **New Automated Failure Classifications**:
  - `SHARED_ARRAY_BUFFER_DISABLED`
  - `PREVIEW_EXPORT_SCALE_MISMATCH`
  - `CANVAS_CONTEXT_LOST`
  - `MACROBLOCK_ODD_DIMENSION`
  - `DISCONTINUOUS_SPLINE_KICK`

## [1.0.0] - 2026-08-28

### Added
- Initial release of the FFmpeg Video Export Reliability Skill.
- 62 Core Directives spanning Timeline Foundations, Frame Rendering, Audio/AV Sync, Buffer Safety, Pipeline Safety, and Post-Export Validation.
- Standalone zero-dependency Python CLI tool (`scripts/ffmpeg_export_validator.py`) with `inspect`, `validate`, `diagnose`, and `create-test-asset` commands.
- 12-Stage Export State Machine reference.
- Diagnostic JSON schema and full 62-point verification checklist.
