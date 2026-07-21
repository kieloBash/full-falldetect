import { COPY, ROOM_MGMT_GRID_COLS } from "@/lib/admin/constants";
import type { Patient, Room } from "@/lib/admin/types";
import { Icon } from "@/components/icons/Icon";

export interface RoomManagementRowProps {
  room: Room;
  floorName: string;
  patient: Patient | null;
  onEdit: () => void;
  onRemove: () => void;
}

/** One row in the Room Management table: room number, floor, assigned patient, sensor id, edit/remove actions. */
export function RoomManagementRow({ room, floorName, patient, onEdit, onRemove }: RoomManagementRowProps) {
  return (
    <div className={`grid min-w-[680px] ${ROOM_MGMT_GRID_COLS} items-center border-b border-slate-100 px-4 py-3 text-[13.5px] font-medium`}>
      <div className="font-semibold">{room.room}</div>
      <div className="text-[13px] text-slate-600">{floorName}</div>
      <div className={patient ? "text-slate-900" : "text-slate-400"}>{patient ? patient.name : COPY.unassigned}</div>
      <div className="text-[12.5px] text-slate-500">{room.sensorId}</div>
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
