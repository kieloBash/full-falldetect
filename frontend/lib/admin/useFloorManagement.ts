"use client";

import { useCallback, useMemo, useState } from "react";
import { useCreateFloorMutation, useFloorsQuery, usePatientsQuery, useRoomsQuery } from "./queries";
import { activePatientForRoom, floorStatusDotClass, onlineSensorCount, roomsForFloor } from "./utils";

/**
 * Owns all state for `/admin` (Floor Management): the floor list with
 * status/room-count summaries, the selected floor's read-only room table
 * (room CRUD lives on `/admin/rooms`), and the "Add floor" modal.
 */
export function useFloorManagement() {
  const floorsQuery = useFloorsQuery();
  const roomsQuery = useRoomsQuery();
  const patientsQuery = usePatientsQuery();
  const floors = floorsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorWing, setNewFloorWing] = useState("");

  const createFloorMutation = useCreateFloorMutation();

  const selectedFloor = useMemo(() => floors.find((f) => f.id === selectedFloorId) ?? floors[0] ?? null, [floors, selectedFloorId]);

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

  return {
    floors,
    floorCards,
    selectedFloor,
    selectFloor,
    selectedFloorRoomRows,

    floorModalOpen,
    newFloorName,
    setNewFloorName,
    newFloorWing,
    setNewFloorWing,
    openAddFloorModal,
    closeFloorModal,
    saveFloor,
    savingFloor: createFloorMutation.isPending,
  };
}

export type UseFloorManagementReturn = ReturnType<typeof useFloorManagement>;
