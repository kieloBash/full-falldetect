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
from ultralytics import YOLO

import config
from node_client import Heartbeat, current_stream_base_url, get_alert_sender, send_fall_alert
from stream_server import frame_store, start_stream_server
from stream_utils import encode_stream_jpeg

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

# ── Config (from backend/.env via config.py) ───────────────────────────────────
WEIGHTS_PATH            = config.WEIGHTS_PATH
CAMERA_ID_MAP           = config.CAMERA_ID_MAP      # e.g. {0: "CAM-201"}
SCREENSHOT_FOLDER       = config.SCREENSHOT_FOLDER  # local copy, backend/screenshots
CONF                    = 0.2
INITIAL_ALERT_DELAY_SEC = 5
REPEAT_ALERT_INTERVAL   = 10
MAX_REPEAT_ALERTS       = 4
INFER_SKIP              = 2
FIRST_FRAME_WAIT_SEC    = 60   # max wait for models to load before the first heartbeat

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
def fire_alert(camera_id: str, timestamp: str, screenshot_path: str | None,
               alert_count: int, missing_secs: int, confidence: float = 0.0):
    print("\n" + "=" * 55)
    print(f"  FALL ALERT #{alert_count} -- Camera {camera_id}")
    print(f"  Timestamp   : {timestamp}")
    print(f"  Missing for : {missing_secs}s")
    print(f"  Screenshot  : {screenshot_path or 'none'}")
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

    def _annotate_and_publish(self, frame, detected_class, confidence):
        """Draw detection overlay onto frame and push it to the stream server."""
        annotated = frame.copy()
        h, w = annotated.shape[:2]

        if detected_class == "patient_on_bed":
            color = (0, 200, 150)
            label = f"Patient on bed  {confidence:.0%}"
        elif detected_class is not None:
            color = (220, 120, 0)
            label = f"{detected_class}  {confidence:.0%}"
        else:
            color = (0, 0, 220)
            label = "No detection"

        bx, by = int(w * 0.3), int(h * 0.25)
        bw, bh = int(w * 0.4), int(h * 0.5)
        cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 2)
        cv2.putText(annotated, label, (bx, by - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

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
        last_result = {"class": None, "confidence": None, "frame": None}
        print(f"[{self.camera_id}] Model loaded — inference started")

        while self.running.is_set():
            try:
                frame_idx, frame = self.frame_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            if frame_idx % INFER_SKIP == 0:
                resized = cv2.resize(frame, (640, 640))
                results = self.model(resized, conf=CONF, verbose=False)
                boxes   = results[0].boxes
                if len(boxes) > 0:
                    best   = max(boxes, key=lambda b: b.conf.item())
                    cls_id = int(best.cls.item())
                    last_result = {
                        "class"     : class_names.get(cls_id, str(cls_id)),
                        "confidence": round(float(best.conf.item()), 4),
                        "frame"     : frame,
                    }
                else:
                    last_result = {"class": None, "confidence": None, "frame": frame}
            else:
                last_result = {**last_result, "frame": frame}

            self._annotate_and_publish(
                last_result["frame"],
                last_result["class"],
                last_result["confidence"] or 0.0,
            )

            if self.result_queue.full():
                try: self.result_queue.get_nowait()
                except queue.Empty: pass
            self.result_queue.put({
                "frame_idx" : frame_idx,
                "timestamp" : datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                **last_result,
            })

    def _alert_monitor(self):
        missing_since   = None
        last_alert_time = None
        alert_count     = 0

        while self.running.is_set():
            time.sleep(0.5)
            try:
                result = self.result_queue.get_nowait()
            except queue.Empty:
                continue

            patient_detected = result.get("class") == "patient_on_bed"
            now    = time.time()
            status = result.get("class") or "no_detection"
            conf   = result.get("confidence")
            print(f"  [{self.camera_id}] Frame {result.get('frame_idx'):>6} | "
                  f"{status:<20}" + (f" | conf={conf:.4f}" if conf else ""))

            if patient_detected:
                if missing_since is not None:
                    print(f"  [{self.camera_id}] Patient back — resetting timer")
                missing_since   = None
                last_alert_time = None
                alert_count     = 0
                continue

            if missing_since is None:
                missing_since = now
                print(f"  [{self.camera_id}] Not detected — starting {INITIAL_ALERT_DELAY_SEC}s timer")

            missing_secs = now - missing_since
            should_alert = False
            if last_alert_time is None and missing_secs >= INITIAL_ALERT_DELAY_SEC:
                should_alert = True
            elif (last_alert_time is not None
                  and now - last_alert_time >= REPEAT_ALERT_INTERVAL
                  and alert_count < MAX_REPEAT_ALERTS):
                should_alert = True

            if should_alert:
                alert_count    += 1
                last_alert_time = now
                frame      = result.get("frame")
                screenshot = save_screenshot(frame, self.camera_id) if frame is not None else None
                confidence = result.get("confidence") or 0.0
                threading.Thread(
                    target=fire_alert,
                    args=(self.camera_id, result.get("timestamp"), screenshot,
                          alert_count, round(missing_secs), confidence),
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