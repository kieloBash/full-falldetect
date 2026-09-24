# location: backend/stream_auth.py
# Verifies the short-lived stream tokens issued by GET /api/stream-token on laptop 1,
# so only signed-in dashboard users can watch the cameras, not anyone on the Wi-Fi.
from __future__ import annotations

import jwt  # PyJWT
from flask import jsonify, request

import config

ISSUER = "falldetect"
AUDIENCE = "falldetect-stream"


def verify_stream_token(token: str, camera_id: str) -> str | None:
    """Returns None if the token is valid for this camera, otherwise an error message."""
    try:
        payload = jwt.decode(
            token,
            config.STREAM_TOKEN_SECRET,
            algorithms=["HS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        return "Stream token expired"
    except jwt.InvalidTokenError:
        return "Invalid stream token"
    if payload.get("deviceId") != camera_id:
        return "Token is for a different camera"
    return None


def check_stream_request(camera_id: str):
    """Use at the top of a Flask route. Returns a 401 response, or None if allowed."""
    token = request.args.get("token", "")
    if not token:
        return jsonify(error="Missing stream token"), 401
    error = verify_stream_token(token, camera_id)
    if error:
        return jsonify(error=error), 401
    return None
