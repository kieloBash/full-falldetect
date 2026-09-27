
"""
Usage:
    python video_mp4_fall_detect_test.py path/to/video.mp4
    python video_mp4_fall_detect_test.py path/to/video.mp4 --save-video
    python video_mp4_fall_detect_test.py path/to/video.mp4 --log-file alerts.csv --fps 15
    python video_mp4_fall_detect_test.py path/to/video.mp4 --weights D:\\path\\to\\best_v3.pt
"""

import os
import sys
import csv
import time
import argparse
import cv2
from ultralytics import YOLO

from fall_detector import FallDetector

WEIGHTS_PATH            = "D:\\full-falldetect\\backend\\model\\best_v3.pt"
CONF                    = 0.2
INFER_SIZE              = 640
INFER_SKIP              = 2          
PATIENT_CLASS_NAME      = "patient"
BED_CLASS_NAME          = "bed"
SUSTAINED_SECONDS       = 3.0        
REPEAT_ALERT_INTERVAL   = 10.0       
MAX_REPEAT_ALERTS       = 4          
ALERT_FLASH_SECONDS     = 2.0   

def detect_boxes(model, class_names, frame):
    """Run inference on one frame, return boxes scaled back to the frame's pixel space."""
    h0, w0 = frame.shape[:2]
    scale_x, scale_y = w0 / INFER_SIZE, h0 / INFER_SIZE

    resized = cv2.resize(frame, (INFER_SIZE, INFER_SIZE))
    results = model(resized, conf=CONF, verbose=False)
    boxes = results[0].boxes

    patient_box, patient_conf = None, 0.0
    bed_box, bed_conf = None, 0.0

    for b in boxes:
        cls_id = int(b.cls.item())
        name = class_names.get(cls_id, str(cls_id))
        conf = float(b.conf.item())
        x1, y1, x2, y2 = b.xyxy[0].tolist()
        box_orig = (x1 * scale_x, y1 * scale_y, x2 * scale_x, y2 * scale_y)

        if name == PATIENT_CLASS_NAME and conf > patient_conf:
            patient_box, patient_conf = box_orig, conf
        elif name == BED_CLASS_NAME and conf > bed_conf:
            bed_box, bed_conf = box_orig, conf

    return patient_box, bed_box, patient_conf, bed_conf


