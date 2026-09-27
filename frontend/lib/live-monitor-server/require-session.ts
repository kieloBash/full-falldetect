// location: frontend/lib/live-monitor-server/require-session.ts
import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { SessionClaims } from "@/lib/auth/jwt";
import { isUserActive } from "@/lib/auth/active-user";

/**
 * Returns the session claims, or a 401 response to return early.
 * Deactivated accounts (User.isActive = false) are rejected even with a valid cookie.
 */
export async function requireSession(): Promise<{ claims: SessionClaims } | { error: Response }> {
  const claims = await getSession();
  if (!claims || !(await isUserActive(claims.userId))) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  return { claims };
}

/**
 * Same as requireSession, but only for ADMIN accounts (403 otherwise).
 * proxy.ts already blocks non-admins from /api/admin/*; this is the second layer.
 */
export async function requireAdminSession(): Promise<{ claims: SessionClaims } | { error: Response }> {
  const auth = await requireSession();
  if ("error" in auth) return auth;
  if (auth.claims.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Only administrators can do this." }, { status: 403 }) };
  }
  return auth;
}
