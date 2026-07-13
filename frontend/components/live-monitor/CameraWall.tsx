import { COPY } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { CameraCard } from "./CameraCard";
import { Icon } from "@/components/icons/Icon";

export interface CameraWallProps {
  rooms: Room[];
  now: number;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onFlagFalseAlarm: (id: string) => void;
  onResolve: (id: string) => void;
}

/** Camera wall view: every pinned room's live feed at a glance, for watching several residents at once. */
export function CameraWall({ rooms, now, reducedMotion, onSelect, onExpand, onAcknowledge, onFlagFalseAlarm, onResolve }: CameraWallProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center text-slate-400">
        <Icon name="wall" size={40} strokeWidth={1.5} />
        <div className="text-[15px] font-semibold text-slate-600">{COPY.noPinnedWall}</div>
        <div className="max-w-[320px] text-[13px]">{COPY.noPinnedWallHint}</div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-10 pt-5">
      <div className="mb-[14px] flex items-center gap-2 text-[12.5px] font-medium text-slate-600">
        <Icon name="wall" size={15} />
        Watching {rooms.length} pinned {rooms.length === 1 ? "room" : "rooms"} · live camera feeds
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] content-start gap-4">
        {rooms.map((room) => (
          <CameraCard
            key={room.id}
            room={room}
            now={now}
            reducedMotion={reducedMotion}
            onSelect={() => onSelect(room.id)}
            onExpand={() => onExpand(room.id)}
            onAcknowledge={() => onAcknowledge(room.id)}
            onFlagFalseAlarm={() => onFlagFalseAlarm(room.id)}
            onResolve={() => onResolve(room.id)}
          />
        ))}
      </div>
    </div>
  );
}
