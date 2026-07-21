import { COPY, SENSOR_STATUS_OPTIONS } from "@/lib/admin/constants";
import type { RoomFormValues } from "@/lib/admin/types";
import { ModalShell } from "./ModalShell";
import { ModalSelectField } from "./fields/ModalSelectField";
import { ModalTextField } from "./fields/ModalTextField";

export interface AddEditRoomModalProps {
  values: RoomFormValues;
  onFieldChange: <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => void;
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

/** Add/edit room modal: room number + sensor id, optional resident, sensor status. */
export function AddEditRoomModal({ values, onFieldChange, isEditing, onCancel, onSave, saving }: AddEditRoomModalProps) {
  return (
    <ModalShell
      title={isEditing ? COPY.roomModalTitleEdit : COPY.roomModalTitleAdd}
      widthClassName="w-[440px]"
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
            {isEditing ? COPY.roomModalSaveEdit : COPY.roomModalSaveAdd}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalTextField id="room-number" label="Room number" value={values.room} onChange={(v) => onFieldChange("room", v)} placeholder="204" />
        <ModalTextField
          id="room-sensor-id"
          label="Sensor ID"
          value={values.sensorId}
          onChange={(v) => onFieldChange("sensorId", v)}
          placeholder="SNR-204"
        />
      </div>
      <ModalTextField
        id="room-resident"
        label="Resident (optional)"
        value={values.resident}
        onChange={(v) => onFieldChange("resident", v)}
        placeholder="Leave blank if vacant"
      />
      <ModalSelectField
        id="room-status"
        label="Sensor status"
        value={values.status}
        options={SENSOR_STATUS_OPTIONS}
        onChange={(v) => onFieldChange("status", v)}
      />
    </ModalShell>
  );
}
