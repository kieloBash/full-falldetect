import "server-only";
import { signSessionToken, verifySessionToken, type SessionClaims } from "./jwt";
import { setSessionCookie, readSessionCookie, clearSessionCookie, SESSION_MAX_AGE, REMEMBER_MAX_AGE } from "./cookies";

export async function createSession(claims: SessionClaims, rememberMe: boolean): Promise<void> {
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;
  const token = await signSessionToken(claims, maxAge);
  await setSessionCookie(token, maxAge);
}

export async function getSession(): Promise<SessionClaims | null> {
  const token = await readSessionCookie();
  if (!token) return null;
  return verifySessionToken(token);
}

export async function destroySession(): Promise<void> {
  await clearSessionCookie();
}
