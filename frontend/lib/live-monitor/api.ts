import type { ActivityItem, Room } from "./types";

/**
 * Live Monitor API layer. Signatures are unchanged from the mock version —
 * the hook and components import exactly the same names — but each now calls
 * a real route handler under `app/api/*` that talks to Prisma. The server
 * projects the normalized DB rows back into the flat `Room` shape (see
 * `lib/live-monitor-server/projection.ts`), so the client still receives the
 * same objects it always did.
 */

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Request failed.");
  return data as T;
}

export async function fetchRooms(floor?: string): Promise<Room[]> {
  const qs = floor ? `?floor=${encodeURIComponent(floor)}` : "";
  return json<Room[]>(await fetch(`/api/monitor${qs}`));
}

export interface AcknowledgeResult {
  acknowledgedBy: string;
}

export async function acknowledgeAlert(roomId: string): Promise<AcknowledgeResult> {
  return json<AcknowledgeResult>(await fetch(`/api/alerts/${roomId}/acknowledge`, { method: "POST" }));
}

export async function resolveAlert(roomId: string): Promise<void> {
  await json(await fetch(`/api/alerts/${roomId}/resolve`, { method: "POST" }));
}

export async function flagFalseAlarm(roomId: string, reason: string): Promise<void> {
  await json(
    await fetch(`/api/alerts/${roomId}/false-alarm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
  );
}

export async function reconnectSensor(roomId: string): Promise<void> {
  await json(await fetch(`/api/sensors/${roomId}/reconnect`, { method: "POST" }));
}

export interface SimulateFallResult {
  roomId: string;
  incidentId: string;
}

/** Creates a real ACTIVE incident. `roomId` targets a room; otherwise the
 *  server picks an eligible room on `floor`. */
export async function createAlert(input: { roomId?: string; floor?: string }): Promise<SimulateFallResult> {
  return json<SimulateFallResult>(
    await fetch(`/api/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

/* ── Pinned rooms (per-user) ──────────────────────────────────────────── */

export async function fetchPinned(): Promise<string[]> {
  return json<string[]>(await fetch(`/api/pinned`));
}

export async function pinRoom(roomId: string): Promise<void> {
  await json(
    await fetch(`/api/pinned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    })
  );
}

export async function unpinRoom(roomId: string): Promise<void> {
  await json(await fetch(`/api/pinned/${roomId}`, { method: "DELETE" }));
}

/* ── Activity feed (facility-wide) ────────────────────────────────────── */

export async function fetchActivity(limit = 12): Promise<ActivityItem[]> {
  return json<ActivityItem[]>(await fetch(`/api/activity?limit=${limit}`));
}
