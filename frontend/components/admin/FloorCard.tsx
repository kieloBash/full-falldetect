import type { AdminFloor } from "@/lib/admin/types";
import { floorStatusDotClass, onlineSensorCount } from "@/lib/admin/utils";

export interface FloorCardProps {
  floor: AdminFloor;
  selected: boolean;
  onSelect: () => void;
}

/** One entry in the left-hand floor list: name, wing, room/sensor counts, worst-status dot. */
export function FloorCard({ floor, selected, onSelect }: FloorCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`mb-2 cursor-pointer rounded-[10px] p-[14px] ${
        selected ? "border-[1.5px] border-teal-600 bg-teal-50" : "border border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[14.5px] font-semibold">{floor.name}</div>
        <span className={`h-2 w-2 flex-none rounded-full ${floorStatusDotClass(floor)}`} />
      </div>
      <div className="mt-[3px] text-[12.5px] text-slate-600">{floor.wing}</div>
      <div className="mt-[10px] flex gap-[14px]">
        <div className="text-xs font-medium text-slate-500">
          <span className="font-semibold text-slate-900">{floor.rooms.length}</span> rooms
        </div>
        <div className="text-xs font-medium text-slate-500">
          <span className="font-semibold text-slate-900">{onlineSensorCount(floor)}</span>/{floor.rooms.length} sensors online
        </div>
      </div>
    </div>
  );
}
