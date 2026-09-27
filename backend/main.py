# location: backend/main.py
"""
Fall Detection Monitor (camera laptop / laptop 2)
- Detects the cameras listed in CAMERA_ID_MAP (Mac and Windows compatible)
- User selects which cameras to monitor (auto-selects if only one)
- Each selected camera runs independently with its own model instance
- Raises a fall alert when patient_on_bed is missing for INITIAL_ALERT_DELAY_SEC,
  repeating every REPEAT_ALERT_INTERVAL up to MAX_REPEAT_ALERTS times
- First alert of each episode uploads its screenshot to the private Supabase bucket;
  alerts go to laptop 1 and are queued/retried if laptop 1 is unreachable
- Streams annotated MJPEG on http://<this laptop's IP>:8002/stream/<camera_id> (token required)
- Sends a heartbeat to laptop 1 every 30 s with this laptop's video address and camera status
All settings come from backend/.env via config.py.
"""

import logging
import os
import platform
import queue
import threading
import time
from datetime import datetime
import cv2
from datetime import datetime
from ultralytics import YOLO
from fall_detector import FallDetector
import config
from node_client import Heartbeat, current_stream_base_url, get_alert_sender, send_fall_alert
from stream_server import frame_store, start_stream_server
from stream_utils import encode_stream_jpeg

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

# ── Config (from backend/.env via config.py) ───────────────────────────────────
WEIGHTS_PATH            = config.WEIGHTS_PATH
CAMERA_ID_MAP           = config.CAMERA_ID_MAP      # e.g. {0: "CAM-201"}
SCREENSHOT_FOLDER       = config.SCREENSHOT_FOLDER  

# ── Config ─────────────────────────────────────────────────────────────────────
CONF                    = 0.2
REPEAT_ALERT_INTERVAL   = 10
MAX_REPEAT_ALERTS       = 4
INFER_SKIP              = 2
FIRST_FRAME_WAIT_SEC    = 60   
INFER_SIZE              = 640  

PATIENT_CLASS_NAME      = "patient"
BED_CLASS_NAME          = "bed"

FALLBACK_CAMERA_FPS     = 30


# MJPEG stream server
STREAM_HOST             = "0.0.0.0"
STREAM_PORT             = 8002

# ── Platform detection ─────────────────────────────────────────────────────────
IS_WINDOWS = platform.system() == "Windows"
IS_MAC     = platform.system() == "Darwin"
print(f"[*] Platform: {platform.system()}")


# ── Camera discovery ───────────────────────────────────────────────────────────
def detect_cameras():
    """Probes only the indexes listed in CAMERA_ID_MAP (fewer OpenCV warnings on Mac)."""
    available = []
    print("[*] Scanning for cameras...\n")

    for i in sorted(CAMERA_ID_MAP):
        cap = None

        if IS_WINDOWS:
            # Try DSHOW first, fall back to MSMF
            for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF]:
                c = cv2.VideoCapture(i, backend)
                if c.isOpened():
                    ret, _ = c.read()
                    if ret:
                        cap = c
                        break
                c.release()
        else:
            # Mac / Linux — AVFoundation chosen automatically, no flag needed
            c = cv2.VideoCapture(i)
            if c.isOpened():
                ret, _ = c.read()
                if ret:
                    cap = c
                else:
                    c.release()
            else:
                c.release()

        camera_id = CAMERA_ID_MAP[i]
        if cap is not None:
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            print(f"  [OK] index={i} | camera_id={camera_id} | {w}x{h}")
            available.append({"index": i, "camera_id": camera_id})
            cap.release()
        else:
            print(f"  [--] index={i} ({camera_id}) not available")

    print(f"\n[*] Found {len(available)} camera(s)\n")
    return available


# ── Camera selection ───────────────────────────────────────────────────────────
def prompt_camera_selection(available):
    if not available:
        return []
    if len(available) == 1:
        print(f"[*] Auto-selected: {available[0]['camera_id']}")
        return available

    print("Available cameras:\n")
    for cam in available:
        print(f"  [{cam['index']}] {cam['camera_id']}")

    print("\nEnter camera indices to monitor (e.g. 0 2 3)")
    print("Press Enter to select all\n")

    while True:
        try:
            raw = input("Select cameras: ").strip()
            if raw == "":
                print(f"\n[*] All {len(available)} cameras selected")
                return available
            indices = list(map(int, raw.split()))
            valid   = {cam["index"] for cam in available}
            invalid = [i for i in indices if i not in valid]
            if invalid:
                print(f"  [!] Invalid indices: {invalid}")
                continue
            seen, selected = set(), []
            for i in indices:
                if i not in seen:
                    seen.add(i)
                    selected.append(next(c for c in available if c["index"] == i))
            print(f"\n[*] Selected: {[c['camera_id'] for c in selected]}")
            return selected
        except ValueError:
            print("  [!] Enter space-separated indices (e.g. 0 2 3)")


