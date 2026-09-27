// location: frontend/lib/users-server/projection.ts
import "server-only";
import type { StaffUser } from "@/lib/users/types";

/** Prisma `select` for user rows. passwordHash is never selected. */
export const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "NURSE";
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function projectUser(row: UserRow): StaffUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
