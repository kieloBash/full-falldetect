# location: backend/stream_server.py
# REPLACES the Flask MJPEG server that lived inside main.py (TDS §7.5).
# Endpoints:
#   GET /stream/<camera_id>?token=...  multipart MJPEG (token from laptop 1's /api/stream-token)
#   GET /health                        {"status": "ok", "node": ..., "streaming": [...]}
from __future__ import annotations

import logging
import threading
import time

import cv2
import numpy as np
from flask import Flask, Response, jsonify
from werkzeug.serving import make_server

import config
from stream_auth import check_stream_request

# Werkzeug would log every request, including stream tokens in the URL.
logging.getLogger("werkzeug").setLevel(logging.WARNING)

ONLINE_WITHIN_SEC = 10
DEGRADED_WITHIN_SEC = 30


class FrameStore:
    """Latest JPEG per camera, shared between inference threads and HTTP clients."""

    def __init__(self):
        self._frames: dict[str, tuple[bytes, int, float]] = {}  # camera -> (jpeg, version, time)
        self._cond = threading.Condition()

    def publish(self, camera_id: str, jpeg: bytes | None) -> None:
        if not jpeg:
            return
        with self._cond:
            version = self._frames.get(camera_id, (b"", 0, 0.0))[1] + 1
            self._frames[camera_id] = (jpeg, version, time.time())
            self._cond.notify_all()

    def latest(self, camera_id: str) -> bytes | None:
        with self._cond:
            entry = self._frames.get(camera_id)
            return entry[0] if entry else None

    def wait_for_newer(self, camera_id: str, after_version: int, timeout: float):
        deadline = time.time() + timeout
        with self._cond:
            while True:
                entry = self._frames.get(camera_id)
                if entry and entry[1] > after_version:
                    return entry[0], entry[1]
                remaining = deadline - time.time()
                if remaining <= 0:
                    return None, after_version
                self._cond.wait(remaining)

    def statuses(self, camera_ids) -> list[dict]:
        """Heartbeat payload: online if a frame arrived in the last 10 s."""
        now = time.time()
        result = []
        with self._cond:
            for camera_id in camera_ids:
                entry = self._frames.get(camera_id)
                age = now - entry[2] if entry else None
                if age is None or age > DEGRADED_WITHIN_SEC:
                    status = "offline"
                elif age > ONLINE_WITHIN_SEC:
                    status = "degraded"
                else:
                    status = "online"
                result.append({"deviceId": camera_id, "status": status})
        return result


frame_store = FrameStore()
_placeholders: dict[str, bytes] = {}


def _placeholder(camera_id: str) -> bytes:
    if camera_id not in _placeholders:
        img = np.full((360, 640, 3), 40, np.uint8)
        cv2.putText(img, f"Waiting for {camera_id}...", (40, 190), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (220, 220, 220), 2)
        _placeholders[camera_id] = cv2.imencode(".jpg", img)[1].tobytes()
    return _placeholders[camera_id]


def create_app(camera_ids) -> Flask:
    app = Flask(__name__)
    allowed = set(camera_ids)

    @app.get("/health")
    def health():
        return jsonify(status="ok", node=config.NODE_KEY, streaming=sorted(allowed))

    @app.get("/stream/<camera_id>")
    def stream(camera_id):
        if camera_id not in allowed:
            return jsonify(error="Unknown camera"), 404
        denied = check_stream_request(camera_id)
        if denied:
            return denied

        def generate():
            version = -1
            period = 1.0 / max(1, config.STREAM_FPS)
            while True:
                jpeg, version = frame_store.wait_for_newer(camera_id, version, timeout=2.0)
                if jpeg is None:
                    jpeg = _placeholder(camera_id)  # also keeps the connection alive
                yield (
                    b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: "
                    + str(len(jpeg)).encode()
                    + b"\r\n\r\n"
                    + jpeg
                    + b"\r\n"
                )
                time.sleep(period)

        return Response(
            generate(),
            mimetype="multipart/x-mixed-replace; boundary=frame",
            headers={"Cache-Control": "no-store, no-cache, must-revalidate", "X-Accel-Buffering": "no"},
        )

    return app


class _ServerThread(threading.Thread):
    def __init__(self, app: Flask):
        super().__init__(daemon=True, name="stream-server")
        self._server = make_server(config.STREAM_HOST, config.STREAM_PORT, app, threaded=True)

    def run(self):
        self._server.serve_forever()

    def shutdown(self):
        self._server.shutdown()


def start_stream_server(camera_ids) -> _ServerThread:
    thread = _ServerThread(create_app(camera_ids))
    thread.start()
    print(f"[stream] Serving video on http://{config.STREAM_HOST}:{config.STREAM_PORT} for {sorted(camera_ids)}")
    return thread
