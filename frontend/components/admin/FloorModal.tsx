// location: frontend/components/admin/FloorModal.tsx
import { COPY } from "@/lib/admin/constants";
import { ModalShell } from "./ModalShell";
import { ModalTextField } from "./fields/ModalTextField";

export interface FloorModalProps {
  isEditing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

/** Add floor / rename floor modal. Replaces AddFloorModal. */
export function FloorModal({ isEditing, name, onNameChange, error, onCancel, onSave, saving }: FloorModalProps) {
  return (
    <ModalShell
      title={isEditing ? COPY.floor.modalTitleEdit : COPY.floor.modalTitle}
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
            {isEditing ? COPY.floor.modalSaveEdit : COPY.floor.addFloor}
          </button>
        </>
      }
    >
      <ModalTextField id="floor-name" label="Floor name" value={name} onChange={onNameChange} placeholder="e.g. 4" />
    </ModalShell>
  );
}
