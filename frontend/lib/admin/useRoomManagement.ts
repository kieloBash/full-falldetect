// location: frontend/lib/admin/useRoomManagement.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { errorMessage } from "./errors";
import { useCreateRoomMutation, useDeleteRoomMutation, useFloorsQuery, usePatientsQuery, useRoomsQuery, useUpdateRoomMutation } from "./queries";
import type { Room, RoomFormValues } from "./types";
import { activePatientForRoom, floorLabel } from "./utils";

const EMPTY_ROOM_FORM: RoomFormValues = { room: "", sensorId: "", floorId: "" };

/**
 * Owns all state for `/admin/rooms` (Room Management): the full rooms table
 * (every floor, with each room's floor and assigned patient), the add/edit
 * room modal, and the delete confirmation.
 */
export function useRoomManagement() {
  const floorsQuery = useFloorsQuery();
  const roomsQuery = useRoomsQuery();
  const patientsQuery = usePatientsQuery();
  const floors = useMemo(() => floorsQuery.data ?? [], [floorsQuery.data]);
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);
  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormValues>(EMPTY_ROOM_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const createRoomMutation = useCreateRoomMutation();
  const updateRoomMutation = useUpdateRoomMutation();
  const deleteRoomMutation = useDeleteRoomMutation();

  const openAddRoomModal = useCallback(() => {
    setEditingRoomId(null);
    setRoomForm({ room: "", sensorId: "", floorId: floors[0]?.id ?? "" });
    setFormError(floors.length === 0 ? "Create a floor in Floor Management before adding rooms." : null);
    setRoomModalOpen(true);
  }, [floors]);

  const openEditRoomModal = useCallback((room: Room) => {
    setEditingRoomId(room.id);
    setRoomForm({ room: room.room, sensorId: room.sensorId, floorId: room.floorId });
    setFormError(null);
    setRoomModalOpen(true);
  }, []);

  const closeRoomModal = useCallback(() => setRoomModalOpen(false), []);

  const updateRoomFormField = useCallback(<K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    setRoomForm((f) => ({ ...f, [key]: value }));
  }, []);

  const saveRoom = useCallback(() => {
    if (!roomForm.room.trim()) return setFormError("Room number is required.");
    if (!roomForm.sensorId.trim()) return setFormError("Sensor / device ID is required (e.g. CAM-201).");
    if (!roomForm.floorId) return setFormError("Select a floor.");
    setFormError(null);
    const onSuccess = () => setRoomModalOpen(false);
    const onError = (e: unknown) => setFormError(errorMessage(e));
    if (editingRoomId) {
      updateRoomMutation.mutate({ roomId: editingRoomId, values: roomForm }, { onSuccess, onError });
    } else {
      createRoomMutation.mutate({ values: roomForm }, { onSuccess, onError });
    }
  }, [roomForm, editingRoomId, createRoomMutation, updateRoomMutation]);

  /* ── Delete (with confirmation) ─────────────────────────────────────── */

  const requestRemoveRoom = useCallback(
    (roomId: string) => {
      deleteRoomMutation.reset();
      setDeleteRoomId(roomId);
    },
    [deleteRoomMutation]
  );
  const cancelRemoveRoom = useCallback(() => setDeleteRoomId(null), []);
  const confirmRemoveRoom = useCallback(() => {
    if (!deleteRoomId) return;
    deleteRoomMutation.mutate(deleteRoomId, { onSuccess: () => setDeleteRoomId(null) });
  }, [deleteRoomId, deleteRoomMutation]);

  const roomToDelete = rooms.find((r) => r.id === deleteRoomId) ?? null;

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
    formError,
    updateRoomFormField,
    openAddRoomModal,
    openEditRoomModal,
    closeRoomModal,
    saveRoom,
    savingRoom: createRoomMutation.isPending || updateRoomMutation.isPending,

    removeRoom: requestRemoveRoom,
    deleteTarget: roomToDelete
      ? {
          title: `Delete room ${roomToDelete.room}?`,
          description:
            "Its sensor is removed and any patient in it becomes unassigned. Rooms with incident history can't be deleted.",
          confirmLabel: "Delete room",
        }
      : null,
    deleteError: errorMessage(deleteRoomMutation.error),
    deletingRoom: deleteRoomMutation.isPending,
    cancelRemoveRoom,
    confirmRemoveRoom,
  };
}

export type UseRoomManagementReturn = ReturnType<typeof useRoomManagement>;
