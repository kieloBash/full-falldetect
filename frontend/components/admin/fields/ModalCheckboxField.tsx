import type { ReactNode } from "react";

export interface ModalCheckboxFieldProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** Labeled checkbox for admin modals (e.g. the patient modal's "Mark as discharged"). */
export function ModalCheckboxField({ id, checked, onChange, children }: ModalCheckboxFieldProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-[9px] text-[13px] font-medium text-slate-600">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 flex-none cursor-pointer accent-teal-600"
      />
      {children}
    </label>
  );
}
