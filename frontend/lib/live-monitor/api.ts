// location: frontend/lib/live-monitor/api.ts
import { apiClient } from "@/lib/api/client";
import type { ActivityItem, Room } from "@/lib/live-monitor/types";

/**
 * Live Monitor API layer (axios, see lib/api/client.ts). Each function throws
 * ApiError with the server's `{ error }` message on non-2xx. The server projects
 * DB rows into the flat `Room` shape (lib/live-monitor-server/projection.ts).
 */

/** Rooms on one floor. `floor` is a Floor id; empty = the facility's first floor. */
export async function fetchRooms(floor?: string | null): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>("/monitor", { params: { floor: floor ?? "" } });
  return data;
}

export interface AcknowledgeResult {
  acknowledgedBy: string;
}

export async function acknowledgeAlert(roomId: string): Promise<AcknowledgeResult> {
  const { data } = await apiClient.post<AcknowledgeResult>(`/alerts/${roomId}/acknowledge`);
  return data;
}

export async function resolveAlert(roomId: string): Promise<void> {
  await apiClient.post(`/alerts/${roomId}/resolve`);
}

export async function flagFalseAlarm(roomId: string, reason: string): Promise<void> {
  await apiClient.post(`/alerts/${roomId}/false-alarm`, { reason });
}

export async function reconnectSensor(roomId: string): Promise<void> {
  await apiClient.post(`/sensors/${roomId}/reconnect`);
}

export interface SimulateFallResult {
  roomId: string;
  incidentId: string;
}

/** Simulate Fall: creates a real ACTIVE incident. Omit `roomId` to pick a random eligible room on `floor` (id). */
export async function createAlert(input: { roomId?: string; floor?: string }): Promise<SimulateFallResult> {
  const { data } = await apiClient.post<SimulateFallResult>("/alerts", input);
  return data;
}

/* ── Pinned rooms (per-user) ──────────────────────────────────────────── */

export async function fetchPinned(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/pinned");
  return data;
}

export async function pinRoom(roomId: string): Promise<void> {
  await apiClient.post("/pinned", { roomId });
}

export async function unpinRoom(roomId: string): Promise<void> {
  await apiClient.delete(`/pinned/${roomId}`);
}

/* ── Activity feed (facility-wide) ────────────────────────────────────── */

export async function fetchActivity(limit = 12): Promise<ActivityItem[]> {
  const { data } = await apiClient.get<ActivityItem[]>("/activity", { params: { limit } });
  return data;
}
