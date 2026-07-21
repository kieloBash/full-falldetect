import { Icon } from "@/components/icons/Icon";
import { COPY } from "@/lib/admin/constants";

export interface FloorManagementToolbarProps {
  floorCount: number;
  onAddFloor: () => void;
}

/** Page title/context + primary "Add floor" action. */
export function FloorManagementToolbar({ floorCount, onAddFloor }: FloorManagementToolbarProps) {
  return (
    <div className="flex flex-none flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="min-w-0">
        <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900">{COPY.floor.title}</h1>
        <div className="mt-[2px] text-[12.5px] text-slate-600">{COPY.floor.countLine(floorCount)}</div>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onAddFloor}
        className="flex h-[38px] items-center gap-[7px] rounded-lg bg-teal-600 px-4 text-[13.5px] font-semibold text-white hover:bg-teal-700"
      >
        <Icon name="plus" size={15} strokeWidth={2.4} />
        {COPY.floor.addFloor}
      </button>
    </div>
  );
}
