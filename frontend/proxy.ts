import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-runtime auth gate. Runs before every matched route (see `config`
 * below) and checks for a valid session JWT in the `fd_session` cookie.
 *
 * Why this re-implements verification instead of importing
 * `lib/auth/jwt.ts`: that module is `server-only` and targets the Node
 * runtime, but middleware runs on the Edge runtime. `jose` is edge-safe, so
 * we call `jwtVerify` here directly with the same secret + issuer. Keep
 * SECRET/ISSUER/ALG in sync with `lib/auth/jwt.ts`.
 */

const SECRET = new TextEncoder().encode(
  process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me"
);
const ISSUER = "falldetect";
const ALG = "HS256";
const COOKIE_NAME = "fd_session";

// The auth screen lives at "/". Everything else under the matcher is gated.
const LOGIN_PATH = "/";
// Where to send a signed-in user who lands on the login screen.
const DEFAULT_AUTHED_DEST = "/live-monitor";

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET, { issuer: ISSUER, algorithms: [ALG] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isLogin = pathname === LOGIN_PATH;
  const authed = await hasValidSession(req);

  // The login screen ("/") is the one public route.
  if (isLogin) {
    // Signed-in users shouldn't sit on the login page — send them onward,
    // honoring a `?next=` hint if one is present and points somewhere real.
    if (authed) {
      const next = req.nextUrl.searchParams.get("next");
      const dest = next && next.startsWith("/") && next !== LOGIN_PATH ? next : DEFAULT_AUTHED_DEST;
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // Gated route without a valid session → bounce to login ("/"), remembering
  // where they were headed so login can send them back.
  if (!authed) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher excludes Next internals, static assets, and the auth API routes
 * (those must stay reachable so login/register/logout can run). Everything
 * else flows through the gate; only "/" is allowed through without a session.
 */
export const config = {
  matcher: [
    "/((?!api/auth|api/facilities|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};