import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  /** Extra content next to the label, e.g. a "Forgot password?" link. */
  labelRight?: ReactNode;
  /** Show the eye toggle to reveal/hide the value (the login field has it; register's doesn't). */
  visibilityToggle?: {
    visible: boolean;
    onToggle: () => void;
  };
}

/** Labeled password input, with an optional show/hide toggle and an optional inline error. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  labelRight,
  visibilityToggle,
}: PasswordFieldProps) {
  return (
    <div>
      <div className="mb-[6px] flex items-center justify-between">
        <label htmlFor={id} className="text-[12.5px] font-semibold text-slate-700">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visibilityToggle?.visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-11 w-full rounded-[9px] border border-slate-200 bg-slate-50 px-[14px] text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-[3px] focus:ring-teal-600/15 ${
            visibilityToggle ? "pr-10" : ""
          }`}
        />
        {visibilityToggle && (
          <button
            type="button"
            onClick={visibilityToggle.onToggle}
            title={visibilityToggle.visible ? "Hide password" : "Show password"}
            className="absolute right-[10px] top-1/2 flex h-[26px] w-[26px] -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <Icon name={visibilityToggle.visible ? "eyeOff" : "eye"} size={16} />
          </button>
        )}
      </div>
      {error && <div className="mt-[7px] text-[12.5px] font-medium text-red-600">{error}</div>}
    </div>
  );
}
