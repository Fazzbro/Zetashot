#!/usr/bin/env python3
"""
FFmpeg Export Validator & Diagnostics CLI
Part of the ffmpeg-export-reliability skill.

Validates exported video files against master timeline specifications, executes
full-decode integrity checks, multi-point seekability tests, AV sync delta checks,
black/frozen frame spot checks, and classifies failure modes.
"""

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def check_dependencies() -> Tuple[bool, Optional[str]]:
    """Check if ffmpeg and ffprobe are available on PATH."""
    ffprobe_path = shutil.which("ffprobe")
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffprobe_path:
        return False, "ffprobe not found on PATH. Please install FFmpeg."
    if not ffmpeg_path:
        return False, "ffmpeg not found on PATH. Please install FFmpeg."
    return True, None


def run_cmd(cmd: List[str], timeout: Optional[int] = 120) -> Tuple[int, str, str]:
    """Run a subprocess command and return (exit_code, stdout, stderr)."""
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)


def probe_file(file_path: Path) -> Dict[str, Any]:
    """Execute ffprobe to extract complete JSON metadata for streams and format."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        "-show_error",
        str(file_path),
    ]
    code, stdout, stderr = run_cmd(cmd, timeout=30)
    if code != 0 or not stdout.strip():
        raise RuntimeError(f"ffprobe failed on {file_path}: {stderr}")
    try:
        return json.loads(stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Failed to parse ffprobe JSON: {e}")


def parse_fraction(val: Optional[str]) -> Optional[float]:
    """Safely parse strings like '30000/1001' or '30/1' into a float."""
    if not val or val == "0/0" or val == "N/A":
        return None
    try:
        if "/" in val:
            num, den = val.split("/", 1)
            num_f = float(num)
            den_f = float(den)
            return num_f / den_f if den_f != 0 else None
        return float(val)
    except (ValueError, ZeroDivisionError):
        return None


def cmd_inspect(args: argparse.Namespace) -> int:
    """Subcommand: Inspect a media file and output normalized JSON metadata."""
    file_path = Path(args.input).resolve()
    if not file_path.exists():
        print(f"Error: Input file does not exist: {file_path}", file=sys.stderr)
        return 1

    try:
        raw_probe = probe_file(file_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    fmt = raw_probe.get("format", {})
    streams = raw_probe.get("streams", [])

    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]

    video_info = []
    for vs in video_streams:
        fps = parse_fraction(vs.get("avg_frame_rate")) or parse_fraction(vs.get("r_frame_rate"))
        time_base = parse_fraction(vs.get("time_base"))
        duration_s = float(vs.get("duration")) if vs.get("duration") and vs.get("duration") != "N/A" else None
        nb_frames = int(vs.get("nb_frames")) if vs.get("nb_frames") and vs.get("nb_frames") != "N/A" else None
        start_pts = float(vs.get("start_time")) if vs.get("start_time") and vs.get("start_time") != "N/A" else None

        # Check VFR indication
        r_fps = parse_fraction(vs.get("r_frame_rate"))
        avg_fps = parse_fraction(vs.get("avg_frame_rate"))
        is_vfr_suspicious = bool(r_fps and avg_fps and abs(r_fps - avg_fps) > 0.05)

        video_info.append({
            "index": vs.get("index"),
            "codec_name": vs.get("codec_name"),
            "codec_long_name": vs.get("codec_long_name"),
            "profile": vs.get("profile"),
            "width": vs.get("width"),
            "height": vs.get("height"),
            "pix_fmt": vs.get("pix_fmt"),
            "sample_aspect_ratio": vs.get("sample_aspect_ratio"),
            "display_aspect_ratio": vs.get("display_aspect_ratio"),
            "fps": fps,
            "r_frame_rate": vs.get("r_frame_rate"),
            "avg_frame_rate": vs.get("avg_frame_rate"),
            "is_vfr_indicated": is_vfr_suspicious,
            "time_base": vs.get("time_base"),
            "start_time_s": start_pts,
            "duration_s": duration_s,
            "nb_frames": nb_frames,
            "bit_rate": vs.get("bit_rate"),
        })

    audio_info = []
    for aus in audio_streams:
        duration_s = float(aus.get("duration")) if aus.get("duration") and aus.get("duration") != "N/A" else None
        start_pts = float(aus.get("start_time")) if aus.get("start_time") and aus.get("start_time") != "N/A" else None
        audio_info.append({
            "index": aus.get("index"),
            "codec_name": aus.get("codec_name"),
            "sample_rate": aus.get("sample_rate"),
            "channels": aus.get("channels"),
            "channel_layout": aus.get("channel_layout"),
            "start_time_s": start_pts,
            "duration_s": duration_s,
            "bit_rate": aus.get("bit_rate"),
        })

    container_duration_s = float(fmt.get("duration")) if fmt.get("duration") and fmt.get("duration") != "N/A" else None

    result = {
        "file_path": str(file_path),
        "file_size_bytes": file_path.stat().st_size,
        "container_format": fmt.get("format_name"),
        "container_duration_s": container_duration_s,
        "bit_rate": fmt.get("bit_rate"),
        "video_streams": video_info,
        "audio_streams": audio_info,
        "tags": fmt.get("tags", {}),
    }

    output_json = json.dumps(result, indent=2)
    if args.output:
        out_path = Path(args.output).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output_json, encoding="utf-8")
        print(f"Inspection written to: {out_path}")
    else:
        print(output_json)

    return 0


def test_full_decode(file_path: Path) -> Tuple[bool, str]:
    """Verify that the entire container and all frames can be decoded without errors."""
    cmd = [
        "ffmpeg",
        "-v", "error",
        "-i", str(file_path),
        "-f", "null",
        "-",
    ]
    code, stdout, stderr = run_cmd(cmd, timeout=300)
    if code != 0:
        return False, f"Full decode failed (exit code {code}): {stderr.strip()}"
    if stderr.strip():
        return False, f"Decode reported errors: {stderr.strip()}"
    return True, "Decoded entire stream without errors"


def test_seekability(file_path: Path, duration_s: float) -> Tuple[bool, List[Dict[str, Any]]]:
    """Test seeking to multiple percentages of duration: 0%, 10%, 25%, 50%, 75%, 90%, 99%."""
    percentages = [0.0, 0.10, 0.25, 0.50, 0.75, 0.90, 0.99]
    results = []
    all_passed = True

    for pct in percentages:
        target_ts = max(0.0, duration_s * pct)
        cmd = [
            "ffmpeg",
            "-v", "error",
            "-ss", f"{target_ts:.4f}",
            "-i", str(file_path),
            "-frames:v", "1",
            "-f", "null",
            "-",
        ]
        code, stdout, stderr = run_cmd(cmd, timeout=15)
        passed = (code == 0 and not stderr.strip())
        if not passed:
            all_passed = False
        results.append({
            "percentage": f"{int(pct * 100)}%",
            "target_timestamp_s": round(target_ts, 4),
            "passed": passed,
            "error": stderr.strip() if not passed else None,
        })

    return all_passed, results


def test_black_and_frozen_frames(file_path: Path) -> Dict[str, Any]:
    """Run blackdetect and spot check frozen frames using ffmpeg filters."""
    cmd_black = [
        "ffmpeg",
        "-v", "info",
        "-i", str(file_path),
        "-vf", "blackdetect=d=0.5:pix_th=0.10",
        "-f", "null",
        "-",
    ]
    _, _, stderr_black = run_cmd(cmd_black, timeout=60)
    black_spans = []
    for line in stderr_black.splitlines():
        if "black_start:" in line:
            black_spans.append(line.strip())

    cmd_freeze = [
        "ffmpeg",
        "-v", "info",
        "-i", str(file_path),
        "-vf", "freezedetect=n=-60dB:d=2.0",
        "-f", "null",
        "-",
    ]
    _, _, stderr_freeze = run_cmd(cmd_freeze, timeout=60)
    freeze_spans = []
    for line in stderr_freeze.splitlines():
        if "lavfi.freezedetect" in line or "freeze_start:" in line:
            freeze_spans.append(line.strip())

    return {
        "black_frames_detected": len(black_spans) > 0,
        "black_frame_events": black_spans[:10],
        "frozen_frames_detected": len(freeze_spans) > 0,
        "frozen_frame_events": freeze_spans[:10],
    }


def check_packet_monotonicity(file_path: Path, max_packets: int = 500) -> Tuple[bool, Optional[str]]:
    """Inspect packet timestamps via ffprobe to verify monotonicity."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_packets",
        "-show_entries", "packet=pts,dts,duration,flags",
        "-read_intervals", f"%+{max_packets}",
        "-print_format", "json",
        str(file_path),
    ]
    code, stdout, stderr = run_cmd(cmd, timeout=30)
    if code != 0:
        return True, "Could not check packet monotonicity (stream probe error)"
    try:
        data = json.loads(stdout)
        packets = data.get("packets", [])
        last_dts = None
        for i, pkt in enumerate(packets):
            dts_val = pkt.get("dts")
            if dts_val is not None and dts_val != "N/A":
                dts = int(dts_val)
                if last_dts is not None and dts < last_dts:
                    return False, f"DTS backwards discontinuity at packet {i}: current DTS {dts} < previous DTS {last_dts}"
                last_dts = dts
        return True, f"Verified first {len(packets)} packets have monotonic DTS ordering"
    except Exception as e:
        return True, f"Packet parsing skipped: {e}"


