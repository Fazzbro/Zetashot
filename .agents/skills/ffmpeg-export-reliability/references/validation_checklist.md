# Video Export Reliability Checklist & Test Matrix

This checklist operationalizes all 77 export reliability principles into verification gates and regression test suites.

---

## 77-Point Verification Checklist

### Master Timeline & Architecture
- [ ] 1. Dedicated Export Architecture (`ExportEngine`, `RenderPlanner`, `FrameRenderer`, `AudioRenderer`, `Encoder`, `Muxer`, `Validator`).
- [ ] 2. Timeline positions use integer microseconds or integer frame indices (no accumulated float drift).
- [ ] 3. Single authoritative master timeline controls stop condition.
- [ ] 4. All input media probed for codec, profile, SAR/DAR, start timestamp, and VFR.
- [ ] 5. Source timestamps normalized before compositing.
- [ ] 6. Duration determined from stream timestamps, not untrusted container headers.
- [ ] 7. Deterministic frame loop: `timestamp = frame_index / fps`.
- [ ] 8. First-frame-only prevention: `expected_frames = ceil(duration * fps)`, reject `frames == 1` for multi-second clips.
- [ ] 9. Never rely blindly on `-t` or `-shortest` to terminate rendering.
- [ ] 10. Multi-clip timeline evaluated as "what exists at timestamp T" (clips ending early don't stop the pipeline).
- [ ] 11. Timeline gaps explicitly filled (black, transparent canvas, or background).
- [ ] 12. Variable frame rate (VFR) inputs mapped to master project frame clock.
- [ ] 13. Output frame clock fixed (e.g. constant 60.000 fps, constant timebase `1/60`).
- [ ] 14. Audio has separate mixing pipeline normalized to master sample rate (48 kHz).
- [ ] 15. A/V duration sync delta <= 80ms.
- [ ] 16. Buffer reuse race conditions eliminated (immutable / ref-counted buffers).
- [ ] 17. Frame buffer safety verified during async encoding.
- [ ] 18. GPU rendering explicitly synchronized before host transfer.
- [ ] 19. Sequential frame decoding preferred over repetitive random seeks.
- [ ] 20. Frame caching distinguishes source clip, timestamp, and composited effect state.
- [ ] 21. Preview logic completely decoupled from export render logic.
- [ ] 22. Export writes to temporary file first (`*.tmp.mp4`), finalized via atomic rename.
- [ ] 23. File extension matches actual internal container header.
- [ ] 24. Codec and container compatibility validated pre-render.
- [ ] 25. Never silently fall back to alternative codec on encoder failure.
- [ ] 26. FFmpeg arguments generated strictly from structured `ExportConfig` data models.
- [ ] 27. Machine-readable output used for progress and diagnostics (`-progress`, `-print_format json`).
- [ ] 28. Complete diagnostic record captured per export.
- [ ] 29. 12-state export state machine implemented.
- [ ] 30. Progress calculated from `rendered_time / total_timeline_duration`.
- [ ] 31. Independent post-export validation pass mandatory.
- [ ] 32. 100% full-decode test executed via `ffmpeg -v error -i <file> -f null -`.
- [ ] 33. Seekability tested at 0%, 10%, 25%, 50%, 75%, 90%, 99%.
- [ ] 34. Decoded timestamp matching verified at random checkpoints.
- [ ] 35. Frozen video detection active for multi-second static spans.
- [ ] 36. Consecutive duplicate frame detection active to catch frozen pipelines.
- [ ] 37. Rapid luminance flickering/blinking detection active.
- [ ] 38. Unexpected black frame detection active.
- [ ] 39. Timestamp monotonicity (PTS/DTS) verified across all packets.
- [ ] 40. Final duration validated using frame-aware tolerance (±2 frames).
- [ ] 41. Exported file verified loadable by host application media player.
- [ ] 42. Complete pipeline flush across all encoder and muxer handles.
- [ ] 43. Encoder delay compensation configured.
- [ ] 44. Controlled hardware encoder fallback.
- [ ] 45. Output width and height match requested dimensions.
- [ ] 46. Pixel format and color space preserved.
- [ ] 47. Rotation metadata normalized.
- [ ] 48. Regression media suite maintained.
- [ ] 49. Preset matrix validated.
- [ ] 50. Layered failure isolation active.
- [ ] 51. Export debug mode active.
- [ ] 52. Automated failure classification enabled.
- [ ] 53. Actionable developer diagnostics logged.
- [ ] 54. Targeted retry strategy.
- [ ] 55. Deterministic flag configuration.
- [ ] 56. Golden export baseline comparison.
- [ ] 57. Quality presets configured.
- [ ] 58. Export presets immutable at start.
- [ ] 59. Project state snapshotted prior to export.
- [ ] 60. 14-gate success criteria verified.
- [ ] 61. Exit code 0 != success rule enforced.
- [ ] 62. NLE-grade architecture followed.

### In-Browser & WebAssembly (WASM) Subsystem
- [ ] 63. Deterministic sequential WASM frame loop ($k = 0 \dots N-1$) with `image2` demuxer.
- [ ] 64. Cross-Origin Isolation (`COOP: same-origin`, `COEP: credentialless`) configured for multi-threaded `SharedArrayBuffer`.
- [ ] 65. Canonical coordinate normalization scale factor ($S = 	ext{height} / 540$) applied to preview and export identically.
- [ ] 66. WebGL & Canvas zero-leak memory lifecycle (single canvas, immediate WASM FS unlink).
- [ ] 67. Boundary-clamped trajectory splines with zero boundary velocity ($v_0 = 0, v_{	ext{end}} = 0$).
- [ ] 68. HTML5 video seeking with `seeked` Promise barriers.
- [ ] 69. Target export dimensions clamped to even integers ($W, H \pmod 2 = 0$).
- [ ] 70. Multi-track audio resampled and mixed to 48 kHz WAV via `OfflineAudioContext`.
- [ ] 71. Virtual WASM FS cleanup guaranteed in `try...finally` block.
- [ ] 72. Dedicated Web Worker execution with decoupled rendering vs muxing progress.
- [ ] 73. Native child process stderr continuous pipe drainage avoiding 64KB OS buffer deadlock.
- [ ] 74. Hardware-accelerated WebCodecs pipeline (`VideoEncoder` + `mp4-muxer`) with direct canvas frame streaming.
- [ ] 75. Continuous real-time `frame=\s*(\d+)` log telemetry parsing for image sequence demuxing.
- [ ] 76. Direct planar PCM `AudioBuffer` multiplexing with `-c:v copy` fast stream-copy remux fallback.
- [ ] 77. Ultrafast WASM fallback preset profiling (`-preset ultrafast -tune zerolatency -crf 23`).
