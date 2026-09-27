// location: frontend/components/admin/AddEditRoomModal.tsx
import { COPY } from "@/lib/admin/constants";
import type { Floor, RoomFormValues } from "@/lib/admin/types";
import { ModalShell } from "./ModalShell";
import { ModalSelectField } from "./fields/ModalSelectField";
import { ModalTextField } from "./fields/ModalTextField";

export interface AddEditRoomModalProps {
  values: RoomFormValues;
  floors: Floor[];
  onFieldChange: <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => void;
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error?: string | null;
}

/**
 * Add/edit room modal: room number + sensor/device id, and which floor it
 * belongs to. The Sensor ID is saved as Sensor.deviceId and must match the
 * camera's ID in backend/.env CAMERA_ID_MAP (e.g. CAM-201), or alerts from that
 * camera won't reach this room. Patient assignment happens in Patient Management.
 */
export function AddEditRoomModal({ values, floors, onFieldChange, isEditing, onCancel, onSave, saving, error }: AddEditRoomModalProps) {
  return (
    <ModalShell
      title={isEditing ? COPY.room.modalTitleEdit : COPY.room.modalTitleAdd}
      widthClassName="w-[440px]"
      onClose={onCancel}
      error={error}
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
            {isEditing ? COPY.room.modalSaveEdit : COPY.room.modalSaveAdd}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalTextField id="room-number" label="Room number" value={values.room} onChange={(v) => onFieldChange("room", v)} placeholder="204" />
        <ModalTextField
          id="room-sensor-id"
          label="Sensor / device ID"
          value={values.sensorId}
          onChange={(v) => onFieldChange("sensorId", v)}
          placeholder="CAM-204"
        />
      </div>
      <ModalSelectField
        id="room-floor"
        label="Floor"
        value={values.floorId}
        options={floors.map((f) => ({ value: f.id, label: f.name }))}
        onChange={(v) => onFieldChange("floorId", v)}
      />
    </ModalShell>
  );
}
