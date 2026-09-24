# location: backend/demo_stream.py
# Tests the whole two-laptop chain WITHOUT YOLO or a webcam:
# synthetic video → stream server (port 8002) → heartbeat → dashboard on laptop 1.
#   python demo_stream.py                  (video + heartbeat)
#   python demo_stream.py --alert CAM-201  (also one fake fall alert, screenshot via Supabase)
from __future__ import annotations

import argparse
import logging
import math
import os
import time
from datetime import datetime

import cv2
import numpy as np

import config
from node_client import Heartbeat, current_stream_base_url, send_fall_alert
from stream_server import frame_store, start_stream_server
from stream_utils import encode_stream_jpeg


def synthetic_frame(camera_id: str, t: float) -> np.ndarray:
    img = np.full((720, 1280, 3), (48, 42, 36), np.uint8)
    x = int(640 + 420 * math.sin(t))
    cv2.circle(img, (x, 360), 60, (80, 180, 255), -1)
    cv2.putText(img, f"{camera_id}  DEMO", (40, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 3)
    cv2.putText(img, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), (40, 680),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
    return img


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--alert", metavar="CAM_ID", help="send one fake fall alert for this camera")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

    cameras = list(config.CAMERA_ID_MAP.values())
    start_stream_server(cameras)
    for cam in cameras:  # so the first heartbeat reports them online
        frame_store.publish(cam, encode_stream_jpeg(synthetic_frame(cam, 0)))

    print(f"[demo] Video address reported to laptop 1: {current_stream_base_url()}")
    Heartbeat(lambda: frame_store.statuses(cameras)).start()

    if args.alert:
        os.makedirs(config.SCREENSHOT_FOLDER, exist_ok=True)
        path = os.path.join(config.SCREENSHOT_FOLDER, f"{args.alert}_demo_{int(time.time())}.jpg")
        cv2.imwrite(path, synthetic_frame(args.alert, 1.0))
        send_fall_alert(args.alert, 87.5, path)

    print("[demo] Streaming synthetic video. Press Ctrl+C to stop.")
    start = time.time()
    try:
        while True:
            t = time.time() - start
            for cam in cameras:
                frame_store.publish(cam, encode_stream_jpeg(synthetic_frame(cam, t)))
            time.sleep(1 / max(1, config.STREAM_FPS))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
