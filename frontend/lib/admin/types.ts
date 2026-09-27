// location: frontend/lib/admin/types.ts
import type { SensorStatus } from "@/lib/live-monitor/types";

/**
 * Re-exported so admin components can `import type { SensorStatus } from
 * "@/lib/admin/types"` without reaching into the live-monitor feature
 * directly. Same enum, same meaning — see the README's modeling note.
 */
export type { SensorStatus };

export interface Floor {
  id: string;
  name: string;
  wing: string;
}

export interface Room {
  id: string;
  /** Room number, e.g. "204". */
  room: string;
  floorId: string;
  sensorId: string;
  status: SensorStatus;
}

export interface AdminRoom extends Room {
  resident: string;
  notes: string;
  discharged: boolean;
}

export interface AdminFloor extends Floor {
  rooms: AdminRoom[];
}

export interface Patient {
  id: string;
  name: string;
  /** "" = unassigned / no current room. */
  roomId: string;
  notes: string;
  discharged: boolean;
}

export interface FloorFormValues {
  name: string;
  wing: string;
}

export interface RoomFormValues {
  room: string;
  /** Saved to Sensor.deviceId — must match the camera's ID in backend/.env CAMERA_ID_MAP (e.g. CAM-201). */
  sensorId: string;
  floorId: string;
  resident?: string;
  status?: string;
}

export interface PatientFormValues {
  name: string;
  roomId: string;
  notes: string;
  discharged: boolean;
}
