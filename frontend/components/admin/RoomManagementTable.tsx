import { COPY, ROOM_MGMT_GRID_COLS } from "@/lib/admin/constants";
import type { Patient, Room } from "@/lib/admin/types";
import { RoomManagementRow } from "./RoomManagementRow";

export interface RoomManagementTableRow {
  room: Room;
  floorName: string;
  patient: Patient | null;
}

export interface RoomManagementTableProps {
  rows: RoomManagementTableRow[];
  onEditRoom: (room: Room) => void;
  onRemoveRoom: (roomId: string) => void;
}

/** Every room across every floor, with its floor and assigned patient, plus edit/remove. */
export function RoomManagementTable({ rows, onEditRoom, onRemoveRoom }: RoomManagementTableProps) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white">
      <div
        className={`grid min-w-[680px] ${ROOM_MGMT_GRID_COLS} border-b border-slate-200 bg-slate-50 px-4 py-[10px] text-[11px] font-semibold uppercase tracking-[.04em] text-slate-400`}
      >
        <div>Room</div>
        <div>Floor</div>
        <div>Assigned patient</div>
        <div>Sensor ID</div>
        <div className="text-right">Actions</div>
      </div>

      {rows.map(({ room, floorName, patient }) => (
        <RoomManagementRow
          key={room.id}
          room={room}
          floorName={floorName}
          patient={patient}
          onEdit={() => onEditRoom(room)}
          onRemove={() => onRemoveRoom(room.id)}
        />
      ))}

      {rows.length === 0 && <div className="px-4 py-10 text-center text-[13.5px] font-medium text-slate-400">{COPY.room.noRooms}</div>}
    </div>
  );
}
