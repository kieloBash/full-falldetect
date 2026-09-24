// location: frontend/lib/detection-node/utils.ts

/** "just now", "42 s ago", "5 min ago", "3 h ago", "2 d ago", or "never". */
export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Host part of a URL, for compact display. */
export function hostOf(url: string | null): string {
  if (!url) return "none";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * GET /api/monitor now returns a ready-to-use screenshot URL (a Supabase signed URL, or
 * "/screenshots/x.jpg" for legacy local files). This also tolerates the old relative form.
 * Use it for every screenshot <img src>.
 */
export function resolveScreenshotSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `/${path}`;
}
