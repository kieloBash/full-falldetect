"""
Usage:
    python image_batch_fall_detect_test.py path/to/image.jpg
    python image_batch_fall_detect_test.py path/to/frames_folder/ --fps 15
    python image_batch_fall_detect_test.py path/to/frames_folder/ --log-file alerts.csv
    python image_batch_fall_detect_test.py path/to/image.jpg --simulate-persistence
"""

import os
import sys
import csv
import argparse
import cv2
from ultralytics import YOLO

from fall_detector import FallDetector

WEIGHTS_PATH            = "D:\\full-falldetect\\backend\\model\\best_v3.pt"
CONF                    = 0.2
INFER_SIZE              = 640
PATIENT_CLASS_NAME      = "patient"
BED_CLASS_NAME          = "bed"
VALID_EXTENSIONS        = (".jpg", ".jpeg", ".png")
REPEAT_ALERT_INTERVAL   = 10.0       
MAX_REPEAT_ALERTS       = 4         
ALERT_FLASH_SECONDS     = 2.0        
# ----------------------------------------------------------------------

def detect_boxes(model, class_names, image):
    """Run inference on one frame, return boxes scaled back to the frame's pixel space."""
    h0, w0 = image.shape[:2]
    scale_x, scale_y = w0 / INFER_SIZE, h0 / INFER_SIZE

    resized = cv2.resize(image, (INFER_SIZE, INFER_SIZE))
    results = model(resized, conf=CONF, verbose=False)
    boxes   = results[0].boxes

    patient_box, patient_conf = None, 0.0
    bed_box, bed_conf         = None, 0.0

    for b in boxes:
        cls_id = int(b.cls.item())
        name   = class_names.get(cls_id, str(cls_id))
        conf   = float(b.conf.item())
        x1, y1, x2, y2 = b.xyxy[0].tolist()
        box_orig = (x1 * scale_x, y1 * scale_y, x2 * scale_x, y2 * scale_y)

        if name == PATIENT_CLASS_NAME and conf > patient_conf:
            patient_box, patient_conf = box_orig, conf
        elif name == BED_CLASS_NAME and conf > bed_conf:
            bed_box, bed_conf = box_orig, conf

    return patient_box, bed_box, patient_conf, bed_conf


def annotate(image, patient_box, bed_box, state, patient_conf, bed_conf, alert_banner_active=False):
    annotated = image.copy()
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
        label, color = f"FALL ALERT: {state.reason}{ratio_suffix}", (0, 0, 220)
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
    def __init__(self, repeat_interval=REPEAT_ALERT_INTERVAL, max_repeats=MAX_REPEAT_ALERTS):
        self.repeat_interval = repeat_interval
        self.max_repeats = max_repeats
        self.was_in_alert = False
        self.last_alert_time = None
        self.alert_count = 0

    def check(self, state, virtual_time):
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
              and virtual_time - self.last_alert_time >= self.repeat_interval
              and self.alert_count < self.max_repeats):
            should_fire = True

        self.was_in_alert = True

        if should_fire:
            self.alert_count += 1
            self.last_alert_time = virtual_time

        return should_fire


def process_single_image(model, class_names, path, fps, simulate_persistence, output_dir):
    image = cv2.imread(path)
    if image is None:
        print(f"Couldn't read image: {path}")
        return

    patient_box, bed_box, patient_conf, bed_conf = detect_boxes(model, class_names, image)

    detector = FallDetector(fps=fps)
    state = detector.update(patient_box, bed_box)

    print(f"\n--- {os.path.basename(path)} ---")
    print(f"  patient box: {patient_box}  (conf={patient_conf:.2f})" if patient_box else "  patient box: NOT DETECTED")
    print(f"  bed box    : {bed_box}  (conf={bed_conf:.2f})" if bed_box else "  bed box: NOT DETECTED")
    if patient_box and bed_box:
        print(f"  outside_ratio: {state.outside_ratio:.3f}  "
              f"(threshold is {detector.outside_ratio_threshold})")
    print(f"  single-frame result: alert={state.alert}  warning={state.warning}  reason={state.reason!r}")

    if simulate_persistence and patient_box and bed_box:
        sim_detector = FallDetector(fps=fps)
        sim_state = state
        for _ in range(sim_detector.window.maxlen):
            sim_state = sim_detector.update(patient_box, bed_box)
        print(f"  if this position held steady for ~{sim_detector.window.maxlen/fps:.1f}s: "
              f"alert={sim_state.alert}  reason={sim_state.reason!r}")
        state = sim_state  

    annotated = annotate(image, patient_box, bed_box, state, patient_conf, bed_conf)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, f"annotated_{os.path.basename(path)}")
    cv2.imwrite(out_path, annotated)
    print(f"  saved visualization -> {out_path}")


