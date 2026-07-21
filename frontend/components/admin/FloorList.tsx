import type { AdminFloor } from "@/lib/admin/types";
import { FloorCard } from "./FloorCard";

export interface FloorListProps {
  floors: AdminFloor[];
  selectedFloorId: string | null;
  onSelectFloor: (id: string) => void;
}

/** Left pane: every floor as a selectable card. */
export function FloorList({ floors, selectedFloorId, onSelectFloor }: FloorListProps) {
  return (
    <div className="w-[300px] flex-none overflow-y-auto border-r border-slate-200 bg-white p-[14px]">
      {floors.map((floor) => (
        <FloorCard key={floor.id} floor={floor} selected={floor.id === selectedFloorId} onSelect={() => onSelectFloor(floor.id)} />
      ))}
    </div>
  );
}
