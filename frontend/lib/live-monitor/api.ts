import { buildRooms } from "./mock-data";
import type { Room } from "./types";

/**
 * Live Monitor API layer. Function signatures mirror the REST endpoints
 * described in the Incidents handoff doc's "API dependencies" section, so
 * this file — not the components or the hook — is the only thing that
 * changes when a real backend exists. Every function currently resolves
 * mock data instead of calling out; see the `TODO(api)` on each for the
 * axios call it becomes (import `apiClient` from "@/lib/api/client").
 */

export async function fetchRooms(): Promise<Room[]> {
  // TODO(api): const { data } = await apiClient.get<Room[]>("/monitor");
  //            return data;
  // Real version also wants a realtime subscription (WebSocket/SSE) for the
  // alert stream so new incidents appear without polling.
  return buildRooms();
}

export interface AcknowledgeResult {
  acknowledgedBy: string;
}

export async function acknowledgeAlert(roomId: string): Promise<AcknowledgeResult> {
  // TODO(api): const { data } = await apiClient.post(`/alerts/${roomId}/acknowledge`);
  //            return data;
  void roomId;
  return { acknowledgedBy: "David Okafor" };
}

export async function resolveAlert(roomId: string): Promise<void> {
  // TODO(api): await apiClient.post(`/alerts/${roomId}/resolve`);
  void roomId;
}

export async function flagFalseAlarm(roomId: string, reason: string): Promise<void> {
  // TODO(api): await apiClient.post(`/alerts/${roomId}/false-alarm`, { reason });
  void roomId;
  void reason;
}

export async function reconnectSensor(roomId: string): Promise<void> {
  // TODO(api): await apiClient.post(`/sensors/${roomId}/reconnect`);
  void roomId;
}
