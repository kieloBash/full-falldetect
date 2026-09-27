// location: frontend/components/admin/AdminTopBar.tsx
"use client";

import { Icon } from "@/components/icons/Icon";
import { ADMIN_ROUTES, COPY } from "@/lib/admin/constants";
import { COPY as LIVE_MONITOR_COPY } from "@/lib/live-monitor/constants";
import { usePathname } from "next/navigation";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";

/** Global chrome for the Admin section: brand, "Admin" badge, current page, user menu. */
export function AdminTopBar() {
  const pathname = usePathname();
  const activeLabel = ADMIN_ROUTES.find((r) => r.path === pathname)?.label;

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

      {activeLabel && <span className="text-[13px] font-medium text-slate-600">{activeLabel}</span>}

      <div className="flex-1" />

      <ProfileDropdown />
    </header>
  );
}
