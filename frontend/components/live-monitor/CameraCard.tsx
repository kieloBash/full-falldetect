import type { Room } from "@/lib/live-monitor/types";
import { badgeVariantFor, effState } from "@/lib/live-monitor/utils";
import { CameraFeed } from "./CameraFeed";
import { StatusBadge } from "./StatusBadge";

export interface CameraCardProps {
  room: Room;
  now: number;
  reducedMotion: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onAcknowledge: () => void;
  onFlagFalseAlarm: () => void;
  onResolve: () => void;
}

/** One tile in the Camera wall view: live feed + identity strip + inline response actions. */
export function CameraCard({ room, now, reducedMotion, onSelect, onExpand, onAcknowledge, onFlagFalseAlarm, onResolve }: CameraCardProps) {
  const state = effState(room);

  return (
    <div className={`overflow-hidden rounded-[10px] bg-white ${state === "active" ? "border-2 border-red-600" : "border border-slate-200"}`}>
      <CameraFeed room={room} now={now} reducedMotion={reducedMotion} onExpand={onExpand} />

      <div className="flex items-center justify-between gap-[10px] px-[14px] py-3">
        <div className="flex min-w-0 cursor-pointer items-center gap-[10px]" onClick={onSelect}>
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-teal-600">
            {room.initials}
          </div>
          <div className="min-w-0">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold">{room.resident}</div>
            <div className="text-[11px] font-medium text-slate-400">
              Room {room.label} · Floor {room.label}
            </div>
          </div>
        </div>
        <StatusBadge variant={badgeVariantFor(room)} label={state === "falsealarm" ? "False alarm" : undefined} size="sm" />
      </div>

      {state === "active" && (
        <div className="flex gap-2 px-[14px] pb-[14px]">
          <button
            type="button"
            onClick={onAcknowledge}
            className="h-9 flex-1 rounded-lg bg-teal-600 text-[12.5px] font-semibold text-white hover:bg-teal-700"
          >
            Acknowledge
          </button>
          <button
            type="button"
            onClick={onFlagFalseAlarm}
            className="h-9 flex-none rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            False alarm
          </button>
        </div>
      )}

      {state === "acknowledged" && (
        <div className="flex gap-2 px-[14px] pb-[14px]">
          <button
            type="button"
            onClick={onResolve}
            className="h-9 flex-1 rounded-lg border border-green-600 bg-white text-[12.5px] font-semibold text-green-700 hover:bg-green-100"
          >
            Mark resolved
          </button>
        </div>
      )}
    </div>
  );
}
