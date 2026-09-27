// location: frontend/lib/admin/useFloorManagement.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { errorMessage } from "./errors";
import {
  useCreateFloorMutation,
  useDeleteFloorMutation,
  useFloorsQuery,
  usePatientsQuery,
  useRoomsQuery,
  useUpdateFloorMutation,
} from "./queries";
import { activePatientForRoom, floorStatusDotClass, onlineSensorCount, roomsForFloor } from "./utils";

/**
 * Owns all state for `/admin` (Floor Management): the floor list with
 * status/room-count summaries, the selected floor's read-only room table
 * (room CRUD lives on `/admin/rooms`), the add/rename floor modal, and the
 * delete-floor confirmation (only empty floors can be deleted).
 */
export function useFloorManagement() {
  const floorsQuery = useFloorsQuery();
  const roomsQuery = useRoomsQuery();
  const patientsQuery = usePatientsQuery();
  const floors = useMemo(() => floorsQuery.data ?? [], [floorsQuery.data]);
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);
  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [floorName, setFloorName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createFloorMutation = useCreateFloorMutation();
  const updateFloorMutation = useUpdateFloorMutation();
  const deleteFloorMutation = useDeleteFloorMutation();

  const selectedFloor = useMemo(
    () => floors.find((f) => f.id === selectedFloorId) ?? floors[0] ?? null,
    [floors, selectedFloorId]
  );

  const selectFloor = useCallback((id: string) => setSelectedFloorId(id), []);

  const floorCards = useMemo(
    () =>
      floors.map((floor) => {
        const floorRooms = roomsForFloor(rooms, floor.id);
        return {
          floor,
          roomCount: floorRooms.length,
          onlineCount: onlineSensorCount(floorRooms),
          dotClass: floorStatusDotClass(floorRooms),
        };
      }),
    [floors, rooms]
  );

  const selectedFloorRoomRows = useMemo(() => {
    if (!selectedFloor) return [];
    return roomsForFloor(rooms, selectedFloor.id).map((room) => ({
      room,
      patient: activePatientForRoom(patients, room.id),
    }));
  }, [rooms, patients, selectedFloor]);

  /* ── Add / rename ───────────────────────────────────────────────────── */

  const openAddFloorModal = useCallback(() => {
    setEditingFloorId(null);
    setFloorName("");
    setFormError(null);
    setFloorModalOpen(true);
  }, []);

  const openEditFloorModal = useCallback(() => {
    if (!selectedFloor) return;
    setEditingFloorId(selectedFloor.id);
    setFloorName(selectedFloor.name);
    setFormError(null);
    setFloorModalOpen(true);
  }, [selectedFloor]);

  const closeFloorModal = useCallback(() => setFloorModalOpen(false), []);

  const saveFloor = useCallback(() => {
    if (!floorName.trim()) {
      setFormError("Floor name is required.");
      return;
    }
    setFormError(null);
    const values = { name: floorName, wing: "" };
    const onError = (e: unknown) => setFormError(errorMessage(e));
    if (editingFloorId) {
      updateFloorMutation.mutate(
        { floorId: editingFloorId, values },
        { onSuccess: () => setFloorModalOpen(false), onError }
      );
    } else {
      createFloorMutation.mutate(values, {
        onSuccess: (floor) => {
          setFloorModalOpen(false);
          setSelectedFloorId(floor.id);
        },
        onError,
      });
    }
  }, [floorName, editingFloorId, createFloorMutation, updateFloorMutation]);

  /* ── Delete ─────────────────────────────────────────────────────────── */

  const requestDeleteFloor = useCallback(() => {
    deleteFloorMutation.reset();
    setDeleteOpen(true);
  }, [deleteFloorMutation]);

  const cancelDeleteFloor = useCallback(() => setDeleteOpen(false), []);

  const confirmDeleteFloor = useCallback(() => {
    if (!selectedFloor) return;
    deleteFloorMutation.mutate(selectedFloor.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedFloorId(null);
      },
    });
  }, [selectedFloor, deleteFloorMutation]);

  return {
    floors,
    floorCards,
    selectedFloor,
    selectFloor,
    selectedFloorRoomRows,
    loading: floorsQuery.isPending,

    floorModalOpen,
    isEditingFloor: editingFloorId !== null,
    floorName,
    setFloorName,
    formError,
    openAddFloorModal,
    openEditFloorModal,
    closeFloorModal,
    saveFloor,
    savingFloor: createFloorMutation.isPending || updateFloorMutation.isPending,

    deleteTarget: deleteOpen && selectedFloor
      ? {
          title: `Delete ${selectedFloor.name}?`,
          description: "Only empty floors can be deleted. This can't be undone.",
          confirmLabel: "Delete floor",
        }
      : null,
    deleteError: errorMessage(deleteFloorMutation.error),
    deletingFloor: deleteFloorMutation.isPending,
    requestDeleteFloor,
    cancelDeleteFloor,
    confirmDeleteFloor,
  };
}

export type UseFloorManagementReturn = ReturnType<typeof useFloorManagement>;
