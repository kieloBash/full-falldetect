import { BADGE_VARIANT_BY_STATE } from "./constants";
import type { BadgeVariant, EffectiveState, Room } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Seconds -> "m:ss", used for the live elapsed timer. */
export function formatElapsed(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${pad(totalSeconds % 60)}`;
}

/** CCTV-style timestamp burned into the camera feed overlay. */
export function formatCameraStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

/** Clock time for activity-feed entries, e.g. "6:42 PM". */
export function formatClockTime(date: Date = new Date()): string {
  let h = date.getHours();
  const m = pad(date.getMinutes());
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

/**
 * A room's displayed state folds sensor connectivity into the alert
 * lifecycle: an idle room with an offline sensor should read as "offline",
 * not "all clear".
 */
export function effState(room: Room): EffectiveState {
  return room.alertState === "idle" && room.sensorStatus === "offline" ? "offline" : room.alertState;
}

export function badgeVariantFor(room: Room): BadgeVariant {
  return BADGE_VARIANT_BY_STATE[effState(room)];
}

export function elapsedSeconds(startedAt: number | null, now: number): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** AI bounding-box presentation for the camera feed, keyed off effective state. */
export function detectBox(state: EffectiveState) {
  const onFloor = state === "active" || state === "acknowledged";
  return {
    onFloor,
    borderClass: state === "active" ? "border-red-500" : state === "acknowledged" ? "border-amber-500" : "border-teal-400",
    tagBgClass: state === "active" ? "bg-red-500" : state === "acknowledged" ? "bg-amber-500" : "bg-teal-400",
    tag: onFloor ? "FALL DETECTED" : "Person",
  };
}
