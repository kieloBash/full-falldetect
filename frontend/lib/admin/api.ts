import type { Floor, FloorFormValues, Patient, PatientFormValues, Room, RoomFormValues } from "./types";

/**
 * Admin API layer. Same signatures as the mock version — queries.ts and the
 * three hooks import exactly these names — but each now calls a real route
 * handler under `app/api/admin/*` backed by Prisma. Servers flatten the
 * normalized Floor/Room/Sensor/Resident rows into the Admin UI shapes (see
 * `lib/admin/server-projection.ts`).
 *
 * Mapping notes:
 *  - Floor `wing` is display-only (from the facility); createFloor ignores it.
 *  - Room create/update persist Room + Sensor.
 *  - Patient maps to Resident; `roomId` is the inverse of the schema
 *    (Room.residentId), reconciled server-side. `notes`/`discharged` are real
 *    columns. Assigning an occupied room is rejected (409).
 */

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Request failed.");
  return data as T;
}

/* ── Floors ────────────────────────────────────────────────────────────── */

export async function fetchFloors(): Promise<Floor[]> {
  return json<Floor[]>(await fetch("/api/admin/floors"));
}

export async function createFloor(values: FloorFormValues): Promise<Floor> {
  return json<Floor>(
    await fetch("/api/admin/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name }),
    })
  );
}

/* ── Rooms ─────────────────────────────────────────────────────────────── */

export async function fetchRooms(): Promise<Room[]> {
  return json<Room[]>(await fetch("/api/admin/rooms"));
}

export async function createRoom(values: RoomFormValues): Promise<Room> {
  return json<Room>(
    await fetch("/api/admin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
  );
}

export async function updateRoom(roomId: string, values: RoomFormValues): Promise<Room> {
  return json<Room>(
    await fetch(`/api/admin/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
  );
}

export async function deleteRoom(roomId: string): Promise<void> {
  await json(await fetch(`/api/admin/rooms/${roomId}`, { method: "DELETE" }));
}

/* ── Patients ──────────────────────────────────────────────────────────── */

export async function fetchPatients(): Promise<Patient[]> {
  return json<Patient[]>(await fetch("/api/admin/patients"));
}

export async function createPatient(values: PatientFormValues): Promise<Patient> {
  return json<Patient>(
    await fetch("/api/admin/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
  );
}

export async function updatePatient(patientId: string, values: PatientFormValues): Promise<Patient> {
  return json<Patient>(
    await fetch(`/api/admin/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
  );
}

export async function deletePatient(patientId: string): Promise<void> {
  await json(await fetch(`/api/admin/patients/${patientId}`, { method: "DELETE" }));
}
