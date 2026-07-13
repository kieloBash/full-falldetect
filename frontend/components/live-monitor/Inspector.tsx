import type { ActivityItem, Room } from "@/lib/live-monitor/types";
import { InspectorRoomDetail } from "./InspectorRoomDetail";
import { InspectorSummary } from "./InspectorSummary";

export interface InspectorProps {
  room: Room | null;
  floorLabel: string;
  pinned: boolean;
  activeCount: number;
  clearCount: number;
  activity: ActivityItem[];
  now: number;
  onClose: () => void;
  onAcknowledge: () => void;
  onFlagFalseAlarm: () => void;
  onResolve: () => void;
  onReconnect: () => void;
  onLiveView: () => void;
  onTogglePin: () => void;
}

/** Right sidebar: shift summary + quick guide when idle, room detail + actions when a room is selected. */
export function Inspector({ room, activeCount, clearCount, activity, ...detailProps }: InspectorProps) {
  if (!room) {
    return <InspectorSummary activeCount={activeCount} clearCount={clearCount} activity={activity} />;
  }
  return <InspectorRoomDetail room={room} {...detailProps} />;
}
