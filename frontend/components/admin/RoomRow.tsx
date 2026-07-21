import { COPY, ROOM_TABLE_GRID_COLS } from "@/lib/admin/constants";
import type { AdminRoom } from "@/lib/admin/types";
import { Icon } from "@/components/icons/Icon";
import { SensorStatusPill } from "./SensorStatusPill";

export interface RoomRowProps {
  room: AdminRoom;
  onEdit: () => void;
  onRemove: () => void;
}

/** One row in the rooms table: room number, resident (or "Vacant"), sensor id, status pill, edit/remove actions. */
export function RoomRow({ room, onEdit, onRemove }: RoomRowProps) {
  return (
    <div className={`grid min-w-[560px] ${ROOM_TABLE_GRID_COLS} items-center border-b border-slate-100 px-[14px] py-3 text-[13.5px] font-medium`}>
      <div className="font-semibold">{room.room}</div>
      <div className={room.resident ? "text-slate-900" : "text-slate-400"}>{room.resident || COPY.vacant}</div>
      <div className="text-[12.5px] text-slate-500">{room.sensorId}</div>
      <div>
        <SensorStatusPill status={room.status} />
      </div>
      <div className="flex justify-end gap-[6px]">
        <button
          type="button"
          onClick={onEdit}
          title="Edit room"
          className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <Icon name="edit" size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove room"
          className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-red-600 hover:bg-red-50"
        >
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}
