export interface TextFieldProps {
  id: string;
  label: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

/** Labeled single-line text/email input, styled to the Auth screen's 44px inputs. */
export function TextField({ id, label, type = "text", value, onChange, placeholder, autoComplete }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-[6px] block text-[12.5px] font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-[9px] border border-slate-200 bg-slate-50 px-[14px] text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-[3px] focus:ring-teal-600/15"
      />
    </div>
  );
}
