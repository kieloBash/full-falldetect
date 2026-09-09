"""
Fall Detection Monitor
- Auto detects all available cameras (Mac and Windows compatible)
- User selects which cameras to monitor
- Each selected camera runs independently with its own model instance
- Fires REST API alert to Next.js when patient not detected for 30s
- Saves screenshot to frontend/public/screenshots/ so Next.js serves it
- Streams annotated MJPEG frames on http://localhost:8002/stream/<camera_id>
"""

import cv2
import time
import requests
import threading
import queue
import os
import platform
import numpy as np
from datetime import datetime, timezone
from ultralytics import YOLO
from flask import Flask, Response
from config import FRONTEND_INGEST_URL, INGEST_SECRET

# ── Config ─────────────────────────────────────────────────────────────────────
WEIGHTS_PATH            = "/Volumes/256 SSD/Dev/full-fall-detect/backend/model/best_v2.pt"
CONF                    = 0.2
INITIAL_ALERT_DELAY_SEC = 5
REPEAT_ALERT_INTERVAL   = 10
MAX_REPEAT_ALERTS       = 4
INFER_SKIP              = 2

# Direct to Next.js — no FastAPI middleman needed for local testing
ALERT_API_URL           = FRONTEND_INGEST_URL

# Must be inside frontend/public/ so Next.js serves /screenshots/filename.jpg
SCREENSHOT_FOLDER       = "../frontend/public/screenshots"

# MJPEG stream server
STREAM_HOST             = "0.0.0.0"
STREAM_PORT             = 8002

# ── Platform detection ─────────────────────────────────────────────────────────
IS_WINDOWS = platform.system() == "Windows"
IS_MAC     = platform.system() == "Darwin"
print(f"[*] Platform: {platform.system()}")

# ── Flask MJPEG server ─────────────────────────────────────────────────────────
flask_app = Flask(__name__)

_latest_frames: dict[str, bytes] = {}
_frames_lock = threading.Lock()


def _set_frame(camera_id: str, jpeg_bytes: bytes):
    with _frames_lock:
        _latest_frames[camera_id] = jpeg_bytes


def _get_frame(camera_id: str) -> bytes | None:
    with _frames_lock:
        return _latest_frames.get(camera_id)


def _generate_mjpeg(camera_id: str):
    """Generator that yields MJPEG frames for a given camera."""
    blank_frame = None
    while True:
        frame = _get_frame(camera_id)
        if frame is None:
            if blank_frame is None:
                blank = np.zeros((480, 640, 3), dtype="uint8")
                cv2.putText(blank, f"Waiting for {camera_id}...", (20, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
                _, buf = cv2.imencode(".jpg", blank)
                blank_frame = buf.tobytes()
            frame = blank_frame
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
        time.sleep(1 / 15)  # ~15 fps


@flask_app.route("/stream/<camera_id>")
def video_stream(camera_id):
    return Response(
        _generate_mjpeg(camera_id),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@flask_app.route("/health")
def health():
    with _frames_lock:
        cams = list(_latest_frames.keys())
    return {"status": "ok", "streaming": cams}


def _run_flask():
    flask_app.run(host=STREAM_HOST, port=STREAM_PORT, threaded=True, use_reloader=False)


# ── Camera discovery ───────────────────────────────────────────────────────────
def detect_cameras(max_index=5):
    available = []
    print("[*] Scanning for cameras...\n")

    for i in range(max_index + 1):
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

        if cap is not None:
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            camera_id = f"CAM-{i + 1}"
            print(f"  [OK] index={i} | camera_id={camera_id} | {w}x{h}")
            available.append({"index": i, "camera_id": camera_id})
            cap.release()
        else:
            print(f"  [--] index={i} not available")

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

    print(f"\nEnter camera indices to monitor (e.g. 0 2 3)")
    print(f"Press Enter to select all\n")

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
    os.makedirs(SCREENSHOT_FOLDER, exist_ok=True)
    ts       = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{camera_id}_{ts}.jpg"
    filepath = os.path.join(SCREENSHOT_FOLDER, filename)
    cv2.imwrite(filepath, frame)
    print(f"  [Screenshot] {filepath}")
    # Return just the web-accessible portion — Next.js serves from /public/
    return f"{SCREENSHOT_FOLDER}/{filename}"


# ── Alert ──────────────────────────────────────────────────────────────────────
def fire_alert(camera_id: str, timestamp: str, screenshot_web_path: str,
               alert_count: int, missing_secs: int, confidence: float = 0.0):
    print("\n" + "=" * 55)
    print(f"  FALL ALERT #{alert_count} -- Camera {camera_id}")
    print(f"  Timestamp   : {timestamp}")
    print(f"  Missing for : {missing_secs}s")
    print(f"  Screenshot  : {screenshot_web_path}")
    print("=" * 55 + "\n")

    payload = {
        "deviceId"   : camera_id,
        "confidence" : round(confidence * 100, 2),  # 0–1 → 0–100
        "detectedAt" : datetime.now(timezone.utc).isoformat(),
        "eventType"  : "fall",
        "screenshot" : screenshot_web_path,          # "screenshots/CAM-1_xxx.jpg"
    }
    try:
        r = requests.post(
            ALERT_API_URL,
            json    = payload,
            headers = {"Content-Type": "application/json","Authorization": f"Bearer {INGEST_SECRET}"},
            timeout = 5,
        )
        r.raise_for_status()
        print(f"  [API] {r.status_code} -- {r.text}")
    except requests.exceptions.ConnectionError:
        print(f"  [API] Could not connect to {ALERT_API_URL}")
    except Exception as e:
        print(f"  [API] Error: {e}")


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
        """Draw detection overlay onto frame and push to MJPEG stream."""
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

        _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
        _set_frame(self.camera_id, buf.tobytes())

    def _yolo_inference(self):
        print(f"[{self.camera_id}] Loading model...")
        self.model  = YOLO(self.weights_path)
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
                screenshot = save_screenshot(frame, self.camera_id) if frame is not None else "N/A"
                confidence = result.get("confidence") or 0.0
                threading.Thread(
                    target=fire_alert,
                    args=(self.camera_id, result.get("timestamp"), screenshot,
                          alert_count, round(missing_secs), confidence),
                    daemon=True,
                ).start()


# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    available = detect_cameras()
    if not available:
        print("[!] No cameras found. Exiting.")
        return

    selected = prompt_camera_selection(available)
    if not selected:
        print("[!] No cameras selected. Exiting.")
        return

    # Start MJPEG stream server in background
    flask_thread = threading.Thread(target=_run_flask, daemon=True)
    flask_thread.start()
    print(f"[*] Stream server  : http://localhost:{STREAM_PORT}/stream/<camera_id>")

    print(f"[*] Monitoring     : {[c['camera_id'] for c in selected]}")
    print(f"[*] Alert URL      : {ALERT_API_URL}")
    print(f"[*] Screenshots    : {SCREENSHOT_FOLDER}/")
    print(f"[*] Press Ctrl+C to stop\n")

    monitors = [CameraMonitor(cam, WEIGHTS_PATH) for cam in selected]
    for m in monitors:
        m.start()
        time.sleep(1.5)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Stopping...")
        for m in monitors:
            m.stop()
        print("[*] Shutdown complete.")


if __name__ == "__main__":
    main()