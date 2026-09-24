// location: frontend/proxy.ts
// REPLACES the existing edge gate (TDS §9.2). Same flow, plus three fixes:
//  1. /api/monitor/heartbeat is excluded (machine route, bearer secret, no cookie).
//  2. Signed-out /api/* calls get 401 JSON instead of a 307 redirect to the login page.
//  3. /admin, /api/admin/* and /api/detection-nodes/* require role ADMIN (fix #11).
// Keep SESSION_COOKIE, ISSUER and the secret in sync with lib/auth/jwt.ts.
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "fd_session";
const ISSUER = "falldetect";

const PUBLIC_API = ["/api/auth", "/api/facilities", "/api/monitor/ingest", "/api/monitor/heartbeat"];
const ADMIN_ONLY = ["/admin", "/api/admin", "/api/detection-nodes"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret ?? "dev-only-insecure-secret-change-me");
}

async function readSession(req: NextRequest): Promise<{ role: string } | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret(), { issuer: ISSUER, algorithms: ["HS256"] });
    return typeof payload.role === "string" ? { role: payload.role } : null;
  } catch {
    return null;
  }
}

/** Only same-site paths, never "//evil.com". */
function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (matches(pathname, PUBLIC_API)) return NextResponse.next();

  const session = await readSession(req);
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/") {
    if (!session) return NextResponse.next();
    const next = safeNext(req.nextUrl.searchParams.get("next")) ?? "/live-monitor";
    return NextResponse.redirect(new URL(next, req.url));
  }

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const login = new URL("/", req.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (matches(pathname, ADMIN_ONLY) && session.role !== "ADMIN") {
    if (isApi) return NextResponse.json({ error: "Only administrators can do this" }, { status: 403 });
    return NextResponse.redirect(new URL("/live-monitor", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|screenshots/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt)$).*)",
  ],
};
