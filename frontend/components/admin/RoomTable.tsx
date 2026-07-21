import { COPY, ROOM_TABLE_GRID_COLS } from "@/lib/admin/constants";
import type { AdminFloor, AdminRoom } from "@/lib/admin/types";
import { Icon } from "@/components/icons/Icon";
import { RoomRow } from "./RoomRow";

export interface RoomTableProps {
  floor: AdminFloor;
  onAddRoom: () => void;
  onEditRoom: (room: AdminRoom) => void;
  onRemoveRoom: (roomId: string) => void;
}

/** Right pane: header + selected floor's rooms table, "Add room" action, and the empty state. */
export function RoomTable({ floor, onAddRoom, onEditRoom, onRemoveRoom }: RoomTableProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mb-[14px] flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">
            {floor.name}
            <span className="font-medium text-slate-400"> — {floor.wing}</span>
          </div>
          <div className="mt-[2px] text-[12.5px] text-slate-600">{COPY.roomTableSubtitle}</div>
        </div>
        <button
          type="button"
          onClick={onAddRoom}
          className="flex h-[34px] items-center gap-[7px] rounded-lg border border-slate-200 bg-white px-[14px] text-[13px] font-semibold text-slate-900 hover:bg-slate-50"
        >
          <Icon name="plus" size={13} strokeWidth={2.4} />
          {COPY.addRoom}
        </button>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white">
        <div
          className={`grid min-w-[560px] ${ROOM_TABLE_GRID_COLS} border-b border-slate-200 bg-slate-50 px-[14px] py-[10px] text-[11px] font-semibold uppercase tracking-[.04em] text-slate-400`}
        >
          <div>Room</div>
          <div>Resident</div>
          <div>Sensor ID</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {floor.rooms.map((room) => (
          <RoomRow key={room.id} room={room} onEdit={() => onEditRoom(room)} onRemove={() => onRemoveRoom(room.id)} />
        ))}

        {floor.rooms.length === 0 && <div className="px-4 py-10 text-center text-[13.5px] font-medium text-slate-400">{COPY.noRooms}</div>}
      </div>
    </div>
  );
}
