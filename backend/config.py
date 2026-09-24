# location: backend/config.py
# REPLACES the existing config.py. Keeps FRONTEND_INGEST_URL and MONITOR_INGEST_SECRET
# (so existing imports in main.py still work) and adds the LAN + Supabase settings.
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        sys.exit(f"[config] {name} is missing in backend/.env")
    return value


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        sys.exit(f"[config] {name} must be a whole number")


def _camera_map(raw: str) -> dict[int, str]:
    """'0:CAM-201,1:CAM-202' -> {0: 'CAM-201', 1: 'CAM-202'}"""
    result: dict[int, str] = {}
    for pair in filter(None, (p.strip() for p in raw.split(","))):
        index, _, device_id = pair.partition(":")
        if not index.strip().isdigit() or not device_id.strip():
            sys.exit(f"[config] CAMERA_ID_MAP entry '{pair}' must look like 0:CAM-201")
        result[int(index)] = device_id.strip()
    return result


# ── Laptop 1: the web app ───────────────────────────────────────────
# Laptop 1's LAN address, e.g. http://192.168.1.10:3000 (give laptop 1 a fixed IP).
FRONTEND_BASE_URL = _required("FRONTEND_BASE_URL").rstrip("/")
FRONTEND_HOST = urlparse(FRONTEND_BASE_URL).hostname or ""
FRONTEND_INGEST_URL = f"{FRONTEND_BASE_URL}/api/monitor/ingest"
FRONTEND_HEARTBEAT_URL = f"{FRONTEND_BASE_URL}/api/monitor/heartbeat"

MONITOR_INGEST_SECRET = _required("MONITOR_INGEST_SECRET")
STREAM_TOKEN_SECRET = _required("STREAM_TOKEN_SECRET")
if len(STREAM_TOKEN_SECRET) < 32:
    sys.exit("[config] STREAM_TOKEN_SECRET must be at least 32 characters (same value as laptop 1)")

# ── This laptop (laptop 2) ─────────────────────────────────────────
NODE_KEY = os.getenv("NODE_KEY", "camera-laptop-1").strip()
NODE_NAME = os.getenv("NODE_NAME", NODE_KEY).strip()
HEARTBEAT_INTERVAL_SEC = _int("HEARTBEAT_INTERVAL_SEC", 30)

# ── Video server ───────────────────────────────────────────────────
STREAM_HOST = os.getenv("STREAM_HOST", "0.0.0.0")  # listen on the Wi-Fi interface
STREAM_PORT = _int("STREAM_PORT", 8002)
# Leave empty to auto-detect this laptop's Wi-Fi IP on every heartbeat.
PUBLIC_STREAM_URL = os.getenv("PUBLIC_STREAM_URL", "").strip().rstrip("/")
STREAM_FPS = _int("STREAM_FPS", 10)
STREAM_MAX_WIDTH = _int("STREAM_MAX_WIDTH", 960)
STREAM_JPEG_QUALITY = _int("STREAM_JPEG_QUALITY", 70)

# ── Supabase Storage (screenshots) ─────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
# Publishable (or legacy anon) key. The bucket policy only lets it UPLOAD .jpg files.
SUPABASE_UPLOAD_KEY = os.getenv("SUPABASE_UPLOAD_KEY", "").strip()
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "fall-screenshots").strip()
SUPABASE_UPLOAD_TIMEOUT_SEC = _int("SUPABASE_UPLOAD_TIMEOUT_SEC", 5)
if not SUPABASE_URL or not SUPABASE_UPLOAD_KEY:
    print("[config] SUPABASE_URL / SUPABASE_UPLOAD_KEY not set: alerts will be sent without screenshots")

# ── Alert retry queue ──────────────────────────────────────────────
ALERT_QUEUE_FILE = os.getenv("ALERT_QUEUE_FILE", "").strip() or str(BASE_DIR / "pending_alerts.json")
ALERT_RETRY_INTERVAL_SEC = _int("ALERT_RETRY_INTERVAL_SEC", 10)
ALERT_MAX_AGE_MIN = _int("ALERT_MAX_AGE_MIN", 60)  # older queued alerts are dropped

# ── Model + cameras ────────────────────────────────────────────────
WEIGHTS_PATH = os.getenv("WEIGHTS_PATH", "").strip() or str(BASE_DIR / "model" / "best_v2.pt")
CAMERA_ID_MAP = _camera_map(os.getenv("CAMERA_ID_MAP", "0:CAM-201,1:CAM-202"))
SCREENSHOT_FOLDER = os.getenv("SCREENSHOT_FOLDER", "").strip() or str(BASE_DIR / "screenshots")
