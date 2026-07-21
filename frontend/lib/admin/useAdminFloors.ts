"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useCreateFloorMutation,
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useFloorsQuery,
  useUpdateRoomMutation,
} from "./queries";
import type { AdminRoom, RoomFormValues } from "./types";

const EMPTY_ROOM_FORM: RoomFormValues = { room: "", sensorId: "", resident: "", status: "online", floorId: "" };

/**
 * Owns all state for the Admin Floor Management screen: the floors/rooms
 * roster (via `useFloorsQuery`), which floor is selected, both modals'
 * form state, and the create/update/delete mutations. Mirrors the shape of
 * `useLiveMonitor`/`useAuthForm` — one hook, consumed by `<AdminScreen />`.
 */
export function useAdminFloors() {
  const floorsQuery = useFloorsQuery();
  const floors = floorsQuery.data ?? [];

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorWing, setNewFloorWing] = useState("");

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormValues>(EMPTY_ROOM_FORM);

  const createFloorMutation = useCreateFloorMutation();
  const createRoomMutation = useCreateRoomMutation();
  const updateRoomMutation = useUpdateRoomMutation();
  const deleteRoomMutation = useDeleteRoomMutation();

  const selectedFloor = useMemo(
    () => floors.find((f) => f.id === selectedFloorId) ?? floors[0] ?? null,
    [floors, selectedFloorId]
  );

  const selectFloor = useCallback((id: string) => setSelectedFloorId(id), []);

  /* ── Floor modal ────────────────────────────────────────────────────── */

  const openAddFloorModal = useCallback(() => {
    setNewFloorName("");
    setNewFloorWing("");
    setFloorModalOpen(true);
  }, []);
  const closeFloorModal = useCallback(() => setFloorModalOpen(false), []);

  const saveFloor = useCallback(() => {
    if (!newFloorName.trim()) return;
    createFloorMutation.mutate(
      { name: newFloorName, wing: newFloorWing },
      {
        onSuccess: (floor) => {
          setFloorModalOpen(false);
          setSelectedFloorId(floor.id);
        },
      }
    );
  }, [newFloorName, newFloorWing, createFloorMutation]);

  /* ── Room modal ─────────────────────────────────────────────────────── */

  const openAddRoomModal = useCallback(() => {
    setEditingRoomId(null);
    setRoomForm(EMPTY_ROOM_FORM);
    setRoomModalOpen(true);
  }, []);

  const openEditRoomModal = useCallback((room: AdminRoom) => {
    setEditingRoomId(room.id);
    setRoomForm({ room: room.room, sensorId: room.sensorId, resident: room.resident, status: room.status, floorId: room.floorId });
    setRoomModalOpen(true);
  }, []);

  const closeRoomModal = useCallback(() => setRoomModalOpen(false), []);

  const updateRoomFormField = useCallback(<K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    setRoomForm((f) => ({ ...f, [key]: value }));
  }, []);

  const saveRoom = useCallback(() => {
    if (!selectedFloor || !roomForm.room.trim()) return;
    const onSuccess = () => setRoomModalOpen(false);
    if (editingRoomId) {
      updateRoomMutation.mutate({ roomId: editingRoomId, values: roomForm }, { onSuccess });
    } else {
      createRoomMutation.mutate({ values: roomForm }, { onSuccess });
    }
  }, [selectedFloor, roomForm, editingRoomId, createRoomMutation, updateRoomMutation]);

  const removeRoom = useCallback(
    (roomId: string) => {
      if (!selectedFloor) return;
      deleteRoomMutation.mutate(roomId);
    },
    [selectedFloor, deleteRoomMutation]
  );

  return {
    floors,
    selectedFloor,
    selectFloor,

    floorModalOpen,
    newFloorName,
    setNewFloorName,
    newFloorWing,
    setNewFloorWing,
    openAddFloorModal,
    closeFloorModal,
    saveFloor,
    savingFloor: createFloorMutation.isPending,

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

export type UseAdminFloorsReturn = ReturnType<typeof useAdminFloors>;