# ── Screenshot ─────────────────────────────────────────────────────────────────
def save_screenshot(frame, camera_id):
    """Saves a local copy and returns its path (uploaded to Supabase by send_fall_alert)."""
    os.makedirs(SCREENSHOT_FOLDER, exist_ok=True)
    ts       = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filepath = os.path.join(SCREENSHOT_FOLDER, f"{camera_id}_{ts}.jpg")
    cv2.imwrite(filepath, frame)
    print(f"  [Screenshot] {filepath}")
    return filepath


# ── Alert ──────────────────────────────────────────────────────────────────────
def fire_alert(camera_id: str, timestamp: str, screenshot_path: str,
               alert_count: int, reason: str, confidence: float = 0.0):
    print("\n" + "=" * 55)
    print(f"  FALL ALERT #{alert_count} -- Camera {camera_id}")
    print(f"  Timestamp   : {timestamp}")
    print(f"  Reason      : {reason}")
    print(f"  Screenshot  : {screenshot_path}")
    print("=" * 55 + "\n")

    # Only the first alert of an episode creates an incident; repeats come back
    # "already_open", so only the first one uploads its screenshot.
    send_fall_alert(
        camera_id,
        round(confidence * 100, 2),                       # 0–1 → 0–100
        screenshot_path if alert_count == 1 else None,
    )


