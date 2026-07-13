import type { MouseEvent } from "react";
import { RISK_META, SENSOR_META } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { badgeVariantFor, effState, elapsedSeconds, formatElapsed } from "@/lib/live-monitor/utils";
import { Icon } from "@/components/icons/Icon";
import { StatusBadge } from "./StatusBadge";

export interface AlertTileProps {
  room: Room;
  now: number;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
  onAcknowledge: () => void;
  onFlagFalseAlarm: () => void;
  onResolve: () => void;
}

/**
 * The Live Monitor's signature component. One card per room:
 * idle → active (red, pulsing) → acknowledged (amber) → resolved (green
 * flash) → back to idle, or active → false alarm (fades gray).
 */
export function AlertTile({ room, now, selected, reducedMotion, onSelect, onAcknowledge, onFlagFalseAlarm, onResolve }: AlertTileProps) {
  const state = effState(room);
  const risk = RISK_META[room.risk];
  const sensor = SENSOR_META[room.sensorStatus];
  const elapsed = elapsedSeconds(room.startedAt, now);
  const showTimer = state === "active" || state === "acknowledged";

  const stateClasses =
    state === "active"
      ? `border-2 border-red-600 bg-red-50 p-[13px] ${reducedMotion ? "shadow-[0_0_0_4px_rgba(220,38,38,.15)]" : "animate-fd-pulse"}`
      : state === "acknowledged"
        ? "border-2 border-amber-600 bg-amber-50 p-[13px]"
        : state === "resolved"
          ? "border-2 border-green-600 bg-green-50 p-[13px]"
          : state === "falsealarm"
            ? "border border-slate-200 bg-slate-50 p-3.5 opacity-[.62]"
            : state === "offline"
              ? "border border-slate-200 bg-slate-50 p-3.5 opacity-70"
              : "border border-slate-200 bg-white p-3.5";

  const hoverClass = state === "active" ? "" : "hover:shadow-[0_1px_6px_rgba(15,23,42,.09)]";
  const selectedClass = selected ? "outline outline-2 outline-offset-1 outline-teal-600" : "";

  const stopPropagation = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onSelect}
      className={`relative box-border flex flex-col gap-[11px] rounded-lg transition-shadow ${stateClasses} ${hoverClass} ${selectedClass} cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[13px] font-bold text-slate-900">Room {room.label}</span>
          <span className="text-[10px] font-medium text-slate-400">{room.zone}</span>
        </div>
        <span title={sensor.label} className={`mt-[3px] h-[9px] w-[9px] flex-none rounded-full ${sensor.dotClass}`} />
      </div>

      <div className="flex min-w-0 items-center gap-[10px]">
        <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-slate-100 text-[13px] font-semibold text-teal-600">
          {room.initials}
        </div>
        <div className="min-w-0">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-slate-900">{room.resident}</div>
          <div className={`mt-[2px] text-[11px] font-medium ${risk.textClass}`}>{risk.label}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusBadge variant={badgeVariantFor(room)} label={state === "falsealarm" ? "False alarm" : undefined} />
        {showTimer && (
          <span className={`text-[15px] font-semibold tabular-nums ${state === "active" ? "text-red-600" : "text-amber-700"}`}>
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      {state === "acknowledged" && (
        <div className="flex items-center gap-[7px]">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-amber-600 text-[9px] font-semibold text-white">
            DO
          </div>
          <span className="text-xs font-medium text-slate-600">{room.acknowledgedBy ?? "David Okafor"} responding</span>
        </div>
      )}

      {state === "active" && (
        <div className="flex gap-2" onClick={stopPropagation}>
          <button
            type="button"
            onClick={onAcknowledge}
            className="flex h-[38px] flex-1 items-center justify-center gap-[6px] rounded-lg bg-teal-600 text-[13px] font-semibold text-white hover:bg-teal-700"
          >
            <Icon name="check" size={15} strokeWidth={2.2} />
            Acknowledge
          </button>
          <button
            type="button"
            onClick={onFlagFalseAlarm}
            className="h-[38px] flex-none rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            False alarm
          </button>
        </div>
      )}

      {state === "acknowledged" && (
        <div className="flex gap-2" onClick={stopPropagation}>
          <button
            type="button"
            onClick={onResolve}
            className="flex h-[38px] flex-1 items-center justify-center gap-[6px] rounded-lg border border-green-600 bg-white text-[13px] font-semibold text-green-700 hover:bg-green-100"
          >
            <Icon name="checkCircle" size={15} strokeWidth={2.2} />
            Mark resolved
          </button>
        </div>
      )}
    </div>
  );
}