def process_frame_sequence(model, class_names, folder, fps, output_dir, log_path):
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith(VALID_EXTENSIONS))
    if not files:
        print(f"No images found in {folder}")
        return

    detector = FallDetector(fps=fps)
    monitor = AlertMonitor()
    os.makedirs(output_dir, exist_ok=True)

    print(f"Processing {len(files)} frames at {fps} fps "
          f"(sustained window = {detector.window.maxlen} frames = "
          f"{detector.window.maxlen/fps:.1f}s)  |  repeat interval: {REPEAT_ALERT_INTERVAL}s  "
          f"|  max repeats: {MAX_REPEAT_ALERTS}\n")

    log_rows = []
    alert_flash_until = -1.0

    for i, filename in enumerate(files):
        path = os.path.join(folder, filename)
        image = cv2.imread(path)
        if image is None:
            print(f"  [{i}] couldn't read {filename}, skipping")
            continue

        virtual_time = i / fps
        patient_box, bed_box, patient_conf, bed_conf = detect_boxes(model, class_names, image)
        state = detector.update(patient_box, bed_box)

        status = "alert" if state.alert else ("warning" if state.warning else "normal")
        ratio_str = f"{state.outside_ratio:.3f}" if patient_box and bed_box else ""

        # Replay the same debounce logic main.py's alert monitor uses.
        fired = monitor.check(state, virtual_time)
        if fired:
            alert_flash_until = virtual_time + ALERT_FLASH_SECONDS

        log_rows.append({
            "frame": i,
            "filename": filename,
            "virtual_time": f"{virtual_time:.2f}",
            "patient_detected": patient_box is not None,
            "patient_conf": f"{patient_conf:.3f}" if patient_box is not None else "",
            "bed_detected": bed_box is not None,
            "bed_conf": f"{bed_conf:.3f}" if bed_box is not None else "",
            "outside_ratio": ratio_str,
            "status": status,
            "reason": state.reason,
            "alert_fired": fired,
        })

        print_status = "ALERT" if state.alert else ("warning" if state.warning else "normal")
        ratio_display = f"ratio={state.outside_ratio:.2f}" if patient_box and bed_box else ""
        fired_marker = "  >>> ALERT FIRED" if fired else ""
        print(f"  [{i:03d}] {filename:<30} {print_status:<8} {ratio_display}  {state.reason}{fired_marker}")

        banner_active = virtual_time <= alert_flash_until
        annotated = annotate(image, patient_box, bed_box, state, patient_conf, bed_conf,
                              alert_banner_active=banner_active)
        cv2.imwrite(os.path.join(output_dir, f"{i:03d}_{filename}"), annotated)

    if log_path:
        fieldnames = ["frame", "filename", "virtual_time", "patient_detected", "patient_conf",
                      "bed_detected", "bed_conf", "outside_ratio", "status", "reason", "alert_fired"]
        with open(log_path, "w", newline="") as f:
            csv_writer = csv.DictWriter(f, fieldnames=fieldnames)
            csv_writer.writeheader()
            csv_writer.writerows(log_rows)
        print(f"\nLog written to: {log_path}  ({len(log_rows)} frames logged)")

    fired_alerts = sum(1 for r in log_rows if r["alert_fired"])
    print(f"Done. {fired_alerts} alert(s) would have fired. Annotated frames saved to '{output_dir}/'.")


def main():
    parser = argparse.ArgumentParser(description="Test patient/bed detection + fall logic on images.")
    parser.add_argument("input", help="Path to a single image, or a folder of sequential frame images.")
    parser.add_argument("--fps", type=float, default=15.0,
                         help="Assumed frame rate for FallDetector's timing math (default: 15).")
    parser.add_argument("--simulate-persistence", action="store_true",
                         help="For a single image: also show what would happen if this exact "
                              "detection held steady for the full sustained window.")
    parser.add_argument("--output-dir", default="test_output",
                         help="Where annotated images are saved (default: test_output/).")
    parser.add_argument("--log-file", default="fall_test_log.csv",
                         help="For a folder input: where to write the per-frame CSV log "
                              "(default: fall_test_log.csv). Ignored for a single image.")
    args = parser.parse_args()

    print("Loading model...")
    model = YOLO(WEIGHTS_PATH)
    class_names = model.names
    print("Model loaded.\n")

    if os.path.isdir(args.input):
        process_frame_sequence(model, class_names, args.input, args.fps, args.output_dir, args.log_file)
    elif os.path.isfile(args.input):
        process_single_image(model, class_names, args.input, args.fps,
                              args.simulate_persistence, args.output_dir)
    else:
        print(f"Input path not found: {args.input}")
        sys.exit(1)


if __name__ == "__main__":
    main()