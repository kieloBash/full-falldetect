import { COPY } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { detectBox, effState, formatCameraStamp } from "@/lib/live-monitor/utils";
import { Icon } from "@/components/icons/Icon";

export interface CameraFeedProps {
  room: Room;
  now: number;
  reducedMotion: boolean;
  heightClassName?: string;
  onExpand?: () => void;
}

/**
 * The CCTV feed surface: REC indicator, camera id, live timestamp, scanline
 * overlay, and the AI detection bounding box (teal "Person" / red "FALL
 * DETECTED"). Shared by the camera-wall card and the full-screen modal so
 * both stay pixel-identical.
 *
 * TODO(api): swap the placeholder gradient for a <video>/<img> element bound
 * to the encrypted CCTV stream URL once the media pipeline exists.
 */
export function CameraFeed({ room, now, reducedMotion, heightClassName = "h-[196px]", onExpand }: CameraFeedProps) {
  const state = effState(room);
  const online = room.sensorStatus !== "offline";

  if (!online) {
    return (
      <div className={`relative ${heightClassName} flex flex-col items-center justify-center gap-2 bg-[#0B1220] text-slate-500`}>
        <Icon name="wifiOff" size={26} strokeWidth={1.6} />
        <span className="text-[11px] font-semibold">{COPY.cameraOffline}</span>
      </div>
    );
  }

  const box = detectBox(state);

  return (
    <div className={`relative ${heightClassName} overflow-hidden bg-[#0B1220]`}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,#1e293b,#0B1220)]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "repeating-linear-gradient(rgba(0,0,0,.16) 0 1px, transparent 1px 3px)",
          boxShadow: "inset 0 0 70px rgba(0,0,0,.5)",
        }}
      />
      <div className="pointer-events-none absolute left-[10px] top-[9px] flex items-center gap-[9px]">
        <div className="flex items-center gap-[5px] rounded-[5px] bg-[#0B1220]/50 px-[7px] py-[3px]">
          <span className={`h-2 w-2 rounded-full bg-red-500 ${reducedMotion ? "" : "animate-fd-dot"}`} />
          <span className="text-[9px] font-bold tracking-[.1em] text-slate-50">REC</span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-slate-200/80">CAM-{room.id}</span>
      </div>
      <div className="pointer-events-none absolute right-[10px] top-[10px] font-mono text-[9.5px] font-medium text-slate-200/80">
        {formatCameraStamp(now)}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`relative rounded border-2 shadow-[0_0_0_1px_rgba(0,0,0,.3)] ${box.borderClass} ${
            box.onFloor ? "h-[26%] w-[46%] translate-y-[30%]" : "h-[54%] w-[30%]"
          }`}
        >
          <span
            className={`absolute -left-[2px] -top-[18px] whitespace-nowrap rounded-[3px] px-[5px] py-[2px] text-[9px] font-bold tracking-[.06em] text-white ${box.tagBgClass}`}
          >
            {box.tag}
          </span>
        </div>
      </div>
      {onExpand && (
        <button
          type="button"
          title="Open full feed"
          onClick={onExpand}
          className="absolute bottom-[10px] right-[10px] flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#0B1220]/60 text-white hover:bg-[#0B1220]/90"
        >
          <Icon name="expand" size={15} />
        </button>
      )}
    </div>
  );
}