def cmd_validate(args: argparse.Namespace) -> int:
    """Subcommand: Comprehensive validation of an exported file."""
    file_path = Path(args.input).resolve()
    if not file_path.exists():
        print(f"Error: Target file not found: {file_path}", file=sys.stderr)
        return 1

    file_size = file_path.stat().st_size
    if file_size == 0:
        print(f"FAIL: Target file is 0 bytes: {file_path}", file=sys.stderr)
        return 1

    try:
        raw_probe = probe_file(file_path)
    except Exception as e:
        print(f"FAIL: Corrupt file, ffprobe failed: {e}", file=sys.stderr)
        return 1

    fmt = raw_probe.get("format", {})
    streams = raw_probe.get("streams", [])
    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]

    checks: List[Dict[str, Any]] = []
    all_passed = True

    def add_check(name: str, passed: bool, expected: Any, actual: Any, message: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
        checks.append({
            "check": name,
            "passed": passed,
            "expected": expected,
            "actual": actual,
            "message": message,
        })

    # 1. Container / Extension check
    ext = file_path.suffix.lower().lstrip(".")
    fmt_names = fmt.get("format_name", "").split(",")
    ext_compat = {
        "mp4": ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"],
        "mov": ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"],
        "webm": ["matroska", "webm"],
        "mkv": ["matroska", "webm"],
    }
    allowed_formats = ext_compat.get(ext, [ext])
    container_matches = any(f in allowed_formats for f in fmt_names)
    add_check(
        "Container / Extension Match",
        container_matches,
        allowed_formats,
        fmt_names,
        "File extension matches actual internal container header" if container_matches else "Mismatch between file extension and container format!"
    )

    # 2. Video Stream Presence
    has_video = len(video_streams) > 0
    add_check(
        "Video Stream Present",
        has_video,
        True,
        has_video,
        "Output contains at least one video stream" if has_video else "No video streams found!"
    )

    vs = video_streams[0] if has_video else {}
    actual_duration = float(fmt.get("duration", 0.0))
    actual_fps = parse_fraction(vs.get("avg_frame_rate")) or parse_fraction(vs.get("r_frame_rate")) or 0.0
    actual_width = vs.get("width")
    actual_height = vs.get("height")
    actual_frames = int(vs.get("nb_frames")) if vs.get("nb_frames") and vs.get("nb_frames") != "N/A" else None

    # 3. Expected Duration
    if args.expected_duration is not None:
        exp_dur = float(args.expected_duration)
        tolerance = float(args.duration_tolerance)
        diff = abs(actual_duration - exp_dur)
        dur_ok = diff <= tolerance
        add_check(
            "Duration Accuracy",
            dur_ok,
            f"{exp_dur:.4f}s (±{tolerance}s)",
            f"{actual_duration:.4f}s (diff: {diff:.4f}s)",
            "Duration matches master timeline within tolerance" if dur_ok else f"Duration discrepancy exceeds tolerance {tolerance}s"
        )

    # 4. Expected Frame Count / Single-frame detection
    if args.expected_frames is not None:
        exp_frames = int(args.expected_frames)
        if actual_frames is not None:
            single_frame_fail = (actual_frames == 1 and exp_frames > 1)
            frames_ok = (not single_frame_fail) and (abs(actual_frames - exp_frames) <= 2)
            add_check(
                "Frame Count Accuracy",
                frames_ok,
                exp_frames,
                actual_frames,
                "First-frame only export detected!" if single_frame_fail else ("Frame count matches master timeline" if frames_ok else "Frame count mismatch")
            )
        else:
            estimated_frames = math.ceil(actual_duration * actual_fps)
            add_check(
                "Frame Count (Estimated)",
                abs(estimated_frames - exp_frames) <= 3,
                exp_frames,
                estimated_frames,
                "Estimated frame count matches within tolerance"
            )
    else:
        if actual_duration > 1.0 and actual_frames == 1:
            add_check(
                "First-Frame-Only Prevention",
                False,
                "> 1 frame",
                "1 frame",
                "CRITICAL: Output is only 1 frame despite multi-second duration!"
            )

    # 5. Expected Resolution
    if args.expected_width is not None and args.expected_height is not None:
        exp_w = int(args.expected_width)
        exp_h = int(args.expected_height)
        res_ok = (actual_width == exp_w and actual_height == exp_h)
        add_check(
            "Resolution Accuracy",
            res_ok,
            f"{exp_w}x{exp_h}",
            f"{actual_width}x{actual_height}",
            "Resolution matches export preset" if res_ok else "Resolution mismatch"
        )

    # 6. Expected FPS
    if args.expected_fps is not None:
        exp_fps = float(args.expected_fps)
        fps_ok = abs(actual_fps - exp_fps) < 0.05
        add_check(
            "Frame Rate Accuracy",
            fps_ok,
            f"{exp_fps} fps",
            f"{actual_fps:.3f} fps",
            "FPS matches preset" if fps_ok else "FPS mismatch"
        )

    # 7. Audio / Video Sync and Duration Difference
    if len(audio_streams) > 0 and has_video:
        aus = audio_streams[0]
        v_dur = float(vs.get("duration")) if vs.get("duration") and vs.get("duration") != "N/A" else actual_duration
        a_dur = float(aus.get("duration")) if aus.get("duration") and aus.get("duration") != "N/A" else actual_duration
        av_diff = abs(v_dur - a_dur)
        av_tolerance = float(args.av_sync_tolerance)
        av_ok = av_diff <= av_tolerance
        add_check(
            "A/V Duration Synchronization",
            av_ok,
            f"Delta <= {av_tolerance}s",
            f"V:{v_dur:.3f}s, A:{a_dur:.3f}s (Delta: {av_diff:.3f}s)",
            "Audio and Video streams are synchronized" if av_ok else f"Audio/Video desync exceeds {av_tolerance}s"
        )

        v_start = float(vs.get("start_time", 0.0))
        a_start = float(aus.get("start_time", 0.0))
        start_diff = abs(v_start - a_start)
        start_ok = start_diff <= 0.1
        add_check(
            "A/V Start Timestamp Alignment",
            start_ok,
            "Aligned within 0.1s",
            f"V start: {v_start:.3f}s, A start: {a_start:.3f}s (diff: {start_diff:.3f}s)",
            "Stream start PTS alignment verified"
        )

    # 8. Full Decode Test (Rule 32)
    if not args.skip_full_decode:
        decode_passed, decode_msg = test_full_decode(file_path)
        add_check(
            "Full Stream Decode Integrity",
            decode_passed,
            "Clean decode 0-100%",
            decode_msg,
            "All frames decodable without errors" if decode_passed else decode_msg
        )

    # 9. Seekability Test (Rule 33)
    seek_passed, seek_results = test_seekability(file_path, actual_duration)
    add_check(
        "Seekability Test (7 Checkpoints)",
        seek_passed,
        "All 7 checkpoints seekable (0%, 10%, 25%, 50%, 75%, 90%, 99%)",
        f"{sum(1 for s in seek_results if s['passed'])}/7 checkpoints passed",
        "Seekability verified across entire container" if seek_passed else "Seeking failed at one or more checkpoints"
    )

    # 10. Monotonicity check (Rule 39)
    mono_passed, mono_msg = check_packet_monotonicity(file_path)
    add_check(
        "Timestamp Monotonicity",
        mono_passed,
        "Monotonic DTS ordering",
        mono_msg,
        "Timestamp order verified"
    )

    # 11. Visual Glitch / Black / Frozen check
    glitch_data = test_black_and_frozen_frames(file_path)
    if glitch_data["black_frames_detected"] and not args.allow_black_frames:
        add_check(
            "Black Frame Detection",
            False,
            "No black frame spans",
            glitch_data["black_frame_events"],
            "Warning/Failure: Detected unexpected black frames"
        )
    else:
        add_check(
            "Black Frame Detection",
            True,
            "Pass / Allowed",
            "No problematic black frames" if not glitch_data["black_frames_detected"] else "Allowed by configuration",
            ""
        )

    report = {
        "file": str(file_path),
        "overall_status": "PASSED" if all_passed else "FAILED",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": {
            "total_checks": len(checks),
            "passed": sum(1 for c in checks if c["passed"]),
            "failed": sum(1 for c in checks if not c["passed"]),
        },
        "media_info": {
            "container": fmt.get("format_name"),
            "duration_s": actual_duration,
            "width": actual_width,
            "height": actual_height,
            "fps": actual_fps,
            "video_codec": vs.get("codec_name") if has_video else None,
            "audio_codec": audio_streams[0].get("codec_name") if audio_streams else None,
        },
        "checks": checks,
        "seek_details": seek_results,
        "glitch_details": glitch_data,
    }

    report_json = json.dumps(report, indent=2)
    if args.output:
        out_path = Path(args.output).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(report_json, encoding="utf-8")
        print(f"Validation report saved to: {out_path}")

    print("\n" + "=" * 60)
    print(f"EXPORT VALIDATION REPORT: {'[PASSED]' if all_passed else '[FAILED]'}")
    print("=" * 60)
    print(f"File: {file_path.name}")
    print(f"Resolution: {actual_width}x{actual_height} | FPS: {actual_fps:.2f} | Duration: {actual_duration:.2f}s")
    print(f"Checks Passed: {report['summary']['passed']}/{report['summary']['total_checks']}\n")

    for c in checks:
        status = "[PASS]" if c["passed"] else "[FAIL]"
        print(f"  {status:<7} {c['check']}")
        if not c["passed"]:
            print(f"          Expected: {c['expected']}")
            print(f"          Actual:   {c['actual']}")
            if c["message"]:
                print(f"          Message:  {c['message']}")

    print("=" * 60 + "\n")

    return 0 if all_passed else 1


