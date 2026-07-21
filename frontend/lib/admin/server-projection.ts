import "server-only";
import type { AdminFloor, AdminRoom, SensorStatus } from "./types";

/**
 * Projects the normalized Floor/Room/Sensor/Resident rows into the flat
 * Admin UI shape. Per the schema-mapping decisions:
 *  - Floor has no wing/name split → UI `name` is `Floor.label`; `wing` is a
 *    display-only string derived from the facility (not stored).
 *  - A UI room row flattens Room + its Sensor + its Resident. Writes only
 *    touch Room + Sensor; resident is read-only here (joined for display).
 *  - UI `sensorId` is the human label → `Sensor.deviceLabel`.
 */

const SENSOR_TO_UI: Record<string, SensorStatus> = { ONLINE: "online", DEGRADED: "degraded", OFFLINE: "offline" };
export const SENSOR_TO_DB: Record<SensorStatus, string> = { online: "ONLINE", degraded: "DEGRADED", offline: "OFFLINE" };

export interface FloorRow {
  id: string;
  label: string;
  rooms: Array<{
    id: string;
    label: string;
    resident: { firstName: string; lastName: string } | null;
    sensor: { deviceLabel: string | null; status: string } | null;
  }>;
}

function projectRoom(r: FloorRow["rooms"][number]): AdminRoom {
  return {
    id: r.id,
    room: r.label,
    resident: r.resident ? `${r.resident.firstName} ${r.resident.lastName}` : "",
    sensorId: r.sensor?.deviceLabel ?? "",
    status: r.sensor ? SENSOR_TO_UI[r.sensor.status] ?? "offline" : "offline",
  };
}

export function projectFloor(row: FloorRow, wing: string): AdminFloor {
  return {
    id: row.id,
    name: row.label,
    wing,
    rooms: row.rooms.map(projectRoom),
  };
}

/** Prisma include producing a FloorRow. */
export const FLOOR_INCLUDE = {
  rooms: {
    orderBy: { label: "asc" as const },
    select: {
      id: true,
      label: true,
      resident: { select: { firstName: true, lastName: true } },
      sensor: { select: { deviceLabel: true, status: true } },
    },
  },
} as const;
