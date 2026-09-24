// location: frontend/lib/auth/guards.ts
// Route-level session + role checks (fix #11). Mirrors the JWT settings in TDS §9.1:
// HS256, issuer "falldetect", cookie fd_session, claims userId/email/facilityId/role.
import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const SESSION_COOKIE = "fd_session";
const ISSUER = "falldetect";

export type SessionRole = "ADMIN" | "NURSE";

export type SessionUser = {
  userId: string;
  email: string;
  facilityId: string;
  role: SessionRole;
};

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_JWT_SECRET is not set. Add it to frontend/.env.");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret(), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    const { userId, email, facilityId, role } = payload as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof facilityId !== "string" ||
      (role !== "ADMIN" && role !== "NURSE")
    ) {
      return null;
    }
    return { userId, email, facilityId, role };
  } catch {
    return null;
  }
}

/** Returns the user, or a 401 response to return directly from the route. */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return user;
}

/** Returns the user if they are an ADMIN, otherwise a 401/403 response. */
export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only administrators can do this" }, { status: 403 });
  }
  return user;
}