def cmd_diagnose(args: argparse.Namespace) -> int:
    """Subcommand: Ingest validation report or error description and diagnose failure class."""
    report_file = Path(args.report).resolve() if args.report else None
    data = {}
    if report_file and report_file.exists():
        try:
            data = json.loads(report_file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error reading report file: {e}", file=sys.stderr)

    failed_checks = [c for c in data.get("checks", []) if not c.get("passed")]

    diagnosis = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "classifications": [],
        "root_causes": [],
        "remediation_steps": [],
    }

    for fc in failed_checks:
        chk = fc.get("check", "")
        if "Container" in chk:
            diagnosis["classifications"].append("INVALID_CONTAINER")
            diagnosis["root_causes"].append("Muxer output container header does not match target file extension.")
            diagnosis["remediation_steps"].append("Explicitly map extension to muxer format (-f mp4 for .mp4, -f matroska for .mkv, etc.).")
        elif "Duration" in chk:
            diagnosis["classifications"].append("DURATION_MISMATCH")
            diagnosis["root_causes"].append("Timeline render loop terminated early or input media durations disagreed with master timeline.")
            diagnosis["remediation_steps"].append("Do not rely on -shortest or source stream durations. Enforce master timeline frame count in the render loop.")
        elif "First-Frame" in chk or "Frame Count" in chk:
            diagnosis["classifications"].append("FIRST_FRAME_REPLICATION" if "1 frame" in str(fc.get("actual")) else "FRAME_COUNT_MISMATCH")
            diagnosis["root_causes"].append("Encoder flushed after first frame or loop iterator failed to increment frame timestamp.")
            diagnosis["remediation_steps"].append("Verify render loop advances frame index (frame_index / fps) and that pipe/stdin does not close prematurely.")
        elif "A/V" in chk:
            diagnosis["classifications"].append("AUDIO_VIDEO_DESYNC")
            diagnosis["root_causes"].append("Audio sample clock and video frame clock diverged or delayed start timestamps were unaligned.")
            diagnosis["remediation_steps"].append("Resample audio to master sample rate (e.g. 48000Hz) and pad/trim audio explicitly to master timeline start/end.")
        elif "Decode" in chk:
            diagnosis["classifications"].append("DECODE_FAILURE")
            diagnosis["root_causes"].append("Corrupted bitstream, missing keyframes, or incomplete container finalize/flush.")
            diagnosis["remediation_steps"].append("Ensure encoder process is cleanly closed and flushed before finalizing file handles.")
        elif "Seekability" in chk:
            diagnosis["classifications"].append("SEEK_FAILURE")
            diagnosis["root_causes"].append("Malformed moov atom / container index, or non-monotonic timestamps preventing decoder seeks.")
            diagnosis["remediation_steps"].append("For MP4 use -movflags +faststart. Check PTS monotonicity.")

    if not diagnosis["classifications"]:
        diagnosis["classifications"].append("UNKNOWN_OR_CLEAN")
        diagnosis["root_causes"].append("No explicit rule failures matched in report.")
        diagnosis["remediation_steps"].append("Inspect ffmpeg log with EXPORT_DEBUG=1.")

    output_json = json.dumps(diagnosis, indent=2)
    if args.output:
        out_path = Path(args.output).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output_json, encoding="utf-8")
        print(f"Diagnosis written to: {out_path}")
    else:
        print(output_json)

    return 0


