// location: frontend/lib/detection-node-server/supabase-storage.ts
// Fall screenshots live in a PRIVATE Supabase Storage bucket. The camera laptop uploads
// them and sends only the object path (e.g. "CAM-201/2026-09-24T06-08-00Z_a1b2c3d4.jpg").
// This server turns paths into short-lived signed URLs for logged-in users.
// Uses the Supabase SECRET key, so this file must never be imported by client code.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_BUCKET ?? "fall-screenshots";
const SIGNED_URL_TTL_SEC = 60 * 60;
const REFRESH_WHEN_LEFT_MS = 10 * 60 * 1000; // re-sign when < 10 min remain
const FAILURE_BACKOFF_MS = 60 * 1000; // don't hammer Supabase for missing objects
const MAX_CACHE_ENTRIES = 500;

let client: SupabaseClient | null = null;
let warnedMissingConfig = false;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    if (!warnedMissingConfig) {
      console.warn("[screenshots] SUPABASE_URL / SUPABASE_SECRET_KEY not set: screenshots won't display");
      warnedMissingConfig = true;
    }
    return null;
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// path -> signed URL (or null after a failure) and when to stop trusting it
const cache = new Map<string, { url: string | null; validUntil: number }>();

function remember(path: string, url: string | null, validUntil: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(path, { url, validUntil });
}

/**
 * Accepts only "<deviceId>/<file>.jpg" for the camera that sent the alert, so a caller
 * can't point an incident at another camera's image or at an arbitrary URL.
 */
export function isValidScreenshotPath(path: string, deviceId: string): boolean {
  const prefix = `${deviceId}/`;
  if (!path.startsWith(prefix)) return false;
  const name = path.slice(prefix.length);
  return /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,127}\.jpg$/.test(name) && !name.includes("..");
}

/** Returns a URL the browser can load, or null. Never throws. */
export async function resolveScreenshotUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // Legacy values from the seed or the old backend: files in frontend/public/screenshots.
  if (path.startsWith("screenshots/")) return `/${path}`;
  if (/^https?:\/\//.test(path)) return path;

  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.validUntil > now) return hit.url;

  const sb = getClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
    if (error || !data?.signedUrl) {
      console.warn(`[screenshots] could not sign ${path}: ${error?.message ?? "no URL returned"}`);
      remember(path, null, now + FAILURE_BACKOFF_MS);
      return null;
    }
    remember(path, data.signedUrl, now + SIGNED_URL_TTL_SEC * 1000 - REFRESH_WHEN_LEFT_MS);
    return data.signedUrl;
  } catch (err) {
    console.warn(`[screenshots] Supabase unreachable while signing ${path}`, err);
    remember(path, null, now + FAILURE_BACKOFF_MS);
    return null;
  }
}

/** For GET /api/monitor: replace each room's screenshotPath with a loadable URL. */
export async function withSignedScreenshots<T extends { screenshotPath?: string | null }>(rows: T[]): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) =>
      row.screenshotPath ? { ...row, screenshotPath: await resolveScreenshotUrl(row.screenshotPath) } : row,
    ),
  );
}
