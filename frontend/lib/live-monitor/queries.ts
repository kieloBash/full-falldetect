"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { FloorId } from "./types";

/** Query key namespace; rooms are keyed by floor so switching floors refetches. */
export const liveMonitorKeys = {
  all: ["live-monitor"] as const,
  rooms: (floor: FloorId) => ["live-monitor", "rooms", floor] as const,
  pinned: ["live-monitor", "pinned"] as const,
  activity: ["live-monitor", "activity"] as const,
};

/**
 * Room roster for a floor, fetched from `GET /api/monitor?floor=`. The DB is
 * the source of truth, so actions invalidate this query (see the mutations'
 * `onSuccess`) and the grid reflects the new state after a refetch.
 */
export function useRoomsQuery(floor: FloorId) {
  return useQuery({
    queryKey: liveMonitorKeys.rooms(floor),
    queryFn: () => api.fetchRooms(floor),
    staleTime: 5_000,
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
  });
}

/** Invalidate rooms + activity after an action that changes either. */
function useInvalidateBoard() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: liveMonitorKeys.rooms("2") });
    qc.invalidateQueries({ queryKey: liveMonitorKeys.rooms("3") });
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