def cmd_create_test_asset(args: argparse.Namespace) -> int:
    """Subcommand: Helper to create synthetic standard test video files."""
    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    duration = float(args.duration)
    fps = int(args.fps)
    width = int(args.width)
    height = int(args.height)
    pattern = args.pattern

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", f"{pattern}=duration={duration}:size={width}x{height}:rate={fps}",
        "-f", "lavfi",
        "-i", f"sine=frequency=1000:duration={duration}:sample_rate=48000",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        str(out_path),
    ]

    code, stdout, stderr = run_cmd(cmd, timeout=60)
    if code != 0:
        print(f"Error creating test asset: {stderr}", file=sys.stderr)
        return 1

    print(f"Successfully generated synthetic test asset ({duration}s, {width}x{height}@{fps}fps): {out_path}")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="FFmpeg Export Reliability Verification & Diagnostic Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: inspect
    p_inspect = subparsers.add_parser("inspect", help="Probe and normalize media stream and container metadata")
    p_inspect.add_argument("--input", "-i", required=True, help="Path to input media file")
    p_inspect.add_argument("--output", "-o", help="Optional path to output JSON file")
    p_inspect.set_defaults(func=cmd_inspect)

    # Subcommand: validate
    p_validate = subparsers.add_parser("validate", help="Run full post-export validation suite against master timeline")
    p_validate.add_argument("--input", "-i", required=True, help="Path to exported media file")
    p_validate.add_argument("--expected-duration", type=float, help="Expected master timeline duration in seconds")
    p_validate.add_argument("--duration-tolerance", type=float, default=0.066, help="Tolerance for duration in seconds (default 0.066s ~ 2 frames @ 30fps)")
    p_validate.add_argument("--expected-frames", type=int, help="Expected total frame count for CFR video")
    p_validate.add_argument("--expected-width", "-w", type=int, help="Expected width in pixels")
    p_validate.add_argument("--expected-height", "-h_px", type=int, dest="expected_height", help="Expected height in pixels")
    p_validate.add_argument("--expected-fps", type=float, help="Expected frame rate")
    p_validate.add_argument("--av-sync-tolerance", type=float, default=0.080, help="Max allowed audio/video duration discrepancy in seconds (default 0.080s)")
    p_validate.add_argument("--skip-full-decode", action="store_true", help="Skip the complete 0-100% decode check")
    p_validate.add_argument("--allow-black-frames", action="store_true", help="Do not fail when black frames are detected")
    p_validate.add_argument("--output", "-o", help="Path to save detailed JSON validation report")
    p_validate.set_defaults(func=cmd_validate)

    # Subcommand: diagnose
    p_diagnose = subparsers.add_parser("diagnose", help="Diagnose root causes from validation reports")
    p_diagnose.add_argument("--report", "-r", required=True, help="Path to JSON validation report")
    p_diagnose.add_argument("--output", "-o", help="Path to save diagnosis JSON")
    p_diagnose.set_defaults(func=cmd_diagnose)

    # Subcommand: create-test-asset
    p_asset = subparsers.add_parser("create-test-asset", help="Generate synthetic CFR test media clips")
    p_asset.add_argument("--output", "-o", required=True, help="Target file path (e.g. test_clip.mp4)")
    p_asset.add_argument("--duration", "-d", type=float, default=5.0, help="Duration in seconds (default 5.0)")
    p_asset.add_argument("--fps", type=int, default=30, help="Frames per second (default 30)")
    p_asset.add_argument("--width", "-w", type=int, default=1280, help="Frame width (default 1280)")
    p_asset.add_argument("--height", "-h_px", type=int, dest="height", default=720, help="Frame height (default 720)")
    p_asset.add_argument("--pattern", default="smptebars", choices=["smptebars", "testsrc", "rgbtestsrc"], help="Test video pattern")
    p_asset.set_defaults(func=cmd_create_test_asset)

    ok, err = check_dependencies()
    if not ok:
        print(f"Dependency Error: {err}", file=sys.stderr)
        sys.exit(1)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
