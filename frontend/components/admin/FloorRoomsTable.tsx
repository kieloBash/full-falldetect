import { COPY, FLOOR_ROOMS_GRID_COLS } from "@/lib/admin/constants";
import type { Patient, Room } from "@/lib/admin/types";
import { SensorStatusPill } from "./SensorStatusPill";

export interface FloorRoomsTableRow {
  room: Room;
  patient: Patient | null;
}

export interface FloorRoomsTableProps {
  rows: FloorRoomsTableRow[];
}

/**
 * Read-only room summary for the selected floor (Room/Resident/Sensor ID/
 * Status, no actions) — room CRUD lives entirely on `/admin/rooms` now.
 */
export function FloorRoomsTable({ rows }: FloorRoomsTableProps) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white">
      <div
        className={`grid min-w-[480px] ${FLOOR_ROOMS_GRID_COLS} border-b border-slate-200 bg-slate-50 px-[14px] py-[10px] text-[11px] font-semibold uppercase tracking-[.04em] text-slate-400`}
      >
        <div>Room</div>
        <div>Resident</div>
        <div>Sensor ID</div>
        <div>Status</div>
      </div>

      {rows.map(({ room, patient }) => (
        <div
          key={room.id}
          className={`grid min-w-[480px] ${FLOOR_ROOMS_GRID_COLS} items-center border-b border-slate-100 px-[14px] py-3 text-[13.5px] font-medium`}
        >
          <div className="font-semibold">{room.room}</div>
          <div className={patient ? "text-slate-900" : "text-slate-400"}>{patient ? patient.name : COPY.vacant}</div>
          <div className="text-[12.5px] text-slate-500">{room.sensorId}</div>
          <div>
            <SensorStatusPill status={room.status} />
          </div>
        </div>
      ))}

      {rows.length === 0 && <div className="px-4 py-10 text-center text-[13.5px] font-medium text-slate-400">{COPY.floor.noRooms}</div>}
    </div>
  );
}
