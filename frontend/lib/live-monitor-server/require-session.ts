import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { SessionClaims } from "@/lib/auth/jwt";

/** Returns the session claims, or a 401 response to return early. */
export async function requireSession(): Promise<{ claims: SessionClaims } | { error: Response }> {
  const claims = await getSession();
  if (!claims) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  return { claims };
}
