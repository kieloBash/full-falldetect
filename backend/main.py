"""
Fall Detection Monitor
- Auto detects all available cameras
- User selects which cameras to monitor
- Each selected camera runs independently with its own model instance
- Fires REST API alert per camera if patient not detected for 30s
- Saves screenshot per alert
"""

import cv2
import time
import requests
import threading
import queue
import os
import platform
from datetime import datetime, timezone
from ultralytics import YOLO
from config import FRONTEND_INGEST_URL, INGEST_SECRET

# config
WEIGHTS_PATH            = "/Volumes/256 SSD/Dev/full-fall-detect/backend/model/best_v2.pt"
CONF                    = 0.6
INITIAL_ALERT_DELAY_SEC = 5
REPEAT_ALERT_INTERVAL   = 10
MAX_REPEAT_ALERTS       = 4
INFER_SKIP              = 2
ALERT_API_URL           = FRONTEND_INGEST_URL
SCREENSHOT_FOLDER       = "screenshots"

# platform detection
IS_WINDOWS = platform.system() == "Windows"
IS_MAC     = platform.system() == "Darwin"


def detect_cameras(max_index=5):
    available = []
    print("[*] Scanning for cameras...\n")
    print(f"[*] Platform: {platform.system()}\n")

    for i in range(max_index + 1):
        cap = None

        if IS_WINDOWS:
            for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF]:
                c = cv2.VideoCapture(i, backend)
                if c.isOpened():
                    ret, _ = c.read()
                    if ret:
                        cap = c
                        break
                c.release()
        else:
            # Mac / Linux — AVFoundation picked automatically
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
            print(f"  [OK] index={i} | camera_id=CAM-{i+1} | {w}x{h}")
            available.append({"index": i, "camera_id": f"CAM-{i+1}"})
            cap.release()
        else:
            print(f"  [--] index={i} not available")

    print(f"\n[*] Found {len(available)} camera(s)\n")
    return available


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


def save_screenshot(frame, camera_id):
    os.makedirs(SCREENSHOT_FOLDER, exist_ok=True)
    ts       = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{SCREENSHOT_FOLDER}/{camera_id}_{ts}.jpg"
    cv2.imwrite(filename, frame)
    print(f"  [Screenshot] {filename}")
    return filename


def fire_alert(camera_id, timestamp, screenshot_path, alert_count, missing_secs):
    print("\n" + "=" * 55)
    print(f"  FALL ALERT #{alert_count} -- Camera {camera_id}")
    print(f"  Timestamp     : {timestamp}")
    print(f"  Missing for   : {missing_secs}s")
    print(f"  Screenshot    : {screenshot_path}")
    print("=" * 55 + "\n")

    payload = {
        "deviceId"   : camera_id,
        "detectedAt" : datetime.now(timezone.utc).isoformat(),
        "confidence" : CONF * 100,
        "eventType"  : "fall",
        "screenshot": screenshot_path,
        "alertCount": alert_count,
        "missingSecs": missing_secs,
    }
    try:
        r = requests.post(
            ALERT_API_URL,
            json    = payload,
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {INGEST_SECRET}"},
            timeout = 5,
        )
        r.raise_for_status()
        print(f"  [API] {r.status_code} -- {r.text}")
    except requests.exceptions.ConnectionError:
        print(f"  [API] Could not connect to {ALERT_API_URL}")
    except Exception as e:
        print(f"  [API] Error: {e}")


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
        t1.start()
        t2.start()
        t3.start()
        self.threads = [t1, t2, t3]
        print(f"[{self.camera_id}] Monitoring started")

    def stop(self):
        self.running.clear()
        for t in self.threads:
            t.join(timeout=3)
        print(f"[{self.camera_id}] Stopped")

    def _camera_reader(self):
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

            if self.result_queue.full():
                try: self.result_queue.get_nowait()
                except queue.Empty: pass
            self.result_queue.put({
                "frame_idx": frame_idx,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
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
                screenshot = save_screenshot(result.get("frame"), self.camera_id) \
                             if result.get("frame") is not None else "N/A"
                threading.Thread(
                    target=fire_alert,
                    args=(self.camera_id, result.get("timestamp"), screenshot, alert_count, round(missing_secs)),
                    daemon=True,
                ).start()


def main():
    available = detect_cameras()
    if not available:
        print("[!] No cameras found. Exiting.")
        return

    selected = prompt_camera_selection(available)
    if not selected:
        print("[!] No cameras selected. Exiting.")
        return

    print(f"\n[*] Monitoring  : {[c['camera_id'] for c in selected]}")
    print(f"[*] API URL     : {ALERT_API_URL}")
    print(f"[*] Screenshots : {SCREENSHOT_FOLDER}/")
    print(f"[*] Press Ctrl+C to stop\n")
    print(f"[*] Each camera will load its own model instance...\n")

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