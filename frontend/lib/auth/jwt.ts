import "server-only";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me");
const ISSUER = "falldetect";
const ALG = "HS256";

export interface SessionClaims {
  userId: string;
  email: string;
  facilityId: string;
  role: "ADMIN" | "NURSE";
}

export async function signSessionToken(claims: SessionClaims, maxAgeSeconds: number): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISSUER)
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: [ALG] });
    return { userId: payload.userId as string, email: payload.email as string, facilityId: payload.facilityId as string, role: payload.role as "ADMIN" | "NURSE" };
  } catch {
    return null;
  }
}
