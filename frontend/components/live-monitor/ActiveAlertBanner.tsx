// location: frontend/components/live-monitor/ActiveAlertBanner.tsx
import { Icon } from "@/components/icons/Icon";
import type { Room } from "@/lib/live-monitor/types";

export interface ActiveAlertBannerProps {
  /** Active falls on ALL floors. */
  activeCount: number;
  /** The fall the "View" button jumps to (current floor first). */
  firstRoom: Room | null;
  /** Floor currently on screen, to say when the fall is elsewhere. */
  currentFloorId: string | null;
  reducedMotion: boolean;
  /** Reopens the fall pop-up (and switches to the fall's floor). */
  onJumpToAlert: () => void;
}

/**
 * Sticky red banner shown while any fall on any floor is still unacknowledged.
 * Names the floor when the fall isn't on the floor being viewed.
 */
export function ActiveAlertBanner({ activeCount, firstRoom, currentFloorId, reducedMotion, onJumpToAlert }: ActiveAlertBannerProps) {
  if (activeCount === 0 || !firstRoom) return null;
  const elsewhere = firstRoom.floor.id !== currentFloorId;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="active-alert-banner"
      className={`flex h-11 flex-none items-center justify-between bg-red-600 px-5 text-white ${reducedMotion ? "" : "animate-fd-banner"}`}
    >
      <div className="flex items-center gap-[10px]">
        <Icon name="alert" size={18} className="text-white" strokeWidth={2.4} />
        <span className="text-sm font-semibold">
          {activeCount} active {activeCount === 1 ? "fall" : "falls"} — {elsewhere ? `Floor ${firstRoom.floor.label}, ` : ""}Room{" "}
          {firstRoom.label}
          {activeCount > 1 ? " and more" : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={onJumpToAlert}
        className="rounded-[7px] border border-white/50 bg-white/[.14] px-3 py-[5px] text-[12.5px] font-semibold text-white hover:bg-white/[.26]"
      >
        {elsewhere ? `Go to Floor ${firstRoom.floor.label} →` : "View alert →"}
      </button>
    </div>
  );
}
