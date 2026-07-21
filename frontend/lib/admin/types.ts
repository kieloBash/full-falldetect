import type { SensorStatus } from "@/lib/live-monitor/types";

/**
 * Re-exported so admin components can `import type { SensorStatus } from
 * "@/lib/admin/types"` without reaching into the live-monitor feature
 * directly. Same enum, same meaning — see the README's modeling note.
 */
export type { SensorStatus };

export interface AdminRoom {
  id: string;
  room: string;
  resident: string;
  sensorId: string;
  status: SensorStatus;
  floorId: string;
}

export interface AdminFloor {
  name: string;
  wing?: string;
  rooms: AdminRoom[]
}

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
  sensorId: string;
  floorId: string;
  resident?: any;
  status?: string;
}

export interface PatientFormValues {
  name: string;
  roomId: string;
  notes: string;
  discharged: boolean;
}
