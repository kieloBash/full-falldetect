import "server-only";
import type { Floor, Patient, Room, SensorStatus } from "./types";

/**
 * Projects normalized DB rows into the flat Admin UI shapes. Three resources,
 * each its own projector. Mapping decisions:
 *  - Floor: UI `name` ← Floor.label; `wing` is display-only (from facility).
 *  - Room: flattens Room + Sensor. UI `sensorId` ← Sensor.deviceLabel,
 *    `status` ← Sensor.status. Writes touch Room + Sensor only.
 *  - Patient: maps to Resident. UI `roomId` is the INVERSE of the schema —
 *    the room lives on Room.residentId, so we read resident.room?.id. `notes`
 *    and `discharged` are real columns (added by migration).
 */

const SENSOR_TO_UI: Record<string, SensorStatus> = { ONLINE: "online", DEGRADED: "degraded", OFFLINE: "offline" };
export const SENSOR_TO_DB: Record<SensorStatus, string> = { online: "ONLINE", degraded: "DEGRADED", offline: "OFFLINE" };

/* ── Floor ─────────────────────────────────────────────────────────────── */

export interface FloorRow {
  id: string;
  label: string;
}

export function projectFloor(row: FloorRow, wing: string): Floor {
  return { id: row.id, name: row.label, wing };
}

/* ── Room ──────────────────────────────────────────────────────────────── */

export interface RoomRow {
  id: string;
  label: string;
  floorId: string;
  sensor: { deviceLabel: string | null; status: string } | null;
}

export function projectRoom(row: RoomRow): Room {
  return {
    id: row.id,
    room: row.label,
    floorId: row.floorId,
    sensorId: row.sensor?.deviceLabel ?? "",
    status: row.sensor ? SENSOR_TO_UI[row.sensor.status] ?? "offline" : "offline",
  };
}

/* ── Patient ───────────────────────────────────────────────────────────── */

export interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  notes: string;
  discharged: boolean;
  /** Back-reference: the Room whose residentId points here (schema 1:1). */
  room: { id: string } | null;
}

export function projectPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    roomId: row.room?.id ?? "",
    notes: row.notes,
    discharged: row.discharged,
  };
}

/** Splits a UI full-name string into first/last on the FIRST space (lossy for
 *  multi-word surnames, per the mapping decision). */
export function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const i = trimmed.indexOf(" ");
  if (i === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, i), lastName: trimmed.slice(i + 1) };
}
