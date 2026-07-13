import { COPY } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { effState } from "@/lib/live-monitor/utils";
import { CameraFeed } from "./CameraFeed";
import { Icon } from "@/components/icons/Icon";

export interface CameraModalProps {
  room: Room;
  now: number;
  reducedMotion: boolean;
  onClose: () => void;
}

function ReadoutCell({ label, value, colorClass = "text-slate-900" }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="rounded-[9px] border border-slate-200 px-3 py-[10px]">
      <div className="text-[9.5px] font-semibold uppercase tracking-[.05em] text-slate-400">{label}</div>
      <div className={`mt-[3px] text-sm font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

/** Full-screen live camera feed, opened from the inspector's Sensor section or a camera-wall card's expand button. */
export function CameraModal({ room, now, reducedMotion, onClose }: CameraModalProps) {
  const state = effState(room);
  const onFloor = state === "active" || state === "acknowledged";
  const degraded = room.sensorStatus === "degraded";
  const readoutColor = state === "active" ? "text-red-600" : state === "acknowledged" ? "text-amber-700" : "text-teal-700";

  return (
    <div onClick={onClose} className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/55 p-5" role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="w-[600px] max-w-full overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(15,23,42,.24)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold text-slate-900">Live camera feed · Room {room.label}</div>
            <div className="mt-[2px] text-xs text-slate-600">{room.resident} · CCTV + AI fall detection</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="overflow-hidden rounded-[10px]">
            <CameraFeed room={room} now={now} reducedMotion={reducedMotion} heightClassName="h-[320px]" />
          </div>

          <div className="mt-[14px] grid grid-cols-4 gap-[10px]">
            <ReadoutCell label="Posture" value={onFloor ? "On floor" : "Upright"} colorClass={readoutColor} />
            <ReadoutCell
              label="AI detection"
              value={state === "active" ? "Fall detected" : state === "acknowledged" ? "Responding" : "Normal"}
              colorClass={readoutColor}
            />
            <ReadoutCell label="Camera" value={degraded ? "Reconnecting…" : "1080p HD"} colorClass={degraded ? "text-amber-700" : "text-slate-900"} />
            <ReadoutCell label="Confidence" value={onFloor ? "98%" : "Nominal"} />
          </div>

          <div className="mt-[14px] flex items-start gap-[9px] rounded-[9px] border border-slate-200 bg-slate-100 px-[13px] py-[11px]">
            <Icon name="lock" size={17} className="mt-[1px] text-slate-600" strokeWidth={2} />
            <span className="text-xs leading-normal text-slate-600">{COPY.privacyNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
