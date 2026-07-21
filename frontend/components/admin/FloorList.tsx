import type { Floor } from "@/lib/admin/types";
import { FloorCard } from "./FloorCard";

export interface FloorListItem {
  floor: Floor;
  roomCount: number;
  onlineCount: number;
  dotClass: string;
}

export interface FloorListProps {
  floors: Floor[];
  floorCards: FloorListItem[];
  selectedFloorId: string | null;
  onSelectFloor: (id: string) => void;
}

/** Left pane: every floor as a selectable card. */
export function FloorList({ floorCards, selectedFloorId, onSelectFloor }: FloorListProps) {
  return (
    <div className="w-[300px] flex-none overflow-y-auto border-r border-slate-200 bg-white p-[14px]">
      {floorCards.map(({ floor, roomCount, onlineCount, dotClass }) => (
        <FloorCard
          key={floor.id}
          floor={floor}
          roomCount={roomCount}
          onlineCount={onlineCount}
          dotClass={dotClass}
          selected={floor.id === selectedFloorId}
          onSelect={() => onSelectFloor(floor.id)}
        />
      ))}
    </div>
  );
}
