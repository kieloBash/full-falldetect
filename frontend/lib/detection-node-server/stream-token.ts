// location: frontend/lib/detection-node-server/stream-token.ts
// Short-lived tokens that let a signed-in browser open one camera's stream.
// The Python service verifies them with the same STREAM_TOKEN_SECRET (backend/stream_auth.py).
import "server-only";
import { SignJWT } from "jose";

export const STREAM_TOKEN_TTL_SEC = 300;
export const STREAM_TOKEN_ISSUER = "falldetect";
export const STREAM_TOKEN_AUDIENCE = "falldetect-stream";

function streamSecret(): Uint8Array {
  const secret = process.env.STREAM_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("STREAM_TOKEN_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function signStreamToken(input: {
  deviceId: string;
  userId: string;
  facilityId: string;
}): Promise<{ token: string; expiresAt: string }> {
  const exp = Math.floor(Date.now() / 1000) + STREAM_TOKEN_TTL_SEC;
  const token = await new SignJWT({ deviceId: input.deviceId, fid: input.facilityId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(STREAM_TOKEN_ISSUER)
    .setAudience(STREAM_TOKEN_AUDIENCE)
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(streamSecret());
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}
