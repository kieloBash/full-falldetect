import { PATIENT_STATUS_META } from "@/lib/admin/constants";

export interface PatientStatusPillProps {
  discharged: boolean;
}

/** Active/Discharged status pill for the patients table. */
export function PatientStatusPill({ discharged }: PatientStatusPillProps) {
  const meta = PATIENT_STATUS_META[discharged ? "discharged" : "active"];
  return (
    <span
      className={`inline-block rounded-full border px-[10px] py-[3px] text-[11.5px] font-semibold ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
    >
      {meta.label}
    </span>
  );
}
