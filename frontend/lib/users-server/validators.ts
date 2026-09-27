// location: frontend/lib/users-server/validators.ts
import "server-only";
import { MIN_PASSWORD_LENGTH } from "@/lib/users/constants";
import type { UserRole } from "@/lib/users/types";

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: UserRole[] = ["ADMIN", "NURSE"];

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function validatePassword(v: unknown): Ok<string> | Err {
  if (typeof v !== "string" || v.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (v.length > 128) return { ok: false, error: "Password must be at most 128 characters." };
  return { ok: true, value: v };
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  password: string;
}

export function parseCreateUser(body: Record<string, unknown>): Ok<CreateUserInput> | Err {
  const firstName = str(body.firstName);
  const lastName = str(body.lastName);
  const email = str(body.email)?.toLowerCase() ?? null;
  if (!firstName || !lastName) return { ok: false, error: "First and last name are required." };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  const role = (body.role ?? "NURSE") as UserRole;
  if (!ROLES.includes(role)) return { ok: false, error: "Account type must be Nurse or Administrator." };
  const password = validatePassword(body.password);
  if (!password.ok) return password;
  return { ok: true, value: { firstName, lastName, email, role, password: password.value } };
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

/** Every field is optional; only the ones sent are changed. */
export function parseUpdateUser(body: Record<string, unknown>): Ok<UpdateUserInput> | Err {
  const out: UpdateUserInput = {};
  if (body.firstName !== undefined) {
    const v = str(body.firstName);
    if (!v) return { ok: false, error: "First name is required." };
    out.firstName = v;
  }
  if (body.lastName !== undefined) {
    const v = str(body.lastName);
    if (!v) return { ok: false, error: "Last name is required." };
    out.lastName = v;
  }
  if (body.email !== undefined) {
    const v = str(body.email)?.toLowerCase();
    if (!v || !EMAIL_RE.test(v)) return { ok: false, error: "Enter a valid email address." };
    out.email = v;
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as UserRole)) return { ok: false, error: "Account type must be Nurse or Administrator." };
    out.role = body.role as UserRole;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return { ok: false, error: "isActive must be true or false." };
    out.isActive = body.isActive;
  }
  return { ok: true, value: out };
}
