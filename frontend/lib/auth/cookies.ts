import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "fd_session";

export const SESSION_MAX_AGE = 60 * 60 * 8;
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export async function setSessionCookie(token: string, maxAge: number): Promise<void> {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
