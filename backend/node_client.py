# location: backend/node_client.py
# Everything laptop 2 sends out:
#   - screenshot upload to Supabase Storage (private bucket)
#   - fall alerts to laptop 1, with a persistent retry queue
#   - heartbeats to laptop 1 with this laptop's current video address
from __future__ import annotations

import json
import logging
import os
import secrets
import socket
import threading
from datetime import datetime, timedelta, timezone
from typing import Callable

import requests

import config

log = logging.getLogger("node_client")
_session = requests.Session()


def _auth_headers() -> dict:
    return {"Authorization": f"Bearer {config.MONITOR_INGEST_SECRET}"}


# ── Network ─────────────────────────────────────────────────────────

def detect_lan_ip() -> str | None:
    """IP of the interface that routes to laptop 1 (no packets are sent)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect((config.FRONTEND_HOST or "8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return None
    finally:
        sock.close()


def current_stream_base_url() -> str | None:
    """Re-evaluated on every heartbeat, so a new DHCP address is picked up automatically."""
    if config.PUBLIC_STREAM_URL:
        return config.PUBLIC_STREAM_URL
    ip = detect_lan_ip()
    return f"http://{ip}:{config.STREAM_PORT}" if ip else None


# ── Supabase Storage ────────────────────────────────────────────────

def upload_screenshot(local_path: str, device_id: str) -> str | None:
    """Uploads a JPG to the private bucket. Returns the object path, or None on any failure.
    Short timeout: a missing picture must never delay a fall alert."""
    if not (config.SUPABASE_URL and config.SUPABASE_UPLOAD_KEY):
        return None
    try:
        with open(local_path, "rb") as fh:
            data = fh.read()
    except OSError as exc:
        log.warning("[screenshot] can't read %s: %s", local_path, exc)
        return None

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    object_path = f"{device_id}/{stamp}_{secrets.token_hex(4)}.jpg"
    url = f"{config.SUPABASE_URL}/storage/v1/object/{config.SUPABASE_BUCKET}/{object_path}"
    headers = {
        # Same headers supabase-js sends for Storage requests.
        "apikey": config.SUPABASE_UPLOAD_KEY,
        "Authorization": f"Bearer {config.SUPABASE_UPLOAD_KEY}",
        "Content-Type": "image/jpeg",
        "x-upsert": "false",
    }
    try:
        response = requests.post(url, data=data, headers=headers, timeout=config.SUPABASE_UPLOAD_TIMEOUT_SEC)
    except requests.RequestException as exc:
        log.warning("[screenshot] upload failed (no internet?): %s", exc)
        return None
    if response.status_code not in (200, 201):
        log.warning("[screenshot] upload rejected (%s): %s", response.status_code, response.text[:200])
        return None
    log.info("[screenshot] uploaded %s", object_path)
    return object_path


# ── Alerts ──────────────────────────────────────────────────────────

class AlertSender:
    """Sends alerts to laptop 1. If laptop 1 is unreachable (or returns 5xx), the alert is
    queued on disk and retried in order every ALERT_RETRY_INTERVAL_SEC. 4xx replies
    (bad secret, unknown device) are logged and dropped, since retrying won't help."""

    def __init__(self):
        self._lock = threading.Lock()
        self._queue: list[dict] = self._load()
        self._wake = threading.Event()
        if self._queue:
            log.info("[alert] %d queued alert(s) from a previous run", len(self._queue))
        threading.Thread(target=self._worker, daemon=True, name="alert-retry").start()

    def pending(self) -> int:
        with self._lock:
            return len(self._queue)

    def send(self, device_id: str, confidence: float, screenshot_path: str | None = None,
             detected_at: datetime | None = None) -> None:
        alert = {
            "deviceId": device_id,
            "confidence": round(float(confidence), 2),
            "detectedAt": (detected_at or datetime.now(timezone.utc)).isoformat(),
            "eventType": "fall",
            "screenshotPath": upload_screenshot(screenshot_path, device_id) if screenshot_path else None,
        }
        with self._lock:
            backlog = bool(self._queue)
        if backlog:  # keep alerts in order behind the ones already waiting
            self._enqueue(alert)
            return
        if self._post(alert) == "retry":
            self._enqueue(alert)

    def _post(self, alert: dict) -> str:
        try:
            response = _session.post(config.FRONTEND_INGEST_URL, json=alert, headers=_auth_headers(), timeout=10)
        except requests.RequestException as exc:
            log.warning("[alert] laptop 1 unreachable (%s); will retry", exc.__class__.__name__)
            return "retry"
        if response.status_code in (200, 201):
            log.info("[alert] %s -> %s", alert["deviceId"], response.text[:200])
            return "ok"
        if response.status_code >= 500 or response.status_code == 429:
            log.warning("[alert] laptop 1 error %s; will retry", response.status_code)
            return "retry"
        log.error("[alert] %s rejected (%s): %s", alert["deviceId"], response.status_code, response.text[:200])
        return "drop"

    def _enqueue(self, alert: dict) -> None:
        with self._lock:
            self._queue.append(alert)
            self._save()
        log.info("[alert] queued %s (%d waiting)", alert["deviceId"], self.pending())
        self._wake.set()

    def _worker(self) -> None:
        while True:
            self._wake.wait(config.ALERT_RETRY_INTERVAL_SEC)
            self._wake.clear()
            while True:
                with self._lock:
                    if not self._queue:
                        break
                    alert = self._queue[0]
                if self._is_stale(alert):
                    log.warning("[alert] dropping %s from %s (older than %d min)",
                                alert["deviceId"], alert["detectedAt"], config.ALERT_MAX_AGE_MIN)
                    outcome = "drop"
                else:
                    outcome = self._post(alert)
                if outcome == "retry":
                    break  # laptop 1 still down; try again later
                with self._lock:
                    self._queue.pop(0)
                    self._save()

    @staticmethod
    def _is_stale(alert: dict) -> bool:
        try:
            detected = datetime.fromisoformat(alert["detectedAt"])
        except (KeyError, ValueError):
            return True
        return datetime.now(timezone.utc) - detected > timedelta(minutes=config.ALERT_MAX_AGE_MIN)

    def _load(self) -> list[dict]:
        try:
            with open(config.ALERT_QUEUE_FILE, encoding="utf-8") as fh:
                data = json.load(fh)
            return data if isinstance(data, list) else []
        except (OSError, ValueError):
            return []

    def _save(self) -> None:  # caller holds the lock
        tmp = f"{config.ALERT_QUEUE_FILE}.tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(self._queue, fh)
            os.replace(tmp, config.ALERT_QUEUE_FILE)
        except OSError as exc:
            log.error("[alert] could not save queue: %s", exc)


