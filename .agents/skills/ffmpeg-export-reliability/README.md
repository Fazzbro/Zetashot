# FFmpeg Export Reliability Skill for AI Coding Agents & NLE Engines

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-green.svg)](https://www.python.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-4.4+-orange.svg)](https://ffmpeg.org/)
[![Status: Production](https://img.shields.io/badge/status-production--ready-brightgreen.svg)]()

A comprehensive reliability skill and automated verification CLI designed for **Google Antigravity, Claude Code, Codex, Gemini CLI, and human developers** building video editing applications, AI video agents, and export pipelines across both desktop backends and in-browser WebGL/WASM studios.

Enforces **deterministic, frame-accurate, complete, seekable, and glitch-free video exports** by embedding 77 core architectural principles, an expanded 12-state export pipeline model, and a standalone post-export verification suite.

---

## 🛑 The Core Rule

> **FFmpeg exit code 0 means "FFmpeg finished." It does NOT mean "the video export is correct."**

A video export is only considered successful when it passes all quality gates:

```text
RENDER ➔ ENCODE ➔ MUX ➔ FULL DECODE ➔ 7-POINT SEEK ➔ AV SYNC ➔ REOPEN ➔ SUCCESS
```

---

## ⚡ Key Features

- **77 Hardcore Principles**: Exhaustive rules covering master timeline normalization, integer time clocks, CFR frame loops, GPU synchronization, buffer safety, failure classification, and browser WebCodecs/WASM/WebGL export determinism.
- **In-Browser, WebCodecs & WebAssembly (WASM) Subsystem (Principles 63–77)**:
  - **Hardware-Accelerated WebCodecs Pipeline**: Native GPU encoding (`VideoEncoder` + `mp4-muxer`) yielding 300x–600x export speedups (3–5s vs 20min) with zero-blob memory accumulation.
  - **FFmpeg Image Sequence Duration Blindness Telemetry**: Continuous `frame=\s*(\d+)` log parsing eliminating the infamous 68% progress stall.
  - **Direct Planar PCM Audio Ingestion & Stream-Copy Remuxing**: Direct `AudioBuffer` multiplexing with `-c:v copy` fallback (<300ms mux time).
  - **Ultrafast WASM Fallback Profiling**: `-preset ultrafast -tune zerolatency -crf 23` preventing tab CPU starvation.
  - **Deterministic Sequential WASM Frame Loop**: Eliminates `MediaRecorder` frame-drop and single-frame duplication stalls.
  - **Preview vs Export Scale Normalization Matrix ($S$)**: 100% pixel-perfect alignment between DOM preview and 1080p/4K exported canvases.
  - **Cross-Origin Isolation (`COOP` / `COEP`)**: Strict configuration rules for multi-threaded `SharedArrayBuffer` WASM.
  - **WebGL Memory Lifecycle**: Streaming frame transfers with immediate virtual filesystem unlink to prevent OOM.
  - **Boundary-Clamped Trajectory Splines**: Velocity-continuous Hermite interpolation eliminating camera kicks.
  - **HTML5 Video Seeking Synchronization**: Deterministic `seeked` Promise barriers for multi-layer compositing.
  - **Macroblock Dimension Clamping**: Automatic even-integer enforcement for YUV420p chroma subsampling.
- **Automated Validation CLI (`ffmpeg_export_validator.py`)**: Zero-dependency Python CLI tool providing:
  - **`inspect`**: Deep probing of containers, SAR/DAR, pixel formats, start timestamps, and VFR detection.
  - **`validate`**: 11-point post-export verification (container check, duration tolerance, CFR frame count check, single-frame export blocking, AV sync delta, full-stream decode integrity, 7-checkpoint seekability test, timestamp monotonicity, and black/frozen frame detection).
  - **`diagnose`**: Ingests validation reports and maps errors to actionable root causes.
  - **`create-test-asset`**: Generates synthetic test clips for automated CI/CD and regression test matrices.
- **Multi-Agent Compatibility**: Formatted with standard YAML frontmatter for seamless integration into Antigravity, Claude Code, Codex, and Gemini CLI.

---

## 📁 Repository Structure

```text
ffmpeg-export-reliability/
├── SKILL.md                          # Main Skill instruction file with YAML frontmatter (72 rules)
├── README.md                         # Project documentation and quick start
├── LICENSE                           # MIT License
├── CHANGELOG.md                      # Release notes (v1.1.0)
├── .gitignore                        # Python and media artifact ignore rules
├── scripts/
│   └── ffmpeg_export_validator.py    # Zero-dependency Python verification & diagnostic CLI
└── references/
    ├── export_state_machine.md       # 12-stage pipeline model and transition rules
    ├── validation_checklist.md       # 72-point verification checklist and test matrix
    └── diagnostic_schema.json        # JSON schema for structured validation reports
```

---

## 🚀 Quick Usage

### Validate an Export

```bash
python scripts/ffmpeg_export_validator.py validate \
  --input output.mp4 \
  --expected-duration 10.0 \
  --expected-fps 60 \
  --expected-width 1920 \
  --expected-height 1080 \
  --expected-frames 600
```

### Inspect Source Media

```bash
python scripts/ffmpeg_export_validator.py inspect --input screen_recording.mp4
```

### Diagnose an Export Failure

```bash
python scripts/ffmpeg_export_validator.py diagnose --report validation_report.json
```

---

## 📄 License

MIT License. Free for open-source and commercial use.
