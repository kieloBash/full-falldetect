import type { IconName } from "@/components/icons/Icon";
import type { BadgeVariant, EffectiveState, RiskLevel, SensorStatus } from "./types";

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

interface RiskMeta {
  label: string;
  textClass: string;
  bgClass: string;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  high: { label: "High risk", textClass: "text-amber-700", bgClass: "bg-amber-100" },
  medium: { label: "Medium risk", textClass: "text-slate-600", bgClass: "bg-slate-100" },
  low: { label: "Low risk", textClass: "text-slate-500", bgClass: "bg-slate-50" },
};

interface SensorMeta {
  label: string;
  meta: string;
  dotClass: string;
}

export const SENSOR_META: Record<SensorStatus, SensorMeta> = {
  offline: { label: "Sensor offline", meta: "Last seen 48m ago", dotClass: "bg-slate-400" },
  degraded: { label: "Signal degraded", meta: "Calibration due", dotClass: "bg-amber-600" },
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

export const FLOOR_OPTIONS: { value: "2" | "3"; label: string }[] = [
  { value: "2", label: "Floor 2 — Sunrise Wing" },
  { value: "3", label: "Floor 3 — Sunrise Wing" },
];

export const COPY = {
  productName: "FallDetect",
  breadcrumbBase: "Sunrise Wing",
  searchPlaceholder: "Search residents, rooms, or incidents",
  simulateFallLabel: "Simulate fall",
  navOnlyLiveMonitorToast: "This handoff covers Live Monitor only",
  noRoomsMatch: "No rooms match your search",
  clearSearch: "Clear search",
  noPinnedSide: "No pinned rooms",
  noPinnedWall: "No rooms pinned to the camera wall",
  noPinnedWallHint:
    'Select a room and choose "Pin to camera wall" in its detail panel to watch its live feed here.',
  cameraOffline: "Camera offline",
  privacyNote:
    "AI continuously analyses the in-room CCTV feed and flags falls automatically. Streams are encrypted end-to-end and every view is access-logged.",
} as const;

export const NAV_ITEMS = [
  { key: "monitor", label: "Live Monitor", icon: "grid", active: true },
  { key: "incidents", label: "Incidents", icon: "wall", active: false },
  { key: "analytics", label: "Analytics", icon: "wall", active: false },
  { key: "settings", label: "Settings", icon: "wall", active: false },
] as const;
