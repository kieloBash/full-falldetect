export interface ModalTextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Labeled text input sized for this screen's compact modals (42px tall).
 * Visually close to Auth's TextField (same focus ring) but kept as its own
 * small component rather than shared — the two source designs use
 * slightly different input heights (42px here vs 44px in Auth), and
 * forcing them to match would drift from either handoff.
 */
export function ModalTextField({ id, label, value, onChange, placeholder }: ModalTextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-[6px] block text-[12.5px] font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-[3px] focus:ring-teal-600/15"
      />
    </div>
  );
}
