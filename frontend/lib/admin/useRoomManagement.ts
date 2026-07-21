"use client";

import { useCallback, useMemo, useState } from "react";
import { useCreateRoomMutation, useDeleteRoomMutation, useFloorsQuery, usePatientsQuery, useRoomsQuery, useUpdateRoomMutation } from "./queries";
import type { Room, RoomFormValues } from "./types";
import { activePatientForRoom, floorLabel } from "./utils";

const EMPTY_ROOM_FORM: RoomFormValues = { room: "", sensorId: "", floorId: "" };

/**
 * Owns all state for `/admin/rooms` (Room Management): the full rooms
 * table (every floor, with each room's floor and assigned patient) and
 * the add/edit room modal.
 */
export function useRoomManagement() {
  const floorsQuery = useFloorsQuery();
  const roomsQuery = useRoomsQuery();
  const patientsQuery = usePatientsQuery();
  const floors = floorsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormValues>(EMPTY_ROOM_FORM);

  const createRoomMutation = useCreateRoomMutation();
  const updateRoomMutation = useUpdateRoomMutation();
  const deleteRoomMutation = useDeleteRoomMutation();

  const openAddRoomModal = useCallback(() => {
    setEditingRoomId(null);
    setRoomForm({ room: "", sensorId: "", floorId: floors[0]?.id ?? "" });
    setRoomModalOpen(true);
  }, [floors]);

  const openEditRoomModal = useCallback((room: Room) => {
    setEditingRoomId(room.id);
    setRoomForm({ room: room.room, sensorId: room.sensorId, floorId: room.floorId });
    setRoomModalOpen(true);
  }, []);

  const closeRoomModal = useCallback(() => setRoomModalOpen(false), []);

  const updateRoomFormField = useCallback(<K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    setRoomForm((f) => ({ ...f, [key]: value }));
  }, []);

  const saveRoom = useCallback(() => {
    if (!roomForm.room.trim()) return;
    const onSuccess = () => setRoomModalOpen(false);
    if (editingRoomId) {
      updateRoomMutation.mutate({ roomId: editingRoomId, values: roomForm }, { onSuccess });
    } else {
      createRoomMutation.mutate({ values: roomForm }, { onSuccess });
    }
  }, [roomForm, editingRoomId, createRoomMutation, updateRoomMutation]);

  const removeRoom = useCallback((roomId: string) => deleteRoomMutation.mutate(roomId), [deleteRoomMutation]);

  const roomRows = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        floorName: floorLabel(floors, room.floorId),
        patient: activePatientForRoom(patients, room.id),
      })),
    [rooms, floors, patients]
  );

  return {
    floors,
    roomRows,
    floorCount: floors.length,

    roomModalOpen,
    isEditingRoom: editingRoomId !== null,
    roomForm,
    updateRoomFormField,
    openAddRoomModal,
    openEditRoomModal,
    closeRoomModal,
    saveRoom,
    savingRoom: createRoomMutation.isPending || updateRoomMutation.isPending,
    removeRoom,
  };
}

export type UseRoomManagementReturn = ReturnType<typeof useRoomManagement>;
