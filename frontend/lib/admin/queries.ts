"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { FloorFormValues, PatientFormValues, RoomFormValues } from "./types";

export const adminKeys = {
  floors: ["admin", "floors"] as const,
  rooms: ["admin", "rooms"] as const,
  patients: ["admin", "patients"] as const,
};

export function useFloorsQuery() {
  return useQuery({ queryKey: adminKeys.floors, queryFn: api.fetchFloors, });
}

export function useRoomsQuery() {
  return useQuery({ queryKey: adminKeys.rooms, queryFn: api.fetchRooms, });
}

export function usePatientsQuery() {
  return useQuery({ queryKey: adminKeys.patients, queryFn: api.fetchPatients, });
}

/**
 * Every mutation below invalidates the relevant quer(y/ies) on success
 * instead of hand-patching local state — "mutate, then refetch" for an
 * admin CRUD screen where a few hundred ms of latency is a non-issue.
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
    mutationFn: ({ values }: { values: RoomFormValues }) => api.createRoom(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.rooms }),
  });
}

export function useUpdateRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, values }: { roomId: string; values: RoomFormValues }) => api.updateRoom(roomId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.rooms }),
  });
}

export function useDeleteRoomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => api.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.rooms });
      // Deleting a room can unassign a patient — keep the patients list in sync too.
      queryClient.invalidateQueries({ queryKey: adminKeys.patients });
    },
  });
}

export function useCreatePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PatientFormValues) => api.createPatient(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.patients }),
  });
}

export function useUpdatePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, values }: { patientId: string; values: PatientFormValues }) => api.updatePatient(patientId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.patients }),
  });
}

export function useDeletePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => api.deletePatient(patientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.patients }),
  });
}
