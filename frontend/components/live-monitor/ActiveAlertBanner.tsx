import { Icon } from "@/components/icons/Icon";

export interface ActiveAlertBannerProps {
  activeCount: number;
  reducedMotion: boolean;
  onJumpToAlert: () => void;
}

/**
 * Sticky, unmissable banner shown whenever any fall is live on the current
 * floor. Alert red appears nowhere else in the UI so its presence here is
 * unambiguous. `reducedMotion` swaps the flashing background for a static one.
 */
export function ActiveAlertBanner({ activeCount, reducedMotion, onJumpToAlert }: ActiveAlertBannerProps) {
  if (activeCount === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex h-11 flex-none items-center justify-between bg-red-600 px-5 text-white ${reducedMotion ? "" : "animate-fd-banner"}`}
    >
      <div className="flex items-center gap-[10px]">
        <Icon name="alert" size={18} className="text-white" strokeWidth={2.4} />
        <span className="text-sm font-semibold">
          {activeCount} active {activeCount === 1 ? "fall" : "falls"} — respond now
        </span>
      </div>
      <button
        type="button"
        onClick={onJumpToAlert}
        className="rounded-[7px] border border-white/50 bg-white/[.14] px-3 py-[5px] text-[12.5px] font-semibold text-white hover:bg-white/[.26]"
      >
        View alert →
      </button>
    </div>
  );
}
