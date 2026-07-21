import { User, UserRole } from "@/app/generated/prisma/client";
import type { FacilityOption, LoginFormValues, RegisterFormValues } from "./types";

/**
 * Auth API layer. Same shape as before, but the mock delays are gone: each
 * call now hits a real route handler under `app/api/auth/*` that talks to
 * Prisma. Session state is a JWT set as an httpOnly cookie by the route —
 * the client never sees or stores the token, so these still just return the
 * lightweight `AuthResult`.
 */

export interface AuthResult {
  userId: string;
  email: string;
  role: UserRole;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export async function login(values: LoginFormValues): Promise<AuthResult> {
  return postJson<AuthResult>("/api/auth/login", values);
}

export async function register(values: RegisterFormValues): Promise<AuthResult> {
  return postJson<AuthResult>("/api/auth/register", values);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function fetchFacilities(): Promise<FacilityOption[]> {
  const res = await fetch("/api/facilities");
  if (!res.ok) throw new Error("Could not load facilities.");
  return (await res.json()) as FacilityOption[];
}

export async function fetchProfileMe(): Promise<User> {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error("Could not load user profile.");
  return (await res.json());
}