def annotate(frame, patient_box, bed_box, state, patient_conf, bed_conf, video_time, alert_banner_active=False):
    annotated = frame.copy()
    h, w = annotated.shape[:2]
    ratio_suffix = f" (ratio={state.outside_ratio:.2f})" if (state and patient_box and bed_box) else ""

    if bed_box is not None:
        bx1, by1, bx2, by2 = (int(v) for v in bed_box)
        cv2.rectangle(annotated, (bx1, by1), (bx2, by2), (255, 180, 0), 2)
        cv2.putText(annotated, f"bed {bed_conf:.2f}", (bx1, by1 - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 180, 0), 1)

    if patient_box is not None:
        px1, py1, px2, py2 = (int(v) for v in patient_box)
        color = (0, 0, 220) if (state and state.alert) else (0, 200, 150)
        cv2.rectangle(annotated, (px1, py1), (px2, py2), color, 2)
        cv2.putText(annotated, f"patient {patient_conf:.2f}", (px1, py1 - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    if state and state.alert:
        label, color = f"ALERT: {state.reason}{ratio_suffix}", (0, 0, 220)
    elif state and state.warning:
        label, color = f"Warning: {state.reason}{ratio_suffix}", (0, 165, 255)
    elif bed_box is None:
        label, color = "No bed detected", (0, 0, 220)
    elif patient_box is None:
        label, color = "No patient detected", (150, 150, 150)
    else:
        label, color = f"Normal{ratio_suffix}", (0, 200, 150)

    cv2.putText(annotated, label, (10, h - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    cv2.putText(annotated, f"t={video_time:6.2f}s", (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (220, 220, 220), 2)

    if alert_banner_active:
        cv2.rectangle(annotated, (0, 0), (w - 1, h - 1), (0, 0, 255), 12)
        banner_text = "!!! ALERT SENT !!!"
        (tw, th_), _ = cv2.getTextSize(banner_text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 3)
        tx = (w - tw) // 2
        cv2.rectangle(annotated, (tx - 12, 40 - th_ - 12), (tx + tw + 12, 40 + 12), (0, 0, 255), -1)
        cv2.putText(annotated, banner_text, (tx, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 3)

    return annotated


class AlertMonitor:
    """Keeps track of sustained alerts and debounces them, so we only fire an alert"""
    def __init__(self, repeat_interval=REPEAT_ALERT_INTERVAL, max_repeats=MAX_REPEAT_ALERTS):
        self.repeat_interval = repeat_interval
        self.max_repeats = max_repeats
        self.was_in_alert = False
        self.last_alert_time = None
        self.alert_count = 0

    def check(self, state, video_time):
        in_alert = bool(state and state.alert)

        if not in_alert:
            self.was_in_alert = False
            self.last_alert_time = None
            self.alert_count = 0
            return False

        should_fire = False
        if not self.was_in_alert:
            should_fire = True
        elif (self.last_alert_time is not None
              and video_time - self.last_alert_time >= self.repeat_interval
              and self.alert_count < self.max_repeats):
            should_fire = True

        self.was_in_alert = True

        if should_fire:
            self.alert_count += 1
            self.last_alert_time = video_time

        return should_fire


def format_time(seconds):
    m, s = divmod(seconds, 60)
    return f"{int(m):02d}:{s:05.2f}"


def process_video(video_path, weights_path, fps_override, log_path, save_video, output_dir, infer_skip):
    print("Loading model...")
    model = YOLO(weights_path)
    class_names = model.names
    try:
        import torch
        device = "GPU (CUDA)" if torch.cuda.is_available() else "CPU"
    except ImportError:
        device = "unknown (torch not importable)"
    print(f"Model loaded. Running on: {device}\n")
    if device == "CPU":
        print(" GPU detected -- inference will be much slower than real-time.")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Couldn't open video: {video_path}")
        sys.exit(1)

    source_fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
    effective_fps = (fps_override or source_fps) / infer_skip
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"Source video    : {video_path}")
    print(f"Source fps      : {source_fps:.2f}  |  infer_skip={infer_skip}  |  effective fps={effective_fps:.2f}")
    print(f"Frame count     : {total_frames}  (~{total_frames / source_fps:.1f}s)")
    print(f"Sustained window: {SUSTAINED_SECONDS}s  |  repeat interval: {REPEAT_ALERT_INTERVAL}s  |  max repeats: {MAX_REPEAT_ALERTS}\n")

    detector = FallDetector(fps=effective_fps, sustained_seconds=SUSTAINED_SECONDS)
    monitor = AlertMonitor()

    writer = None
    if save_video:
        os.makedirs(output_dir, exist_ok=True)
        out_path = os.path.join(output_dir, "annotated_" + os.path.basename(video_path))
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_path, fourcc, source_fps, (frame_w, frame_h))
        print(f"Annotated video will be saved to: {out_path}\n")

    log_rows = []
    prev_status = None
    last_patient_box, last_bed_box, last_state = None, None, None
    last_patient_conf, last_bed_conf = 0.0, 0.0
    alert_flash_until = -1.0

    frame_idx = 0
    start_time = time.time()
    last_report = start_time
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        video_time = frame_idx / source_fps

        now = time.time()
        if now - last_report >= 2.0:
            elapsed = now - start_time
            proc_fps = frame_idx / elapsed if elapsed > 0 else 0
            pct = f"{100 * frame_idx / total_frames:.1f}%" if total_frames else "?"
            eta = f"{(total_frames - frame_idx) / proc_fps:.0f}s" if proc_fps > 0 and total_frames else "?"
            print(f"  ... {frame_idx}/{total_frames} frames ({pct}) | "
                  f"{proc_fps:.1f} fps processing | elapsed {elapsed:.0f}s | ETA {eta}")
            last_report = now

        if frame_idx % infer_skip == 0:
            patient_box, bed_box, patient_conf, bed_conf = detect_boxes(model, class_names, frame)
            state = detector.update(patient_box, bed_box)

            last_patient_box, last_bed_box = patient_box, bed_box
            last_patient_conf, last_bed_conf = patient_conf, bed_conf
            last_state = state

            status = "alert" if state.alert else ("warning" if state.warning else "normal")
            ratio_str = f"{state.outside_ratio:.3f}" if patient_box and bed_box else ""

            fired = monitor.check(state, video_time)
            if fired:
                alert_flash_until = video_time + ALERT_FLASH_SECONDS

            log_rows.append({
                "frame": frame_idx,
                "video_time": f"{video_time:.2f}",
                "video_time_hms": format_time(video_time),
                "patient_detected": patient_box is not None,
                "patient_conf": f"{patient_conf:.3f}" if patient_box is not None else "",
                "bed_detected": bed_box is not None,
                "bed_conf": f"{bed_conf:.3f}" if bed_box is not None else "",
                "outside_ratio": ratio_str,
                "status": status,
                "reason": state.reason,
                "alert_fired": fired,
            })

            if status != prev_status:
                print(f"[{format_time(video_time)}] frame {frame_idx:>6}  state -> {status:<8} {state.reason}")
                prev_status = status
            if fired:
                print(f"  >>> ALERT FIRED (#{monitor.alert_count}) at {format_time(video_time)} -- {state.reason}")

        if writer is not None:
            banner_active = video_time <= alert_flash_until
            annotated = annotate(frame, last_patient_box, last_bed_box, last_state,
                                  last_patient_conf, last_bed_conf, video_time,
                                  alert_banner_active=banner_active)
            writer.write(annotated)

        frame_idx += 1

    cap.release()
    if writer is not None:
        writer.release()

    if log_path:
        fieldnames = ["frame", "video_time", "video_time_hms", "patient_detected", "patient_conf",
                      "bed_detected", "bed_conf", "outside_ratio", "status", "reason", "alert_fired"]
        with open(log_path, "w", newline="") as f:
            csv_writer = csv.DictWriter(f, fieldnames=fieldnames)
            csv_writer.writeheader()
            csv_writer.writerows(log_rows)
        print(f"\nLog written to: {log_path}  ({len(log_rows)} inference frames logged)")

    fired_alerts = sum(1 for r in log_rows if r["alert_fired"])
    total_elapsed = time.time() - start_time
    print(f"Summary: {fired_alerts} alert(s) would have fired over ~{total_frames / source_fps:.1f}s of footage.")
    print(f"Processing took {total_elapsed:.1f}s wall-clock time.")


def main():
    parser = argparse.ArgumentParser(description="Replay a recorded video through the fall-detection pipeline.")
    parser.add_argument("video", help="Path to the video file to process.")
    parser.add_argument("--weights", default=WEIGHTS_PATH, help="Path to YOLO weights (.pt).")
    parser.add_argument("--fps", type=float, default=None,
                         help="Override the video's reported fps for FallDetector's timing math.")
    parser.add_argument("--infer-skip", type=int, default=INFER_SKIP,
                         help=f"Only run YOLO every Nth frame, like main.py (default: {INFER_SKIP}).")
    parser.add_argument("--log-file", default="fall_test_log.csv",
                         help="Where to write the CSV event log (default: fall_test_log.csv).")
    parser.add_argument("--save-video", action="store_true",
                         help="Also write an annotated copy of the video with boxes and a status overlay.")
    parser.add_argument("--output-dir", default="test_output",
                         help="Folder for the annotated video output (default: test_output/).")
    args = parser.parse_args()

    if not os.path.isfile(args.video):
        print(f"Video not found: {args.video}")
        sys.exit(1)

    process_video(
        video_path=args.video,
        weights_path=args.weights,
        fps_override=args.fps,
        log_path=args.log_file,
        save_video=args.save_video,
        output_dir=args.output_dir,
        infer_skip=args.infer_skip,
    )


if __name__ == "__main__":
    main()