export interface ModalSelectFieldOption<T extends string> {
  value: T;
  label: string;
}

export interface ModalSelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: ModalSelectFieldOption<T>[];
  onChange: (value: T) => void;
}

/** Labeled select sized for this screen's compact modals (42px tall). See ModalTextField for why it's not shared with Auth's SelectField. */
export function ModalSelectField<T extends string>({ id, label, value, options, onChange }: ModalSelectFieldProps<T>) {
  return (
    <div>
      <label htmlFor={id} className="mb-[6px] block text-[12.5px] font-semibold text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-[42px] w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 bg-[length:15px] bg-[right_12px_center] bg-no-repeat px-3 pr-[30px] text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-[3px] focus:ring-teal-600/15"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><polyline points=%226 9 12 15 18 9%22/></svg>')",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
