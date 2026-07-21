import type { AdminFloor, AdminRoom, FloorFormValues, RoomFormValues } from "./types";

/**
 * Admin API layer. Same signatures as the mock version — queries.ts and the
 * hook import exactly these names — but each now calls a real route handler
 * under `app/api/admin/*` backed by Prisma. The server flattens the
 * normalized Floor/Room/Sensor/Resident rows into the Admin UI shape (see
 * `lib/admin/server-projection.ts`).
 *
 * Mapping notes carried over from the schema decisions:
 *  - `wing` is display-only (derived from the facility); createFloor ignores it.
 *  - create/update persist Room + Sensor only. `resident` round-trips for
 *    display but edits to it are NOT saved here (resident assignment is a
 *    separate concern).
 */

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Request failed.");
  return data as T;
}

export async function fetchFloors(): Promise<AdminFloor[]> {
  return json<AdminFloor[]>(await fetch("/api/admin/floors"));
}

export async function createFloor(values: FloorFormValues): Promise<AdminFloor> {
  return json<AdminFloor>(
    await fetch("/api/admin/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name }),
    })
  );
}

export async function createRoom(floorId: string, values: RoomFormValues): Promise<AdminRoom> {
  return json<AdminRoom>(
    await fetch(`/api/admin/floors/${floorId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
  );
}

export async function updateRoom(floorId: string, roomId: string, values: RoomFormValues): Promise<AdminRoom> {
  return json<AdminRoom>(
    await fetch(`/api/admin/floors/${floorId}/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
  );
}

export async function deleteRoom(floorId: string, roomId: string): Promise<void> {
  await json(await fetch(`/api/admin/floors/${floorId}/rooms/${roomId}`, { method: "DELETE" }));
}
