import { SENSOR_STATUS_META } from "@/lib/admin/constants";
import type { SensorStatus } from "@/lib/admin/types";

export interface SensorStatusPillProps {
  status: SensorStatus;
}

/** Plain colored status pill used in the floor-management rooms table (no icon — distinct from Live Monitor's StatusBadge). */
export function SensorStatusPill({ status }: SensorStatusPillProps) {
  const meta = SENSOR_STATUS_META[status];
  return (
    <span
      className={`inline-block rounded-full border px-[10px] py-[3px] text-[11.5px] font-semibold ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
    >
      {meta.label}
    </span>
  );
}
