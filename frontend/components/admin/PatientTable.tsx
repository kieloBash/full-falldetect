import { COPY, PATIENT_TABLE_GRID_COLS } from "@/lib/admin/constants";
import type { Patient } from "@/lib/admin/types";
import { PatientRow } from "./PatientRow";

export interface PatientTableRow {
  patient: Patient;
  roomLabel: string;
}

export interface PatientTableProps {
  rows: PatientTableRow[];
  onEditPatient: (patient: Patient) => void;
  onRemovePatient: (patientId: string) => void;
}

/** Every patient, their current room, notes, and active/discharged status, plus edit/remove. */
export function PatientTable({ rows, onEditPatient, onRemovePatient }: PatientTableProps) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white">
      <div
        className={`grid min-w-[720px] ${PATIENT_TABLE_GRID_COLS} border-b border-slate-200 bg-slate-50 px-4 py-[10px] text-[11px] font-semibold uppercase tracking-[.04em] text-slate-400`}
      >
        <div>Patient</div>
        <div>Room</div>
        <div>Notes</div>
        <div>Status</div>
        <div className="text-right">Actions</div>
      </div>

      {rows.map(({ patient, roomLabel }) => (
        <PatientRow
          key={patient.id}
          patient={patient}
          roomLabel={roomLabel}
          onEdit={() => onEditPatient(patient)}
          onRemove={() => onRemovePatient(patient.id)}
        />
      ))}

      {rows.length === 0 && <div className="px-4 py-10 text-center text-[13.5px] font-medium text-slate-400">{COPY.patient.noPatients}</div>}
    </div>
  );
}
