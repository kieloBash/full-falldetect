import { buildFloors } from "./mock-data";
import type { AdminFloor, AdminRoom, FloorFormValues, RoomFormValues } from "./types";

/**
 * Admin API layer. Same shape as the other features' api.ts files — every
 * function resolves mock data today, with a `TODO(api)` showing the exact
 * axios call to make through `@/lib/api/client` once a backend exists.
 *
 * Unlike Live Monitor's api.ts (which always returns a fresh mock roster),
 * this one keeps a module-level in-memory store so create/update/delete
 * actually persist for the session — `queries.ts` refetches from here after
 * every mutation instead of managing local optimistic state, which is the
 * more idiomatic TanStack Query pattern for an admin CRUD screen like this.
 */

let floorsStore: AdminFloor[] = buildFloors();

function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function requireFloor(floorId: string): AdminFloor {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) throw new Error(`Floor ${floorId} not found`);
  return floor;
}

export async function fetchFloors(): Promise<AdminFloor[]> {
  // TODO(api): const { data } = await apiClient.get<AdminFloor[]>("/admin/floors");
  //            return data;
  return mockDelay(floorsStore);
}

export async function createFloor(values: FloorFormValues): Promise<AdminFloor> {
  // TODO(api): const { data } = await apiClient.post<AdminFloor>("/admin/floors", values);
  //            return data;
  const floor: AdminFloor = {
    id: `floor-${Date.now()}`,
    name: values.name.trim(),
    wing: values.wing.trim() || "Unassigned",
    rooms: [],
  };
  floorsStore = [...floorsStore, floor];
  return mockDelay(floor);
}

export async function createRoom(floorId: string, values: RoomFormValues): Promise<AdminRoom> {
  // TODO(api): const { data } = await apiClient.post<AdminRoom>(`/admin/floors/${floorId}/rooms`, values);
  //            return data;
  requireFloor(floorId);
  const room: AdminRoom = { id: `room-${Date.now()}`, ...values };
  floorsStore = floorsStore.map((f) => (f.id === floorId ? { ...f, rooms: [...f.rooms, room] } : f));
  return mockDelay(room);
}

export async function updateRoom(floorId: string, roomId: string, values: RoomFormValues): Promise<AdminRoom> {
  // TODO(api): const { data } = await apiClient.patch<AdminRoom>(`/admin/floors/${floorId}/rooms/${roomId}`, values);
  //            return data;
  requireFloor(floorId);
  const room: AdminRoom = { id: roomId, ...values };
  floorsStore = floorsStore.map((f) => (f.id === floorId ? { ...f, rooms: f.rooms.map((r) => (r.id === roomId ? room : r)) } : f));
  return mockDelay(room);
}

export async function deleteRoom(floorId: string, roomId: string): Promise<void> {
  // TODO(api): await apiClient.delete(`/admin/floors/${floorId}/rooms/${roomId}`);
  requireFloor(floorId);
  floorsStore = floorsStore.map((f) => (f.id === floorId ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) } : f));
  return mockDelay(undefined);
}
