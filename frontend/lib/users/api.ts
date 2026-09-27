// location: frontend/lib/users/api.ts
import { apiClient } from "@/lib/api/client";
import type { CreateUserValues, StaffUser, UpdateUserValues } from "./types";

/** User Management API (axios). Each call throws ApiError with the server's message. */

export async function fetchUsers(): Promise<StaffUser[]> {
  const { data } = await apiClient.get<StaffUser[]>("/admin/users");
  return data;
}

export async function createUser(values: CreateUserValues): Promise<StaffUser> {
  const { data } = await apiClient.post<StaffUser>("/admin/users", values);
  return data;
}

export async function updateUser(userId: string, values: UpdateUserValues): Promise<StaffUser> {
  const { data } = await apiClient.patch<StaffUser>(`/admin/users/${userId}`, values);
  return data;
}

export async function resetPassword(userId: string, password: string): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/reset-password`, { password });
}
