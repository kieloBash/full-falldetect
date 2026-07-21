import type { AdminFloor } from "./types";

export function onlineSensorCount(floor: AdminFloor): number {
  return floor.rooms.filter((r) => r.status === "online").length;
}

/** Worst-case status dot for a floor card: red if any sensor is offline, amber if any is degraded, else green. */
export function floorStatusDotClass(floor: AdminFloor): string {
  if (floor.rooms.some((r) => r.status === "offline")) return "bg-red-600";
  if (floor.rooms.some((r) => r.status === "degraded")) return "bg-amber-600";
  return "bg-green-600";
}
