// location: frontend/lib/detection-node-server/validators.ts
// Input validation for the machine routes. Hand-rolled to avoid adding a schema library.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const DEVICE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const NODE_KEY = /^[A-Za-z0-9_-]{1,64}$/;
const SCREENSHOT_EXT = /\.jpg$/;

export type SensorStatusValue = "ONLINE" | "DEGRADED" | "OFFLINE";

/** localhost, *.local, and private IPv4 ranges (10/8, 172.16/12, 192.168/16, 127/8). */
export function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host === "[::1]" || host.endsWith(".local")) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export type HeartbeatInput = {
  nodeKey: string;
  name: string | null;
  streamBaseUrl: string | null;
  cameras: { deviceId: string; status: SensorStatusValue }[];
};

/**
 * http:// is allowed only for LAN / local addresses (the two-laptop setup);
 * https:// is allowed anywhere (e.g. a tunnel later). Returns origin + path, no trailing slash.
 */
export function normalizeStreamBaseUrl(raw: unknown): Result<string | null> {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "streamBaseUrl must be a string" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "streamBaseUrl is not a valid URL" };
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isPrivateHost(url.hostname))) {
    return { ok: false, error: "streamBaseUrl must be a LAN address (http://192.168.x.x:8002) or an https:// URL" };
  }
  return { ok: true, value: `${url.origin}${url.pathname}`.replace(/\/+$/, "") };
}

export function parseHeartbeat(body: unknown): Result<HeartbeatInput> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;

  if (typeof b.nodeKey !== "string" || !NODE_KEY.test(b.nodeKey)) {
    return { ok: false, error: "nodeKey must be 1–64 letters, digits, - or _" };
  }
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 80) : null;

  const url = normalizeStreamBaseUrl(b.streamBaseUrl);
  if (!url.ok) return url;

  if (!Array.isArray(b.cameras) || b.cameras.length === 0 || b.cameras.length > 32) {
    return { ok: false, error: "cameras must be an array of 1–32 items" };
  }
  const cameras: HeartbeatInput["cameras"] = [];
  for (const raw of b.cameras) {
    const c = raw as Record<string, unknown>;
    if (typeof c?.deviceId !== "string" || !DEVICE_ID.test(c.deviceId)) {
      return { ok: false, error: "Each camera needs a valid deviceId" };
    }
    const status = typeof c.status === "string" ? c.status.toUpperCase() : "";
    if (status !== "ONLINE" && status !== "DEGRADED" && status !== "OFFLINE") {
      return { ok: false, error: `Camera ${c.deviceId}: status must be online, degraded or offline` };
    }
    cameras.push({ deviceId: c.deviceId, status });
  }

  return {
    ok: true,
    value: { nodeKey: b.nodeKey, name, streamBaseUrl: url.value, cameras },
  };
}

export type IngestFields = {
  deviceId: string;
  confidence: number;
  detectedAt: Date;
  /** Supabase object path, legacy "screenshots/..." path, or null. Checked in the route. */
  screenshotPath: string | null;
};

export function parseIngestFields(raw: {
  deviceId: unknown;
  confidence: unknown;
  detectedAt: unknown;
  eventType: unknown;
  screenshotPath?: unknown;
  screenshot?: unknown;
}): Result<IngestFields> {
  if (typeof raw.deviceId !== "string" || !DEVICE_ID.test(raw.deviceId)) {
    return { ok: false, error: "deviceId is missing or invalid" };
  }
  if (raw.eventType !== "fall") return { ok: false, error: 'eventType must be "fall"' };
  const confidence = typeof raw.confidence === "number" ? raw.confidence : Number(raw.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    return { ok: false, error: "confidence must be a number from 0 to 100" };
  }
  const detectedAt = typeof raw.detectedAt === "string" ? new Date(raw.detectedAt) : new Date(NaN);
  if (Number.isNaN(detectedAt.getTime())) return { ok: false, error: "detectedAt must be an ISO date" };

  let screenshotPath: string | null = null;
  if (raw.screenshotPath !== undefined && raw.screenshotPath !== null && raw.screenshotPath !== "") {
    if (typeof raw.screenshotPath !== "string" || !SCREENSHOT_EXT.test(raw.screenshotPath)) {
      return { ok: false, error: "screenshotPath must be a .jpg object path" };
    }
    screenshotPath = raw.screenshotPath;
  } else if (typeof raw.screenshot === "string") {
    // Old backend: local path like "../frontend/public/screenshots/x.jpg". Works only when
    // both apps share one disk (single-machine dev), so keep the part after "public/".
    const idx = raw.screenshot.lastIndexOf("public/");
    screenshotPath = idx >= 0 ? raw.screenshot.slice(idx + "public/".length) : null;
  }

  return { ok: true, value: { deviceId: raw.deviceId, confidence, detectedAt, screenshotPath } };
}
