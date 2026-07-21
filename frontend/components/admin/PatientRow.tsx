import { COPY, PATIENT_TABLE_GRID_COLS } from "@/lib/admin/constants";
import type { Patient } from "@/lib/admin/types";
import { Icon } from "@/components/icons/Icon";
import { PatientStatusPill } from "./PatientStatusPill";

export interface PatientRowProps {
  patient: Patient;
  roomLabel: string;
  onEdit: () => void;
  onRemove: () => void;
}

/** One row in the Patient Management table: name, room, notes, active/discharged status, edit/remove. */
export function PatientRow({ patient, roomLabel, onEdit, onRemove }: PatientRowProps) {
  return (
    <div className={`grid min-w-[720px] ${PATIENT_TABLE_GRID_COLS} items-center border-b border-slate-100 px-4 py-3 text-[13.5px] font-medium`}>
      <div className="font-semibold">{patient.name}</div>
      <div className={patient.roomId ? "text-slate-900" : "text-slate-400"}>{roomLabel}</div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-slate-500">{patient.notes || "—"}</div>
      <div>
        <PatientStatusPill discharged={patient.discharged} />
      </div>
      <div className="flex justify-end gap-[6px]">
        <button
          type="button"
          onClick={onEdit}
          title="Edit patient"
          className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <Icon name="edit" size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title={COPY.patient.removeTooltip}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-red-600 hover:bg-red-50"
        >
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}
