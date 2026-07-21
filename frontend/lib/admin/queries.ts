"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { buildFloors } from "./mock-data";
import type { FloorFormValues, RoomFormValues } from "./types";

export const adminKeys = {
  floors: ["admin", "floors"] as const,
};

/** Floor + room roster for the admin panel, seeded synchronously via `initialData`. */
export function useFloorsQuery() {
  return useQuery({
    queryKey: adminKeys.floors,
    queryFn: api.fetchFloors,
    // initialData: buildFloors,
  });
}

/**
 * Every mutation below invalidates the floors query on success instead of
 * hand-patching local state — standard "mutate, then refetch" for an admin
 * CRUD screen where a few hundred ms of latency is a non-issue (contrast
 * with Live Monitor, where sub-second optimistic UI matters).
 */

export function useCreateFloorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: FloorFormValues) => api.createFloor(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.floors }),
  });
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, values }: { floorId: string; values: RoomFormValues }) => api.createRoom(floorId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.floors }),
  });
}

export function useUpdateRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, roomId, values }: { floorId: string; roomId: string; values: RoomFormValues }) =>
      api.updateRoom(floorId, roomId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.floors }),
  });
}

export function useDeleteRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, roomId }: { floorId: string; roomId: string }) => api.deleteRoom(floorId, roomId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.floors }),
  });
}
