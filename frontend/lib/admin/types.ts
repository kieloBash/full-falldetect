import type { SensorStatus } from "@/lib/live-monitor/types";

/**
 * Re-exported so admin components can `import type { SensorStatus } from
 * "@/lib/admin/types"` without reaching into the live-monitor feature
 * directly. Same enum, same meaning — this screen manages the sensors Live
 * Monitor displays.
 */
export type { SensorStatus };

export interface AdminRoom {
  id: string;
  /** Room number, e.g. "204". */
  room: string;
  /** Resident's full name, or "" for a vacant room. */
  resident: string;
  sensorId: string;
  status: SensorStatus;
}

export interface AdminFloor {
  id: string;
  name: string;
  wing: string;
  rooms: AdminRoom[];
}

export interface FloorFormValues {
  name: string;
  wing: string;
}

export interface RoomFormValues {
  room: string;
  sensorId: string;
  resident: string;
  status: SensorStatus;
}
