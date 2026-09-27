// location: frontend/lib/live-monitor/queries.ts
"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { FloorId, Room } from "./types";

/** Query key namespace; rooms are keyed by floor so switching floors refetches. */
export const liveMonitorKeys = {
  all: ["live-monitor"] as const,
  rooms: (floor: FloorId) => ["live-monitor", "rooms", floor] as const,
  pinned: ["live-monitor", "pinned"] as const,
  activity: ["live-monitor", "activity"] as const,
};

const ROOM_POLL = {
  staleTime: 2_000,
  refetchInterval: 3_000, // poll every 3 s
  refetchIntervalInBackground: true, // keep polling when the tab isn't focused — it's a monitoring screen
} as const;

/**
 * Room rosters for EVERY floor (one `GET /api/monitor?floor=` per floor, polled every
 * 3 s). The Live Monitor needs all floors so a fall on Floor 3 still sounds the alarm
 * while a nurse is looking at Floor 2. Keys stay per-floor, so mutations that
 * invalidate ["live-monitor", "rooms"] refresh all of them.
 */
export function useAllRoomsQuery(floorIds: FloorId[]) {
  return useQueries({
    queries: floorIds.map((floorId) => ({
      queryKey: liveMonitorKeys.rooms(floorId),
      queryFn: () => api.fetchRooms(floorId),
      ...ROOM_POLL,
    })),
    combine: (results) => ({
      rooms: results.flatMap((r) => r.data ?? []) as Room[],
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  });
}

/** Per-user pinned room ids, from `GET /api/pinned`. */
export function usePinnedQuery() {
  return useQuery({
    queryKey: liveMonitorKeys.pinned,
    queryFn: api.fetchPinned,
    staleTime: 60_000,
  });
}

/** Facility-wide activity feed, from `GET /api/activity`. */
export function useActivityQuery() {
  return useQuery({
    queryKey: liveMonitorKeys.activity,
    queryFn: () => api.fetchActivity(12),
    staleTime: 5_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
  });
}

/** Invalidate rooms + activity after an action that changes either. */
function useInvalidateBoard() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["live-monitor", "rooms"] }); // matches any floor
    qc.invalidateQueries({ queryKey: liveMonitorKeys.activity });
  };
}

export function useAcknowledgeMutation() {
  const invalidate = useInvalidateBoard();
  return useMutation({ mutationFn: (roomId: string) => api.acknowledgeAlert(roomId), onSuccess: invalidate });
}

export function useResolveMutation() {
  const invalidate = useInvalidateBoard();
  return useMutation({ mutationFn: (roomId: string) => api.resolveAlert(roomId), onSuccess: invalidate });
}

export function useFlagFalseAlarmMutation() {
  const invalidate = useInvalidateBoard();
  return useMutation({
    mutationFn: ({ roomId, reason }: { roomId: string; reason: string }) => api.flagFalseAlarm(roomId, reason),
    onSuccess: invalidate,
  });
}

export function useReconnectSensorMutation() {
  const invalidate = useInvalidateBoard();
  return useMutation({ mutationFn: (roomId: string) => api.reconnectSensor(roomId), onSuccess: invalidate });
}

export function useSimulateFallMutation() {
  const invalidate = useInvalidateBoard();
  return useMutation({
    mutationFn: (input: { roomId?: string; floor?: string }) => api.createAlert(input),
    onSuccess: invalidate,
  });
}

export function usePinMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => api.pinRoom(roomId),
    onSuccess: () => qc.invalidateQueries({ queryKey: liveMonitorKeys.pinned }),
  });
}

export function useUnpinMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => api.unpinRoom(roomId),
    onSuccess: () => qc.invalidateQueries({ queryKey: liveMonitorKeys.pinned }),
  });
}
