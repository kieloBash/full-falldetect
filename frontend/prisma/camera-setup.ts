// location: frontend/prisma/camera-setup.ts
//
// Reads and validates config/cameras.json — the file shared with the camera laptop
// (backend/camera_setup.py applies the same rules). Used by prisma/seed-cameras.ts.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export interface CameraEntry {
  /** OpenCV camera number on the camera laptop (0 = first webcam). */
  cameraIndex: number;
  /** Sensor ID the camera laptop sends with alerts/heartbeats, e.g. "CAM-201". */
  deviceId: string;
  floor: string;
  room: string;
  /** Full name, e.g. "Eleanor Whitfield". "" = room without a patient. */
  patient: string;
}

export interface CameraSetup {
  file: string;
  facility: string;
  cameras: CameraEntry[];
}

/** Default: <project>/config/cameras.json (npm scripts run inside frontend/). Override with CAMERA_CONFIG_FILE. */
export function cameraSetupPath(): string {
  const fromEnv = process.env.CAMERA_CONFIG_FILE?.trim();
  return fromEnv ? path.resolve(fromEnv) : path.resolve(process.cwd(), "..", "config", "cameras.json");
}

function text(entry: Record<string, unknown>, key: string, where: string, required = true): string {
  const raw = entry[key];
  if (raw !== undefined && raw !== null && typeof raw !== "string" && typeof raw !== "number") {
    throw new Error(`${where}: '${key}' must be text`);
  }
  const value = raw === undefined || raw === null ? "" : String(raw).trim();
  if (required && !value) throw new Error(`${where}: '${key}' is required`);
  return value;
}

export function loadCameraSetup(file = cameraSetupPath()): CameraSetup {
  if (!existsSync(file)) throw new Error(`Camera setup file not found: ${file}`);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    throw new Error(`${path.basename(file)} is not valid JSON: ${(e as Error).message}`);
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  const list = obj.cameras;
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${path.basename(file)}: 'cameras' must be a non-empty list`);

  const facility = typeof obj.facility === "string" && obj.facility.trim() ? obj.facility.trim() : "Fall Detect Clinic";
  const cameras: CameraEntry[] = [];
  const seenIndex = new Map<number, string>();
  const seenDevice = new Set<string>();
  const seenRoom = new Map<string, string>();
  const seenPatient = new Map<string, string>();

  list.forEach((raw, i) => {
    const where = `${path.basename(file)} camera #${i + 1}`;
    if (typeof raw !== "object" || raw === null) throw new Error(`${where}: must be an object`);
    const entry = raw as Record<string, unknown>;
    const cameraIndex = entry.cameraIndex;
    if (typeof cameraIndex !== "number" || !Number.isInteger(cameraIndex) || cameraIndex < 0) {
      throw new Error(`${where}: 'cameraIndex' must be a whole number 0 or higher`);
    }
    const deviceId = text(entry, "deviceId", where);
    const floor = text(entry, "floor", where);
    const room = text(entry, "room", where);
    const patient = text(entry, "patient", where, false).split(/\s+/).filter(Boolean).join(" ");

    if (seenIndex.has(cameraIndex)) throw new Error(`${where}: cameraIndex ${cameraIndex} is also used by ${seenIndex.get(cameraIndex)}`);
    if (seenDevice.has(deviceId)) throw new Error(`${where}: deviceId ${deviceId} is listed twice`);
    const roomKey = `${floor}/${room}`;
    if (seenRoom.has(roomKey)) throw new Error(`${where}: floor ${floor} room ${room} already has ${seenRoom.get(roomKey)}`);
    if (patient && seenPatient.has(patient.toLowerCase())) {
      throw new Error(`${where}: patient '${patient}' is already in ${seenPatient.get(patient.toLowerCase())}`);
    }

    seenIndex.set(cameraIndex, deviceId);
    seenDevice.add(deviceId);
    seenRoom.set(roomKey, deviceId);
    if (patient) seenPatient.set(patient.toLowerCase(), `room ${room}`);
    cameras.push({ cameraIndex, deviceId, floor, room, patient });
  });

  return { file, facility, cameras };
}

/** Same rule as Patient Management: first word = first name, the rest = last name. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const i = name.indexOf(" ");
  return i === -1 ? { firstName: name, lastName: "" } : { firstName: name.slice(0, i), lastName: name.slice(i + 1) };
}
