// location: frontend/lib/users/utils.ts
/**
 * Random temporary password (12 chars, no look-alike characters like 0/O or 1/l),
 * using the browser's crypto RNG.
 */
export function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** "Sep 26, 2026, 9:05 AM", or "Never". */
export function formatLastLogin(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
