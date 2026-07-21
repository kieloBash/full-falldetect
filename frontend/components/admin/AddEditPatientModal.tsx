import { COPY } from "@/lib/admin/constants";
import type { PatientFormValues } from "@/lib/admin/types";
import { ModalShell } from "./ModalShell";
import { ModalCheckboxField } from "./fields/ModalCheckboxField";
import { ModalSelectField } from "./fields/ModalSelectField";
import { ModalTextareaField } from "./fields/ModalTextareaField";
import { ModalTextField } from "./fields/ModalTextField";

export interface AddEditPatientModalProps {
  values: PatientFormValues;
  roomOptions: { value: string; label: string }[];
  onFieldChange: <K extends keyof PatientFormValues>(key: K, value: PatientFormValues[K]) => void;
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

/** Add/edit patient modal: name, room assignment (or unassigned), care notes, and — when editing — a discharge toggle. */
export function AddEditPatientModal({ values, roomOptions, onFieldChange, isEditing, onCancel, onSave, saving }: AddEditPatientModalProps) {
  return (
    <ModalShell
      title={isEditing ? COPY.patient.modalTitleEdit : COPY.patient.modalTitleAdd}
      widthClassName="w-[460px]"
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={`h-10 rounded-lg px-[18px] text-[13.5px] font-semibold text-white ${saving ? "cursor-wait bg-teal-700" : "cursor-pointer bg-teal-600 hover:bg-teal-700"}`}
          >
            {isEditing ? COPY.patient.modalSaveEdit : COPY.patient.modalSaveAdd}
          </button>
        </>
      }
    >
      <ModalTextField id="patient-name" label="Patient name" value={values.name} onChange={(v) => onFieldChange("name", v)} placeholder="e.g. Eleanor Voss" />

      <ModalSelectField
        id="patient-room"
        label="Room assignment"
        value={values.roomId}
        options={[{ value: "", label: "Unassigned" }, ...roomOptions]}
        onChange={(v) => onFieldChange("roomId", v)}
      />

      <ModalTextareaField
        id="patient-notes"
        label="Notes"
        value={values.notes}
        onChange={(v) => onFieldChange("notes", v)}
        placeholder="Care notes, mobility level, allergies…"
      />

      {isEditing && (
        <ModalCheckboxField id="patient-discharged" checked={values.discharged} onChange={(v) => onFieldChange("discharged", v)}>
          {COPY.patient.dischargeCheckboxLabel}
        </ModalCheckboxField>
      )}
    </ModalShell>
  );
}
