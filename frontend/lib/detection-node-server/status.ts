// location: frontend/lib/detection-node-server/status.ts
// Online/offline is derived from timestamps at read time, like room state (TDS §5.3).
// No cron job is needed: a laptop that stops sending heartbeats simply goes stale.

export type UiSensorStatus = "online" | "degraded" | "offline";

/** A node or camera counts as offline after this many seconds without a heartbeat. */
export const NODE_OFFLINE_AFTER_SEC = Number(process.env.NODE_OFFLINE_AFTER_SEC ?? 90);

export function isFresh(timestamp: Date | null | undefined, now = Date.now()): boolean {
  if (!timestamp) return false;
  return now - timestamp.getTime() <= NODE_OFFLINE_AFTER_SEC * 1000;
}

export function isNodeOnline(lastHeartbeatAt: Date | null | undefined, now = Date.now()): boolean {
  return isFresh(lastHeartbeatAt, now);
}

type SensorLike = {
  status: string;
  nodeId: string | null;
  lastSeenAt: Date | null;
};

/**
 * Status to show in the UI.
 * - No sensor → offline.
 * - Sensor not managed by any detection node (e.g. seed data) → its stored status.
 * - Sensor managed by a node → stored status, but offline if its last heartbeat is stale.
 */
export function effectiveSensorStatus(sensor: SensorLike | null | undefined, now = Date.now()): UiSensorStatus {
  if (!sensor) return "offline";
  const stored = sensor.status.toLowerCase() as UiSensorStatus;
  if (!sensor.nodeId) return stored;
  return isFresh(sensor.lastSeenAt, now) ? stored : "offline";
}
