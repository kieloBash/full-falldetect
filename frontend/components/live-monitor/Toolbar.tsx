import { Floor } from "@/app/generated/prisma/client";
import { Icon } from "@/components/icons/Icon";
import type { FloorId, ViewMode } from "@/lib/live-monitor/types";
import { useMemo } from "react";

export interface ToolbarProps {
  floor: FloorId;
  roomCount: number;
  view: ViewMode;
  floors: Floor[];
  onFloorChange: (floor: FloorId) => void;
  onViewChange: (view: ViewMode) => void;
}

function segmentClass(active: boolean) {
  return `flex items-center gap-[6px] rounded-[7px] px-3 py-[6px] text-[13px] font-semibold ${active ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "bg-transparent text-slate-600"
    }`;
}

/** Page title/context + floor filter + Grid/Camera-wall view toggle. */
export function Toolbar({ floor, floors, roomCount, view, onFloorChange, onViewChange }: ToolbarProps) {

  const currentFloor = useMemo(() => floors.find((f) => f.id === floor), [floors, floor])

  return (
    <div className="flex flex-none flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="min-w-0">
        <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900">Live Monitor</h1>
        <div className="mt-[2px] text-[12.5px] text-slate-600">
          Evening shift · Floor {currentFloor?.label} · {roomCount} rooms monitored
        </div>
      </div>

      <div className="flex-1" />

      <select
        value={floor}
        onChange={(e) => onFloorChange(e.target.value as FloorId)}
        className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900"
      >
        {floors.map((opt) => (
          <option key={opt.id} value={opt.id}>
            Floor {opt.label}
          </option>
        ))}
      </select>

      <div className="inline-flex gap-[2px] rounded-[9px] bg-slate-100 p-[3px]">
        <button type="button" onClick={() => onViewChange("grid")} className={segmentClass(view === "grid")}>
          <Icon name="grid" size={15} />
          Grid
        </button>
        <button type="button" onClick={() => onViewChange("wall")} className={segmentClass(view === "wall")}>
          <Icon name="wall" size={15} />
          Camera wall
        </button>
      </div>
    </div>
  );
}
