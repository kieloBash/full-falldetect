// location: frontend/lib/admin/api.ts
import { apiClient } from "@/lib/api/client";
import type { Floor, FloorFormValues, Patient, PatientFormValues, Room, RoomFormValues } from "@/lib/admin/types";

/**
 * Admin API layer (axios, see lib/api/client.ts). One function per endpoint;
 * each throws ApiError with the server's `{ error }` message on non-2xx.
 *
 * Mapping notes:
 *  - Floor `wing` is display-only (from the facility name).
 *  - Room `sensorId` is saved to Sensor.deviceId — it must match the camera's ID
 *    in backend/.env CAMERA_ID_MAP for alerts to reach the room.
 *  - Patient maps to Resident; assigning an occupied room is rejected (409).
 */

/* ── Floors ────────────────────────────────────────────────────────────── */

export async function fetchFloors(): Promise<Floor[]> {
  const { data } = await apiClient.get<Floor[]>("/admin/floors");
  return data;
}

export async function createFloor(values: FloorFormValues): Promise<Floor> {
  const { data } = await apiClient.post<Floor>("/admin/floors", { name: values.name });
  return data;
}

export async function updateFloor(floorId: string, values: FloorFormValues): Promise<Floor> {
  const { data } = await apiClient.patch<Floor>(`/admin/floors/${floorId}`, { name: values.name });
  return data;
}

export async function deleteFloor(floorId: string): Promise<void> {
  await apiClient.delete(`/admin/floors/${floorId}`);
}

/* ── Rooms ─────────────────────────────────────────────────────────────── */

export async function fetchRooms(): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>("/admin/rooms");
  return data;
}

export async function createRoom(values: RoomFormValues): Promise<Room> {
  const { data } = await apiClient.post<Room>("/admin/rooms", values);
  return data;
}

export async function updateRoom(roomId: string, values: RoomFormValues): Promise<Room> {
  const { data } = await apiClient.patch<Room>(`/admin/rooms/${roomId}`, values);
  return data;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await apiClient.delete(`/admin/rooms/${roomId}`);
}

/* ── Patients ──────────────────────────────────────────────────────────── */

export async function fetchPatients(): Promise<Patient[]> {
  const { data } = await apiClient.get<Patient[]>("/admin/patients");
  return data;
}

export async function createPatient(values: PatientFormValues): Promise<Patient> {
  const { data } = await apiClient.post<Patient>("/admin/patients", values);
  return data;
}

export async function updatePatient(patientId: string, values: PatientFormValues): Promise<Patient> {
  const { data } = await apiClient.patch<Patient>(`/admin/patients/${patientId}`, values);
  return data;
}

export async function deletePatient(patientId: string): Promise<void> {
  await apiClient.delete(`/admin/patients/${patientId}`);
}
