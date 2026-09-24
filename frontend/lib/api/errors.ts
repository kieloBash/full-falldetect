// location: frontend/lib/api/errors.ts
import { NextResponse } from "next/server";

/** Every API error uses the shape { error: "message" } (TDS §6). */
export function jsonError(status: number, error: string) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * True for a unique-constraint violation (Prisma P2002, or raw Postgres 23505).
 * Checked by code so we don't depend on the generated client's import path.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; cause?: { code?: unknown }; message?: unknown };
  if (e.code === "P2002" || e.code === "23505") return true;
  if (e.cause?.code === "23505") return true;
  return typeof e.message === "string" && e.message.includes("Unique constraint");
}
