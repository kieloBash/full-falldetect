export interface ModalTextareaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Matches the design's 76px default (roughly 3 lines). */
  heightClassName?: string;
}

/** Labeled multi-line textarea, styled to match ModalTextField (used for the patient modal's care notes). */
export function ModalTextareaField({ id, label, value, onChange, placeholder, heightClassName = "h-[76px]" }: ModalTextareaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-[6px] block text-[12.5px] font-semibold text-slate-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-[10px] font-sans text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-[3px] focus:ring-teal-600/15 ${heightClassName}`}
      />
    </div>
  );
}
