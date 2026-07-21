import type { Floor } from "@/lib/admin/types";

export interface FloorCardProps {
  floor: Floor;
  roomCount: number;
  onlineCount: number;
  dotClass: string;
  selected: boolean;
  onSelect: () => void;
}

/** One entry in the left-hand floor list: name, wing, room/sensor counts, worst-status dot. */
export function FloorCard({ floor, roomCount, onlineCount, dotClass, selected, onSelect }: FloorCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`mb-2 cursor-pointer rounded-[10px] p-[14px] ${
        selected ? "border-[1.5px] border-teal-600 bg-teal-50" : "border border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[14.5px] font-semibold">{floor.name}</div>
        <span className={`h-2 w-2 flex-none rounded-full ${dotClass}`} />
      </div>
      <div className="mt-[3px] text-[12.5px] text-slate-600">{floor.wing}</div>
      <div className="mt-[10px] flex gap-[14px]">
        <div className="text-xs font-medium text-slate-500">
          <span className="font-semibold text-slate-900">{roomCount}</span> rooms
        </div>
        <div className="text-xs font-medium text-slate-500">
          <span className="font-semibold text-slate-900">{onlineCount}</span>/{roomCount} sensors online
        </div>
      </div>
    </div>
  );
}
