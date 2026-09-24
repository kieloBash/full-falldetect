// location: frontend/lib/detection-node-server/machine-auth.ts
// Shared bearer-secret check for machine-to-machine routes (ingest + heartbeat).
// Constant-time compare, and no debug details in the response (TDS §9.4 fix).
import "server-only";
import { timingSafeEqual } from "node:crypto";

export function isMachineAuthorized(req: Request): boolean {
  const secret = process.env.MONITOR_INGEST_SECRET;
  if (!secret) {
    console.error("[machine-auth] MONITOR_INGEST_SECRET is not set");
    return false;
  }
  const received = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
