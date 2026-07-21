import { Floor } from "@/app/generated/prisma/client";
import type { AlertState, FloorId, RiskLevel, Room, SensorStatus } from "@/lib/live-monitor/types";
import "server-only";

/**
 * The DB is normalized; the Live Monitor UI is not. A UI `Room` carries a
 * flat `alertState` and incident fields, but the schema stores none of that
 * on the room — a room's state is *derived* from its open Incident (see the
 * schema's modeling note). This module is the single place that projects the
 * joined DB rows down into the flat `Room` the frontend already expects, so
 * `api.ts` and every route return exactly the shape the components consume.
 *
 * Keep this in sync with `src/lib/live-monitor/types.ts`.
 */

const RISK_TO_UI: Record<string, RiskLevel> = { LOW: "low", MEDIUM: "medium", HIGH: "high" };
const SENSOR_TO_UI: Record<string, SensorStatus> = { ONLINE: "online", DEGRADED: "degraded", OFFLINE: "offline" };

/** An open incident is ACTIVE or ACKNOWLEDGED; RESOLVED/FALSE_ALARM are terminal. */
const OPEN_STATE_TO_UI: Record<string, AlertState> = { ACTIVE: "active", ACKNOWLEDGED: "acknowledged" };

/** Shape of the row we expect from the join (kept loose to match the Prisma select). */
export interface RoomRow {
  id: string;
  label: string;
  zone: string;
  floor: Floor;
  resident: { firstName: string; lastName: string; risk: string } | null;
  sensor: { status: string } | null;
  incidents: Array<{
    state: string;
    detectedAt: Date;
    responder: { firstName: string; lastName: string } | null;
    falseAlarmReason: string | null;
  }>;
}

function initialsOf(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/**
 * Projects one joined DB room into the UI `Room`. `incidents` should contain
 * at most the single open incident (filter to ACTIVE/ACKNOWLEDGED in the
 * query); if present it drives alertState/startedAt/acknowledgedBy.
 */
export function projectRoom(row: any): Room {
  const residentName = row.resident ? `${row.resident.firstName} ${row.resident.lastName}` : "Unassigned";
  const open = row.incidents[0];
  const alertState: AlertState = open ? OPEN_STATE_TO_UI[open.state] ?? "idle" : "idle";

  return {
    id: row.id,
    label: row.label,
    floor: (row.floor),
    resident: residentName,
    risk: row.resident ? RISK_TO_UI[row.resident.risk] ?? "low" : "low",
    sensorStatus: row.sensor ? SENSOR_TO_UI[row.sensor.status] ?? "offline" : "offline",
    zone: row.zone,
    initials: row.resident ? initialsOf(row.resident.firstName, row.resident.lastName) : "–",
    alertState,
    startedAt: open ? open.detectedAt.getTime() : null,
    acknowledgedBy:
      open && open.state === "ACKNOWLEDGED" && open.responder
        ? `${open.responder.firstName} ${open.responder.lastName}`
        : null,
    falseAlarmReason: null,
    history: row.incidents,
  };
}

/** The Prisma `include`/`select` that produces a `RoomRow`. Import in routes. */
export const ROOM_INCLUDE = {
  floor: { select: { label: true, id: true } },
  resident: { select: { firstName: true, lastName: true, risk: true } },
  sensor: { select: { status: true } },
  incidents: {
    // where: { state: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
    select: {
      state: true,
      detectedAt: true,
      falseAlarmReason: true,
      responder: { select: { firstName: true, lastName: true } },
    },
    // take: 1,
    orderBy: { detectedAt: "desc" },
  },
} as const;

/** Maps a UI false-alarm reason string to the DB enum. */
export function toFalseAlarmReason(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("sat")) return "RESIDENT_SAT_DOWN";
  if (r.includes("pet") || r.includes("object")) return "PET_OR_OBJECT";
  if (r.includes("glitch") || r.includes("sensor")) return "SENSOR_GLITCH";
  return "OTHER";
}
