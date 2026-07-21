/** Shared types for the FallDetect Live Monitor screen. */

import { Floor } from "@/app/generated/prisma/client";

export type AlertState = "idle" | "active" | "acknowledged" | "resolved" | "falsealarm";

/** `effState()` also introduces "offline" for idle rooms whose sensor is down. */
export type EffectiveState = AlertState | "offline";

export type SensorStatus = "online" | "degraded" | "offline";

export type RiskLevel = "low" | "medium" | "high";

export type FloorId = string

export type ViewMode = "grid" | "wall";

export interface Room {
  id: string;
  label: string;
  floor: Floor;
  resident: string;
  risk: RiskLevel;
  sensorStatus: SensorStatus;
  zone: string;
  initials: string;
  alertState: AlertState;
  startedAt: number | null;
  acknowledgedBy: string | null;
  falseAlarmReason: string | null;
  history: History[]
}

export interface History {
  state: string;
  detectedAt: string | Date;
  falseAlarmReason: string | null;
  responder: {
    firstName: string,
    lastName: string,
  } | null
}

export interface ActivityItem {
  id: string;
  text: string;
  when: string;
  /** Tailwind `bg-*` class for the leading timeline dot, e.g. "bg-teal-600". */
  color: string;
}

export interface Toast {
  id: string;
  text: string;
  /** Tailwind `bg-*` class for the leading dot, e.g. "bg-red-600". */
  dot: string;
}

export type BadgeVariant =
  | "active"
  | "acknowledged"
  | "resolved"
  | "falsealarm"
  | "allclear"
  | "offline"
  | "degraded";

export type BadgeSize = "sm" | "md";
