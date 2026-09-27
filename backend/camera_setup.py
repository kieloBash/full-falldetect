# location: backend/camera_setup.py
"""
Loads config/cameras.json — the shared file that links each physical camera to its
Sensor ID (deviceId), floor, room and patient. The same file feeds the database seed on
laptop 1 (`npm run seed:cameras`), so the IDs this laptop sends always match a room.

    {
      "facility": "Fall Detect Clinic",
      "cameras": [
        {"cameraIndex": 0, "deviceId": "CAM-201", "floor": "2", "room": "201", "patient": "Eleanor Whitfield"}
      ]
    }

cameraIndex = the OpenCV camera number on this laptop (0 = first webcam, 1 = second, ...).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


class CameraSetupError(ValueError):
    """The file is missing a field or has duplicates; the message says which entry."""


@dataclass(frozen=True)
class CameraEntry:
    camera_index: int
    device_id: str
    floor: str
    room: str
    patient: str  # "" = room has no patient

    @property
    def label(self) -> str:
        who = self.patient or "no patient"
        return f"Floor {self.floor} · Room {self.room} · {who}"


def _text(entry: dict, key: str, where: str, required: bool = True) -> str:
    value = entry.get(key, "")
    if value is None:
        value = ""
    if not isinstance(value, (str, int)):
        raise CameraSetupError(f"{where}: '{key}' must be text")
    value = str(value).strip()
    if required and not value:
        raise CameraSetupError(f"{where}: '{key}' is required")
    return value


def load_camera_setup(path: str | Path) -> list[CameraEntry]:
    """Read and validate the file. Raises CameraSetupError with a readable message."""
    path = Path(path)
    if not path.is_file():
        raise CameraSetupError(f"camera setup file not found: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise CameraSetupError(f"{path.name} is not valid JSON (line {exc.lineno}): {exc.msg}") from exc

    cameras = data.get("cameras") if isinstance(data, dict) else None
    if not isinstance(cameras, list) or not cameras:
        raise CameraSetupError(f"{path.name}: 'cameras' must be a non-empty list")

    entries: list[CameraEntry] = []
    seen_index: dict[int, str] = {}
    seen_device: dict[str, str] = {}
    seen_room: dict[tuple[str, str], str] = {}
    seen_patient: dict[str, str] = {}

    for n, raw in enumerate(cameras, start=1):
        where = f"{path.name} camera #{n}"
        if not isinstance(raw, dict):
            raise CameraSetupError(f"{where}: must be an object")
        index = raw.get("cameraIndex")
        if not isinstance(index, int) or isinstance(index, bool) or index < 0:
            raise CameraSetupError(f"{where}: 'cameraIndex' must be a whole number 0 or higher")
        device_id = _text(raw, "deviceId", where)
        floor = _text(raw, "floor", where)
        room = _text(raw, "room", where)
        patient = " ".join(_text(raw, "patient", where, required=False).split())

        if index in seen_index:
            raise CameraSetupError(f"{where}: cameraIndex {index} is also used by {seen_index[index]}")
        if device_id in seen_device:
            raise CameraSetupError(f"{where}: deviceId {device_id} is listed twice")
        if (floor, room) in seen_room:
            raise CameraSetupError(f"{where}: floor {floor} room {room} already has {seen_room[(floor, room)]}")
        if patient and patient.lower() in seen_patient:
            raise CameraSetupError(f"{where}: patient '{patient}' is already in {seen_patient[patient.lower()]}")

        seen_index[index] = device_id
        seen_device[device_id] = where
        seen_room[(floor, room)] = device_id
        if patient:
            seen_patient[patient.lower()] = f"room {room}"
        entries.append(CameraEntry(index, device_id, floor, room, patient))

    return entries


def print_camera_table(entries: list[CameraEntry]) -> None:
    print("  Camera  Sensor ID    Floor  Room   Patient")
    for e in sorted(entries, key=lambda x: x.camera_index):
        print(f"  {e.camera_index:<6}  {e.device_id:<11}  {e.floor:<5}  {e.room:<5}  {e.patient or '(none)'}")