# ── Per-camera monitor ─────────────────────────────────────────────────────────
class CameraMonitor:
    def __init__(self, camera, weights_path):
        self.camera_index = camera["index"]
        self.camera_id    = camera["camera_id"]
        self.weights_path = weights_path
        self.model        = None
        self.frame_queue  = queue.Queue(maxsize=2)
        self.result_queue = queue.Queue(maxsize=2)
        self.running      = threading.Event()
        self.running.set()
        self.threads      = []

        self.camera_fps   = None
        self.fps_ready     = threading.Event()
        self.fall_detector = None  

    def start(self):
        t1 = threading.Thread(target=self._camera_reader,  daemon=True)
        t2 = threading.Thread(target=self._yolo_inference, daemon=True)
        t3 = threading.Thread(target=self._alert_monitor,  daemon=True)
        t1.start(); t2.start(); t3.start()
        self.threads = [t1, t2, t3]
        print(f"[{self.camera_id}] Monitoring started")

    def stop(self):
        self.running.clear()
        for t in self.threads:
            t.join(timeout=3)
        print(f"[{self.camera_id}] Stopped")

    def _camera_reader(self):
        # Mac: no backend flag — AVFoundation handles it
        # Windows: DSHOW for best USB camera compatibility
        if IS_WINDOWS:
            cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
        else:
            cap = cv2.VideoCapture(self.camera_index)

        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        if not cap.isOpened():
            print(f"[{self.camera_id}] Could not open camera")
            self.running.clear()
            return

        raw_fps = cap.get(cv2.CAP_PROP_FPS)
        if not raw_fps or raw_fps <= 1 or raw_fps > 120:
            print(f"[{self.camera_id}] Camera reported unreliable FPS "
                  f"({raw_fps}), using fallback {FALLBACK_CAMERA_FPS}")
            raw_fps = FALLBACK_CAMERA_FPS
        self.camera_fps = raw_fps
        self.fps_ready.set()

        frame_idx = 0
        while self.running.is_set():
            ret, frame = cap.read()
            if not ret:
                # Frames stop, so the heartbeat reports this camera offline within ~30 s
                print(f"[{self.camera_id}] Lost feed")
                self.running.clear()
                break
            frame_idx += 1
            if self.frame_queue.full():
                try: self.frame_queue.get_nowait()
                except queue.Empty: pass
            self.frame_queue.put((frame_idx, frame))
        cap.release()

    def _annotate_and_publish(self, frame, patient_box, bed_box, state):
        """Draw the model's actual detection boxes + fall-detector state onto the frame."""
        annotated = frame.copy()
        h, w = annotated.shape[:2]

        if bed_box is not None:
            bx1, by1, bx2, by2 = (int(v) for v in bed_box)
            cv2.rectangle(annotated, (bx1, by1), (bx2, by2), (255, 180, 0), 2)
            cv2.putText(annotated, "bed", (bx1, by1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 180, 0), 1)

        if patient_box is not None:
            px1, py1, px2, py2 = (int(v) for v in patient_box)
            patient_color = (0, 0, 220) if (state and state.alert) else (0, 200, 150)
            cv2.rectangle(annotated, (px1, py1), (px2, py2), patient_color, 2)
            cv2.putText(annotated, "patient", (px1, py1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, patient_color, 1)

        if state and state.alert:
            status_color, status_label = (0, 0, 220), f"FALL ALERT: {state.reason}"
        elif state and state.warning:
            status_color, status_label = (0, 165, 255), f"Warning: {state.reason}"
        elif bed_box is None:
            status_color, status_label = (0, 0, 220), "No bed detected"
        elif patient_box is None:
            status_color, status_label = (150, 150, 150), "No patient detected"
        else:
            status_color, status_label = (0, 200, 150), "Patient on bed"

        cv2.putText(annotated, status_label, (10, h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

        # REC badge
        cv2.circle(annotated, (16, 16), 6, (0, 0, 220), -1)
        cv2.putText(annotated, "REC", (26, 21),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (240, 240, 240), 1)

        # Camera ID label
        cv2.putText(annotated, self.camera_id, (w - 90, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

        # Downscaled to STREAM_MAX_WIDTH and JPEG-encoded at STREAM_JPEG_QUALITY
        frame_store.publish(self.camera_id, encode_stream_jpeg(annotated))

    def _yolo_inference(self):
        print(f"[{self.camera_id}] Loading model...")
        try:
            self.model = YOLO(self.weights_path)
        except Exception as exc:
            # Without this, the thread died silently and the camera looked alive but never alerted
            print(f"[{self.camera_id}] [!] Could not load model from {self.weights_path}: {exc}")
            print(f"[{self.camera_id}] [!] Check WEIGHTS_PATH in backend/.env. This camera is stopping.")
            self.running.clear()
            return
        class_names = self.model.names
        print(f"[{self.camera_id}] Model loaded — waiting for camera FPS...")

        self.fps_ready.wait(timeout=5)
        effective_fps = (self.camera_fps or FALLBACK_CAMERA_FPS) / INFER_SKIP
        self.fall_detector = FallDetector(fps=effective_fps, sustained_seconds=3.0)
        print(f"[{self.camera_id}] Inference started "
              f"(camera_fps={self.camera_fps}, effective inference fps={effective_fps:.2f})")

        last_patient_box = None
        last_bed_box     = None
        last_state       = None
        last_confidence  = 0.0

        while self.running.is_set():
            try:
                frame_idx, frame = self.frame_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            if frame_idx % INFER_SKIP == 0:
                h0, w0 = frame.shape[:2]
                scale_x, scale_y = w0 / INFER_SIZE, h0 / INFER_SIZE

                resized = cv2.resize(frame, (INFER_SIZE, INFER_SIZE))
                results = self.model(resized, conf=CONF, verbose=False)
                boxes   = results[0].boxes

                patient_box, patient_conf = None, 0.0
                bed_box, bed_conf         = None, 0.0

                for b in boxes:
                    cls_id = int(b.cls.item())
                    name   = class_names.get(cls_id, str(cls_id))
                    conf   = float(b.conf.item())
                    x1, y1, x2, y2 = b.xyxy[0].tolist()
                    # scale from the 640x640 inference frame back to real frame coords
                    box_orig = (x1 * scale_x, y1 * scale_y, x2 * scale_x, y2 * scale_y)

                    if name == PATIENT_CLASS_NAME and conf > patient_conf:
                        patient_box, patient_conf = box_orig, conf
                    elif name == BED_CLASS_NAME and conf > bed_conf:
                        bed_box, bed_conf = box_orig, conf

                # One update() call per actual inference step -- this is what
                # keeps FallDetector's sustained-duration/velocity math correct.
                state = self.fall_detector.update(patient_box, bed_box)

                last_patient_box = patient_box
                last_bed_box     = bed_box
                last_state       = state
                last_confidence  = max(patient_conf, bed_conf)

            self._annotate_and_publish(frame, last_patient_box, last_bed_box, last_state)

            if self.result_queue.full():
                try: self.result_queue.get_nowait()
                except queue.Empty: pass
            self.result_queue.put({
                "frame_idx"  : frame_idx,
                "timestamp"  : datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "state"      : last_state,
                "confidence" : last_confidence,
                "frame"      : frame,
            })

    def _alert_monitor(self):
        last_alert_time = None
        alert_count     = 0
        was_in_alert    = False

        while self.running.is_set():
            time.sleep(0.5)
            try:
                result = self.result_queue.get_nowait()
            except queue.Empty:
                continue

            state = result.get("state")
            now   = time.time()
            conf  = result.get("confidence")

            status = "no data"
            if state is not None:
                if state.alert:
                    status = f"ALERT: {state.reason}"
                elif state.warning:
                    status = f"warning: {state.reason}"
                else:
                    status = "normal"
            print(f"  [{self.camera_id}] Frame {result.get('frame_idx'):>6} | "
                  f"{status:<40}" + (f" | conf={conf:.4f}" if conf else ""))

            in_alert = bool(state and state.alert)

            if not in_alert:
                if was_in_alert:
                    print(f"  [{self.camera_id}] Alert condition cleared — resetting")
                was_in_alert    = False
                last_alert_time = None
                alert_count     = 0
                continue

            # in_alert is True from here down
            should_fire = False
            if not was_in_alert:
                # first frame of a new alert episode -- fire immediately
                should_fire = True
            elif (last_alert_time is not None
                  and now - last_alert_time >= REPEAT_ALERT_INTERVAL
                  and alert_count < MAX_REPEAT_ALERTS):
                should_fire = True

            was_in_alert = True

            if should_fire:
                alert_count    += 1
                last_alert_time = now
                frame      = result.get("frame")
                screenshot = save_screenshot(frame, self.camera_id) if frame is not None else None
                confidence = result.get("confidence") or 0.0
                reason     = state.reason if state else "unknown"
                threading.Thread(
                    target=fire_alert,
                    args=(self.camera_id, result.get("timestamp"), screenshot,
                          alert_count, reason, confidence),
                    daemon=True,
                ).start()


# ── Startup helpers ────────────────────────────────────────────────────────────
def wait_for_first_frames(camera_ids, timeout=FIRST_FRAME_WAIT_SEC):
    """Waits until every camera has streamed a frame (models loaded), so the first
    heartbeat doesn't report them offline and log a needless offline/online pair."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if all(s["status"] == "online" for s in frame_store.statuses(camera_ids)):
            return True
        time.sleep(0.5)
    return False


# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    available = detect_cameras()
    if not available:
        print("[!] No cameras found. Check CAMERA_ID_MAP in backend/.env and camera permissions.")
        return

    selected = prompt_camera_selection(available)
    if not selected:
        print("[!] No cameras selected. Exiting.")
        return
    selected_ids = [c["camera_id"] for c in selected]

    start_stream_server(selected_ids)
    supabase_on = bool(config.SUPABASE_URL and config.SUPABASE_UPLOAD_KEY)

    print(f"[*] Monitoring     : {selected_ids}")
    print(f"[*] Laptop 1       : {config.FRONTEND_BASE_URL}")
    print(f"[*] Video address  : {current_stream_base_url()}/stream/<camera_id> (token required)")
    print(f"[*] Screenshots    : {'Supabase bucket ' + config.SUPABASE_BUCKET if supabase_on else 'upload disabled'}"
          f" (local copies in {SCREENSHOT_FOLDER})")
    pending = get_alert_sender().pending()
    if pending:
        print(f"[*] Retry queue    : {pending} alert(s) from a previous run")
    print("[*] Press Ctrl+C to stop\n")

    monitors = [CameraMonitor(cam, WEIGHTS_PATH) for cam in selected]
    for m in monitors:
        m.start()
        time.sleep(1.5)

    if not wait_for_first_frames(selected_ids):
        print("[!] Some cameras haven't produced frames yet; they'll show offline until they do.")
    heartbeat = Heartbeat(lambda: frame_store.statuses(selected_ids))
    heartbeat.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Stopping...")
        heartbeat.stop()
        for m in monitors:
            m.stop()
        pending = get_alert_sender().pending()
        if pending:
            print(f"[*] {pending} alert(s) still queued; they'll be sent on the next start.")
        print("[*] Shutdown complete.")


if __name__ == "__main__":
    main()