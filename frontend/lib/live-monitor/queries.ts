"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import * as api from "./api";
import { buildRooms } from "./mock-data";

/** Query key namespace for this screen, so cache entries don't collide with other features. */
export const liveMonitorKeys = {
  all: ["live-monitor"] as const,
  rooms: ["live-monitor", "rooms"] as const,
};

/**
 * Initial room roster for the monitor grid.
 *
 * `initialData` seeds the cache with the same mock synchronously, so the
 * screen never shows a loading flash today. Once `fetchRooms` calls a real
 * endpoint, drop `initialData` (and probably lower `staleTime`) so it
 * actually fetches instead of trusting the seed forever.
 */
export function useRoomsQuery() {
  return useQuery({
    queryKey: liveMonitorKeys.rooms,
    queryFn: api.fetchRooms,
    initialData: buildRooms,
    staleTime: Infinity,
  });
}

export function useAcknowledgeMutation() {
  return useMutation({
    mutationFn: (roomId: string) => api.acknowledgeAlert(roomId),
  });
}

export function useResolveMutation() {
  return useMutation({
    mutationFn: (roomId: string) => api.resolveAlert(roomId),
  });
}

export function useFlagFalseAlarmMutation() {
  return useMutation({
    mutationFn: ({ roomId, reason }: { roomId: string; reason: string }) => api.flagFalseAlarm(roomId, reason),
  });
}

export function useReconnectSensorMutation() {
  return useMutation({
    mutationFn: (roomId: string) => api.reconnectSensor(roomId),
  });
}
