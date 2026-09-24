# location: backend/stream_utils.py
from __future__ import annotations

import cv2

import config


def encode_stream_jpeg(frame) -> bytes | None:
    """Downscale + JPEG-encode a frame for streaming. Keeps upload bandwidth low."""
    if frame is None:
        return None
    height, width = frame.shape[:2]
    if width > config.STREAM_MAX_WIDTH:
        scale = config.STREAM_MAX_WIDTH / width
        frame = cv2.resize(frame, (config.STREAM_MAX_WIDTH, int(height * scale)), interpolation=cv2.INTER_AREA)
    ok, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
    return buffer.tobytes() if ok else None
