"use client";

import { usePathname } from "next/navigation";
import { ADMIN_ROUTES, COPY } from "@/lib/admin/constants";
import { COPY as LIVE_MONITOR_COPY } from "@/lib/live-monitor/constants";
import { Icon } from "@/components/icons/Icon";

/** Global chrome for the Admin section: brand, "Admin" badge, breadcrumb (label derived from the current route), help, user menu. */
export function AdminTopBar() {
  const pathname = usePathname();
  const activeLabel = ADMIN_ROUTES.find((r) => r.path === pathname)?.label ?? COPY.badge;

  return (
    <header className="z-30 flex h-[60px] flex-none items-center gap-5 border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-[10px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-teal-600">
          <Icon name="shield" size={17} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">{LIVE_MONITOR_COPY.productName}</span>
      </div>

      <span className="rounded-md bg-slate-100 px-[9px] py-[3px] text-[11px] font-semibold uppercase tracking-[.04em] text-slate-600">
        {COPY.badge}
      </span>

      <div className="flex items-center gap-[7px] text-[13px] text-slate-400">
        <span>{COPY.breadcrumbBase}</span>
        <span>&rsaquo;</span>
        <span className="font-medium text-slate-600">{activeLabel}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Help"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          ?
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">DO</div>
      </div>
    </header>
  );
}
