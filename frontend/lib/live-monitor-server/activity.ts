import "server-only";

/**
 * Maps a DB `ActivityType` to the Tailwind dot color the UI's activity feed
 * uses. Mirrors the inline color choices the client hook made when it logged
 * activity locally (red for detected, amber for acknowledged, green for
 * resolved/reconnected, slate for false alarm / sensor down).
 */
export const ACTIVITY_DOT_CLASS: Record<string, string> = {
  SHIFT_STARTED: "bg-teal-600",
  SENSOR_OFFLINE: "bg-slate-400",
  SENSOR_DEGRADED: "bg-amber-600",
  SENSOR_RECONNECTED: "bg-green-600",
  INCIDENT_DETECTED: "bg-red-600",
  INCIDENT_ACKNOWLEDGED: "bg-amber-600",
  INCIDENT_RESOLVED: "bg-green-600",
  INCIDENT_FALSE_ALARM: "bg-slate-400",
};
