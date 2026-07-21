import { COPY } from "@/lib/admin/constants";
import { ModalShell } from "./ModalShell";
import { ModalTextField } from "./fields/ModalTextField";

export interface AddFloorModalProps {
  name: string;
  onNameChange: (value: string) => void;
  wing: string;
  onWingChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

/** "Add floor" modal: floor name + wing. */
export function AddFloorModal({ name, onNameChange, wing, onWingChange, onCancel, onSave, saving }: AddFloorModalProps) {
  return (
    <ModalShell
      title={COPY.floorModalTitle}
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
            {COPY.addFloor}
          </button>
        </>
      }
    >
      <ModalTextField id="floor-name" label="Floor name" value={name} onChange={onNameChange} placeholder="e.g. Floor 4" />
      {/* <ModalTextField id="floor-wing" label="Wing" value={wing} onChange={onWingChange} placeholder="e.g. Sunrise Wing" /> */}
    </ModalShell>
  );
}
