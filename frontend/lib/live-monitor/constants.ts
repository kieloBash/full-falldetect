// location: frontend/lib/live-monitor/constants.ts
import type { IconName } from "@/components/icons/Icon";
import type { BadgeVariant, EffectiveState, SensorStatus } from "./types";

/**
 * FallDetect design tokens.
 * The brief's palette (slate neutrals, teal accent, red/amber/green semantic
 * colors) maps 1:1 onto Tailwind's default palette, so components use plain
 * Tailwind classes (bg-teal-600, text-slate-600, etc.) instead of a custom
 * theme. This file only holds the handful of values Tailwind can't express
 * as a class (font stacks, keyframe names) plus per-state lookup tables.
 */
export const FONT_SANS = 'Inter, "IBM Plex Sans", system-ui, sans-serif';
export const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

/** Keyframe names registered in tailwind.config (see output/README.md). */
export const ANIMATION = {
  alertPulse: "animate-fd-pulse",
  statusDot: "animate-fd-dot",
  toastIn: "animate-fd-toast-in",
  bannerFlash: "animate-fd-banner",
} as const;

export const FALSE_ALARM_REASONS = [
  "Resident sat down",
  "Pet or object",
  "Sensor glitch",
  "Other",
] as const;

export type FalseAlarmReason = (typeof FALSE_ALARM_REASONS)[number];

interface BadgeMeta {
  label: string;
  icon: IconName;
  textClass: string;
  bgClass: string;
}

/** StatusBadge appearance per alert/sensor state. */
export const BADGE_META: Record<BadgeVariant, BadgeMeta> = {
  active: { label: "Active", icon: "alert", textClass: "text-red-600", bgClass: "bg-red-100" },
  acknowledged: { label: "Acknowledged", icon: "userCheck", textClass: "text-amber-700", bgClass: "bg-amber-100" },
  resolved: { label: "Resolved", icon: "checkCircle", textClass: "text-green-700", bgClass: "bg-green-100" },
  falsealarm: { label: "False alarm", icon: "xCircle", textClass: "text-slate-500", bgClass: "bg-slate-100" },
  allclear: { label: "All clear", icon: "shield", textClass: "text-green-700", bgClass: "bg-green-100" },
  offline: { label: "Offline", icon: "wifiOff", textClass: "text-slate-500", bgClass: "bg-slate-100" },
  degraded: { label: "Degraded", icon: "wall", textClass: "text-amber-700", bgClass: "bg-amber-100" },
};

/** Maps a room's effective lifecycle state to the StatusBadge variant that represents it. */
export const BADGE_VARIANT_BY_STATE: Record<EffectiveState, BadgeVariant> = {
  active: "active",
  acknowledged: "acknowledged",
  resolved: "resolved",
  falsealarm: "falsealarm",
  offline: "offline",
  idle: "allclear",
};

interface SensorMeta {
  label: string;
  meta: string;
  dotClass: string;
}

export const SENSOR_META: Record<SensorStatus, SensorMeta> = {
  offline: { label: "Sensor offline", meta: "No heartbeat", dotClass: "bg-slate-400" },
  degraded: { label: "Signal degraded", meta: "Unstable", dotClass: "bg-amber-600" },
  online: { label: "Sensor online", meta: "Live", dotClass: "bg-green-600" },
};

/** Dot color (as a Tailwind bg-* class) used in the sidebar pinned list, mirroring StatusBadge urgency. */
export const STATE_DOT_CLASS: Record<EffectiveState, string> = {
  active: "bg-red-600",
  acknowledged: "bg-amber-600",
  resolved: "bg-green-600",
  falsealarm: "bg-slate-400",
  offline: "bg-slate-400",
  idle: "bg-green-600",
};

export const COPY = {
  productName: "FallDetect",
  searchPlaceholder: "Search residents or rooms",
  simulateFallLabel: "Simulate fall",
  noRoomsMatch: "No rooms match your search",
  clearSearch: "Clear search",
  noPinnedSide: "No pinned rooms",
  noPinnedWall: "No rooms pinned to the camera wall",
  noPinnedWallHint:
    'Select a room and choose "Pin to camera wall" in its detail panel to watch its live feed here.',
  cameraOffline: "Camera offline",
  privacyNote:
    "AI watches each in-room camera and raises an alert when the resident leaves the bed. Live video needs a short-lived access token from this dashboard.",
} as const;

