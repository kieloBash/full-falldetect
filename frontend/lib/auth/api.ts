// location: frontend/lib/auth/api.ts
import { apiClient } from "@/lib/api/client";
import type { LoginFormValues } from "./types";

/**
 * Auth API layer (axios). The session is a JWT in the httpOnly `fd_session`
 * cookie set by the route handler — the client never sees the token.
 * There is no register call: admins create accounts (lib/users).
 */

export type UserRole = "ADMIN" | "NURSE";

export interface AuthResult {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ProfileMe {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function login(values: LoginFormValues): Promise<AuthResult> {
  const { data } = await apiClient.post<AuthResult>("/auth/login", values);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchProfileMe(): Promise<ProfileMe> {
  const { data } = await apiClient.get<ProfileMe>("/me");
  return data;
}
