"use client";

import type { RefObject } from "react";
import { COPY } from "@/lib/live-monitor/constants";
import type { FloorId } from "@/lib/live-monitor/types";
import { Icon } from "@/components/icons/Icon";

export interface TopBarProps {
  floor: FloorId;
  query: string;
  onQueryChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  muted: boolean;
  onToggleMuted: () => void;
  onSimulateFall: () => void;
  onlineCount: number;
  totalCount: number;
  anySensorDown: boolean;
}

/** Global chrome: brand, breadcrumb, search (press `/` to focus), demo trigger, mute, sensor health, user menu. */
export function TopBar({
  floor,
  query,
  onQueryChange,
  searchInputRef,
  muted,
  onToggleMuted,
  onSimulateFall,
  onlineCount,
  totalCount,
  anySensorDown,
}: TopBarProps) {
  return (
    <header className="z-30 flex h-[60px] flex-none items-center gap-5 border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-[10px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-teal-600">
          <Icon name="shield" size={17} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">{COPY.productName}</span>
      </div>

      <div className="flex items-center gap-[7px] text-[13px] text-slate-400">
        <span>{COPY.breadcrumbBase}</span>
        <span>&rsaquo;</span>
        <span className="font-medium text-slate-600">Floor {floor}</span>
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
        <button
          type="button"
          onClick={onSimulateFall}
          title="Demo: trigger a simulated fall"
          className="flex items-center gap-[6px] rounded-lg border-[1.5px] border-dashed border-teal-600 bg-teal-50 px-3 py-[7px] text-[12.5px] font-semibold text-teal-700 hover:bg-teal-100"
        >
          <Icon name="play" size={13} fill="currentColor" strokeWidth={0} />
          {COPY.simulateFallLabel}
        </button>

        <div className="h-[26px] w-px bg-slate-200" />

        <button
          type="button"
          onClick={onToggleMuted}
          title={muted ? "Unmute alerts" : "Mute alerts"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <Icon name={muted ? "volumeOff" : "volume"} size={17} />
        </button>

        <div
          title="Sensor health"
          className="flex items-center gap-[6px] rounded-lg border border-slate-200 bg-white px-[10px] py-[7px] text-xs font-semibold text-slate-600"
        >
          <span className={`h-[7px] w-[7px] rounded-full ${anySensorDown ? "bg-amber-600" : "bg-green-600"}`} />
          {onlineCount}/{totalCount} online
        </div>

        <button
          type="button"
          title="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <Icon name="bell" size={17} />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">DO</div>
      </div>
    </header>
  );
}
