# location: backend/check_node.py
# Pre-flight check for laptop 2. Changes nothing unless you pass --upload-test.
#   python check_node.py
#   python check_node.py --upload-test   (uploads one small test image to Supabase)
from __future__ import annotations

import argparse
import os
import socket
import time
from urllib.parse import urlparse

import cv2
import jwt
import numpy as np
import requests

import config
from node_client import current_stream_base_url, detect_lan_ip, get_alert_sender, upload_screenshot
from stream_auth import AUDIENCE, ISSUER, verify_stream_token


def result(ok: bool, label: str, detail: str = "") -> bool:
    print(f"  [{'OK  ' if ok else 'FAIL'}] {label}{(' — ' + detail) if detail else ''}")
    return ok


def port_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=3):
            return True
    except OSError:
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--upload-test", action="store_true")
    args = parser.parse_args()

    lan_ip = detect_lan_ip()
    print("FallDetect camera laptop check\n")
    print(f"  Laptop 1 (web app): {config.FRONTEND_BASE_URL}")
    print(f"  This laptop's IP:   {lan_ip}")
    print(f"  Video address:      {current_stream_base_url()}")
    print(f"  Node key:           {config.NODE_KEY}")
    print(f"  Cameras:            {config.CAMERA_ID_MAP}\n")

    ok = True
    port = urlparse(config.FRONTEND_BASE_URL).port or 80
    reachable = port_open(config.FRONTEND_HOST, port)
    ok &= result(reachable, f"Laptop 1 port {port} reachable", "" if reachable else
                 "is the app running with -H 0.0.0.0? firewall rule on laptop 1? same Wi-Fi? client isolation?")

    # An empty heartbeat is rejected with 400 AFTER the secret check: 400 = secret OK, 401 = mismatch.
    try:
        r = requests.post(config.FRONTEND_HEARTBEAT_URL, json={"nodeKey": config.NODE_KEY, "cameras": []},
                          headers={"Authorization": f"Bearer {config.MONITOR_INGEST_SECRET}"}, timeout=10)
        if r.status_code == 400:
            ok &= result(True, "MONITOR_INGEST_SECRET matches laptop 1")
        elif r.status_code == 401:
            ok &= result(False, "MONITOR_INGEST_SECRET matches laptop 1", "401: the two .env files differ")
        else:
            ok &= result(False, "Heartbeat route", f"unexpected HTTP {r.status_code}: {r.text[:120]}")
    except requests.RequestException as exc:
        ok &= result(False, "Heartbeat route", exc.__class__.__name__)

    now = int(time.time())
    token = jwt.encode({"deviceId": "CAM-TEST", "sub": "check", "iss": ISSUER, "aud": AUDIENCE,
                        "iat": now, "exp": now + 60}, config.STREAM_TOKEN_SECRET, algorithm="HS256")
    ok &= result(verify_stream_token(token, "CAM-TEST") is None, "Stream token verification works")

    ok &= result(os.path.isfile(config.WEIGHTS_PATH), "Model weights file exists", config.WEIGHTS_PATH)

    if config.SUPABASE_URL and config.SUPABASE_UPLOAD_KEY:
        try:
            requests.get(f"{config.SUPABASE_URL}/storage/v1/", timeout=5)
            ok &= result(True, "Supabase reachable (internet OK)")
        except requests.RequestException as exc:
            ok &= result(False, "Supabase reachable", f"{exc.__class__.__name__}: alerts will arrive without screenshots")
        if args.upload_test:
            os.makedirs(config.SCREENSHOT_FOLDER, exist_ok=True)
            path = os.path.join(config.SCREENSHOT_FOLDER, "check_node.jpg")
            img = np.full((90, 160, 3), 90, np.uint8)
            cv2.imwrite(path, img)
            object_path = upload_screenshot(path, "CHECK")
            ok &= result(object_path is not None, "Test upload to Supabase",
                         f"{object_path} (delete it in the dashboard)" if object_path else "see the log line above")
    else:
        result(False, "Supabase configured", "SUPABASE_URL / SUPABASE_UPLOAD_KEY empty: no screenshots")

    if lan_ip and port_open(lan_ip, config.STREAM_PORT):
        result(True, f"Video server listening on {lan_ip}:{config.STREAM_PORT}")
    else:
        print("  [INFO] Video server not running right now (start main.py or demo_stream.py).")
    print(f"  [INFO] From laptop 1, open http://{lan_ip}:{config.STREAM_PORT}/health while it runs.")

    pending = get_alert_sender().pending()
    print(f"  [INFO] {pending} alert(s) waiting in the retry queue")

    print("\nAll checks passed." if ok else "\nFix the FAIL items above, then run this again.")


if __name__ == "__main__":
    main()
