import { COPY } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { AlertTile } from "./AlertTile";
import { Icon } from "@/components/icons/Icon";

export interface RoomGridProps {
  rooms: Room[];
  now: number;
  selectedId: string | null;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onFlagFalseAlarm: (id: string) => void;
  onResolve: (id: string) => void;
  onClearSearch: () => void;
}

/** Default Live Monitor view: every monitored room as an AlertTile, sorted urgent-first. */
export function RoomGrid({ rooms, now, selectedId, reducedMotion, onSelect, onAcknowledge, onFlagFalseAlarm, onResolve, onClearSearch }: RoomGridProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-slate-400">
        <Icon name="search" size={40} strokeWidth={1.6} />
        <div className="text-[15px] font-semibold text-slate-600">{COPY.noRoomsMatch}</div>
        <button
          type="button"
          onClick={onClearSearch}
          className="rounded-lg border border-slate-200 bg-white px-[14px] py-[7px] text-[13px] font-semibold text-teal-600"
        >
          {COPY.clearSearch}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] content-start gap-4 px-6 pb-10 pt-5">
      {rooms.map((room) => (
        <AlertTile
          key={room.id}
          room={room}
          now={now}
          selected={selectedId === room.id}
          reducedMotion={reducedMotion}
          onSelect={() => onSelect(room.id)}
          onAcknowledge={() => onAcknowledge(room.id)}
          onFlagFalseAlarm={() => onFlagFalseAlarm(room.id)}
          onResolve={() => onResolve(room.id)}
        />
      ))}
    </div>
  );
}
