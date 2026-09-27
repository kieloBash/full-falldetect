// location: frontend/lib/floor/api.ts
import { apiClient } from "@/lib/api/client";
import type { Floor } from "@/lib/live-monitor/types";

/** Every floor in the user's facility (GET /api/floors/assigned). */
export async function fetchFloorsAssigned(): Promise<Floor[]> {
  const { data } = await apiClient.get<Floor[]>("/floors/assigned");
  return data;
}
