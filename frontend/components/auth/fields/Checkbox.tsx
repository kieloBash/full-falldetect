import type { ReactNode } from "react";

export interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  /** "center" for a single-line label (remember me), "start" for a wrapping multi-line one (terms). */
  align?: "center" | "start";
}

/** Labeled checkbox; `children` is the clickable label content (plain text or text with inline links). */
export function Checkbox({ id, checked, onChange, children, align = "center" }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer gap-[9px] text-[12.5px] font-normal leading-relaxed text-slate-600 ${
        align === "start" ? "items-start" : "items-center text-[13px] font-medium"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 flex-none cursor-pointer accent-teal-600 ${align === "start" ? "mt-[1px]" : ""}`}
      />
      {children}
    </label>
  );
}
