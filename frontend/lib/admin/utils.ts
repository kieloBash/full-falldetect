import type { Floor, Patient, Room } from "./types";

export function roomsForFloor(rooms: Room[], floorId: string): Room[] {
  return rooms.filter((r) => r.floorId === floorId);
}

export function onlineSensorCount(rooms: Room[]): number {
  return rooms.filter((r) => r.status === "online").length;
}

/** Worst-case status dot for a floor card: red if any sensor is offline, amber if any is degraded, else green. */
export function floorStatusDotClass(rooms: Room[]): string {
  if (rooms.some((r) => r.status === "offline")) return "bg-red-600";
  if (rooms.some((r) => r.status === "degraded")) return "bg-amber-600";
  return "bg-green-600";
}

/** The non-discharged patient currently assigned to a room, if any. */
export function activePatientForRoom(patients: Patient[], roomId: string): Patient | null {
  return patients.find((p) => p.roomId === roomId && !p.discharged) ?? null;
}

export function floorLabel(floors: Floor[], floorId: string): string {
  return floors.find((f) => f.id === floorId)?.name ?? "—";
}

/** "204 (Floor 2)" — used for both the room-management table and the patient form's room dropdown. */
export function roomOptionLabel(room: Room, floors: Floor[]): string {
  return `${room.room} (${floorLabel(floors, room.floorId)})`;
}

export function roomLabelWithFloor(rooms: Room[], floors: Floor[], roomId: string): string {
  const room = rooms.find((r) => r.id === roomId);
  return room ? roomOptionLabel(room, floors) : "Unassigned";
}
