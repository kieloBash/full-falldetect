// location: frontend/components/live-monitor/TopBar.tsx
"use client";

import { Icon } from "@/components/icons/Icon";
import { SilenceButton } from "@/components/alert-sound/SilenceButton";
import { COPY } from "@/lib/live-monitor/constants";
import type { RefObject } from "react";
import { ProfileDropdown } from "../ui/profile-dropdown";

/**
 * The Simulate Fall button creates real incident records, so it is hidden unless
 * NEXT_PUBLIC_SHOW_SIMULATE_FALL=true (set it for testing and demos, not for a shift).
 */
const SHOW_SIMULATE_FALL = process.env.NEXT_PUBLIC_SHOW_SIMULATE_FALL === "true";

export interface TopBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  /** Creates a simulated fall in a random eligible room on the current floor. */
  onSimulateFall: () => void;
  onlineCount: number;
  totalCount: number;
  anySensorDown: boolean;
  alarm: { ringing: boolean; snoozed: boolean; secondsLeft: number; onSilence: () => void };
}

/** Global chrome: brand, search (press `/` to focus), demo trigger, silence alarm, sensor health, user menu. */
export function TopBar({
  query,
  onQueryChange,
  searchInputRef,
  onSimulateFall,
  onlineCount,
  totalCount,
  anySensorDown,
  alarm,
}: TopBarProps) {
  return (
    <header className="z-30 flex h-[60px] flex-none items-center gap-5 border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-[10px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-teal-600">
          <Icon name="shield" size={17} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">{COPY.productName}</span>
      </div>

      <div className="relative mx-auto max-w-[420px] flex-1">
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={COPY.searchPlaceholder}
          className="h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-900 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
        />
      </div>

      <div className="flex items-center gap-2">
        {SHOW_SIMULATE_FALL && (
          <button
            type="button"
            onClick={onSimulateFall}
            title="Demo: trigger a simulated fall"
            className="flex items-center gap-[6px] rounded-lg border-[1.5px] border-dashed border-teal-600 bg-teal-50 px-3 py-[7px] text-[12.5px] font-semibold text-teal-700 hover:bg-teal-100"
          >
            <Icon name="play" size={13} fill="currentColor" strokeWidth={0} />
            {COPY.simulateFallLabel}
          </button>
        )}

        <div className="h-[26px] w-px bg-slate-200" />

        <SilenceButton
          ringing={alarm.ringing}
          snoozed={alarm.snoozed}
          secondsLeft={alarm.secondsLeft}
          onSilence={alarm.onSilence}
        />

        <div
          title="Sensors online on this floor"
          className="flex items-center gap-[6px] rounded-lg border border-slate-200 bg-white px-[10px] py-[7px] text-xs font-semibold text-slate-600"
        >
          <span className={`h-[7px] w-[7px] rounded-full ${anySensorDown ? "bg-amber-600" : "bg-green-600"}`} />
          {onlineCount}/{totalCount} online
        </div>

        <ProfileDropdown />
      </div>
    </header>
  );
}
