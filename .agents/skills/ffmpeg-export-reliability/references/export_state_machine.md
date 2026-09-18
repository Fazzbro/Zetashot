# Video Export State Machine Architecture

The export subsystem of a reliable video editing engine must transition through 12 explicit, non-overlapping states. Transitions are strictly deterministic, and failure can trigger a transition to `FAILED` from any state with complete diagnostics.

```
       [IDLE]
         │
         ▼
[VALIDATING_PROJECT] ──(fail)──┐
         │                     │
         ▼                     │
 [ANALYZING_MEDIA]   ──(fail)──┤
         │                     │
         ▼                     │
[BUILDING_RENDER_PLAN] (fail)──┤
         │                     │
         ▼                     │
 [PREPARING_AUDIO]   ──(fail)──┤
         │                     │
         ▼                     │
    [RENDERING]      ──(fail)──┼──► [FAILED]
         │                     │       │
         ▼                     │       ▼
    [ENCODING]       ──(fail)──┤   [EXPORT_DIAGNOSTICS]
         │                     │
         ▼                     │
     [MUXING]        ──(fail)──┤
         │                     │
         ▼                     │
[VALIDATING_OUTPUT]  ──(fail)──┤
         │                     │
         ▼                     │
   [FINALIZING]      ──(fail)──┘
         │
         ▼
     [SUCCESS]
```

---

## State Definitions & Invariants

### 1. `IDLE`
- **State Invariant**: No active rendering, GPU resources free, temporary directory clean.
- **Action**: Awaits export trigger. Freezes project state snapshot upon trigger.

### 2. `VALIDATING_PROJECT`
- **Checkpoints**:
  - Timeline duration > 0.
  - Export preset (codec, container, resolution, fps, bitrate) is supported by target environment.
  - Output file path writable and disk space adequate (> 2x estimated export size).
  - Temporary export path initialized (`*.tmp.mp4`).

### 3. `ANALYZING_MEDIA`
- **Checkpoints**:
  - Probe all input media sources via `ffprobe`.
  - Extract pixel formats, exact frame rates, start timestamps, VFR/CFR flags, SAR/DAR.
  - Identify non-zero start timestamps and audio channel topologies.
  - Validate file readability.

### 4. `BUILDING_RENDER_PLAN`
- **Checkpoints**:
  - Establish authoritative **Master Timeline** (integer frame clock + integer microsecond timestamps).
  - Calculate `total_expected_frames = ceil(duration * fps)`.
  - Resolve clip placements, cuts, transitions, effects, and canvas gaps (black/transparent fallback).
  - Pre-allocate frame buffers with copy-on-write or reference-counted immutability.

### 5. `PREPARING_AUDIO`
- **Checkpoints**:
  - Resample all source audio tracks to project master sample rate (e.g. 48 kHz).
  - Apply volume envelopes, cuts, fades, and channel mixing.
  - Generate normalized intermediate audio stream matching master timeline duration.

### 6. `RENDERING`
- **Checkpoints**:
  - Execute frame loop: `for frame_index in range(total_expected_frames): timestamp = frame_index / fps`.
  - Deterministically composite visual layers at timestamp `t`.
  - Guarantee GPU-to-CPU synchronization before buffer handoff.
  - Track `frames_rendered` counter.

### 7. `ENCODING`
- **Checkpoints**:
  - Stream rendered frames into encoder (FFmpeg subprocess or native SDK).
  - Never reuse mutable frame buffers during async encode.
  - Update progress based exclusively on `frame_index / total_expected_frames` (never on FFmpeg speed logs).
  - Track `frames_encoded` counter.

### 8. `MUXING`
- **Checkpoints**:
  - Flush frame renderer and encoder completely.
  - Multiplex video and audio streams into temporary container (`export.tmp.mp4`).
  - Verify `-movflags +faststart` for web-compatible MP4 seekability.
  - Close all open stream pipes and file handles.

### 9. `VALIDATING_OUTPUT`
- **Checkpoints**:
  - Verify container header matches extension.
  - Verify duration discrepancy within tolerance (≤ 2 frame durations).
  - Verify `actual_frames == total_expected_frames` (reject single-frame exports).
  - Full-decode test: decode 100% of stream via `ffmpeg -v error -i <file> -f null -`.
  - Seekability test: sample decode at 0%, 10%, 25%, 50%, 75%, 90%, 99%.
  - Audio/Video duration sync delta ≤ 80ms.
  - Spot-check for unintended black or frozen frame sequences.

### 10. `FINALIZING`
- **Checkpoints**:
  - Release all remaining file locks.
  - Perform atomic rename: `export.tmp.mp4` → `target_export.mp4`.
  - Preserve existing target file if validation fails (never overwrite with bad export).

### 11. `SUCCESS`
- **Checkpoints**:
  - Surface complete export report and metrics.
  - Emit completion event.

### 12. `FAILED`
- **Checkpoints**:
  - Retain temporary artifacts if `EXPORT_DEBUG=1` is set.
  - Classify failure type (`DURATION_MISMATCH`, `FRAME_COUNT_MISMATCH`, `AUDIO_VIDEO_DESYNC`, etc.).
  - Output structured failure report with exact stage and actionable root-cause advice.
  - Clean up dangling processes and memory.