_sender: AlertSender | None = None
_sender_lock = threading.Lock()


def get_alert_sender() -> AlertSender:
    global _sender
    with _sender_lock:
        if _sender is None:
            _sender = AlertSender()
        return _sender


def send_fall_alert(device_id: str, confidence: float, screenshot_path: str | None = None,
                    detected_at: datetime | None = None) -> None:
    """Call from fire_alert. Pass screenshot_path only for the FIRST alert of a fall
    episode: repeats return "already_open" on laptop 1, so their pictures would be unused."""
    get_alert_sender().send(device_id, confidence, screenshot_path, detected_at)


# ── Heartbeat ───────────────────────────────────────────────────────

class Heartbeat(threading.Thread):
    """Every HEARTBEAT_INTERVAL_SEC: tell laptop 1 we're alive, our video address, and camera status."""

    def __init__(self, get_cameras: Callable[[], list[dict]],
                 get_stream_base_url: Callable[[], str | None] = current_stream_base_url):
        super().__init__(daemon=True, name="heartbeat")
        self.get_cameras = get_cameras
        self.get_stream_base_url = get_stream_base_url
        self._stop_event = threading.Event()  # not "_stop": Thread uses that name internally
        self._last_ok: bool | None = None
        self._last_url: str | None = None

    def stop(self) -> None:
        self._stop_event.set()

    def run(self) -> None:
        while not self._stop_event.is_set():
            self.beat()
            self._stop_event.wait(config.HEARTBEAT_INTERVAL_SEC)

    def beat(self) -> bool:
        stream_url = self.get_stream_base_url()
        payload = {
            "nodeKey": config.NODE_KEY,
            "name": config.NODE_NAME,
            "streamBaseUrl": stream_url,
            "cameras": self.get_cameras(),
        }
        try:
            response = _session.post(config.FRONTEND_HEARTBEAT_URL, json=payload,
                                     headers=_auth_headers(), timeout=10)
            ok = response.status_code == 200
            if ok and (self._last_ok is not True or stream_url != self._last_url):
                log.info("[heartbeat] connected to %s; video at %s", config.FRONTEND_BASE_URL, stream_url)
            if not ok:
                log.warning("[heartbeat] rejected (%s): %s", response.status_code, response.text[:200])
        except requests.RequestException as exc:
            ok = False
            if self._last_ok is not False:
                log.warning("[heartbeat] can't reach laptop 1 at %s: %s", config.FRONTEND_BASE_URL, exc.__class__.__name__)
        self._last_ok = ok
        self._last_url = stream_url
        return ok
