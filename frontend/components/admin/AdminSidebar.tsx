"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MONITORING_NAV, ADMIN_ROUTES, ADMIN_SOON_NAV } from "@/lib/admin/constants";
import { Icon } from "@/components/icons/Icon";

/**
 * Admin section nav: Monitoring (Live Monitor links to the real route;
 * Incidents has no built page yet, so it's inert) and Administration
 * (Floor/Room/Patient Management are real routes — active state comes from
 * `usePathname()` against `ADMIN_ROUTES` — with Users/Settings "SOON"-badged,
 * matching the source design: not hidden, per the brief's "disabled with a
 * tooltip, never hidden silently" rule).
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[240px] flex-none flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-[2px] p-3">
        {/* <div className="px-[11px] pb-2 pt-[6px] text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Monitoring</div>
        {ADMIN_MONITORING_NAV.map((item) =>
          item.href ? (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ) : (
            <div
              key={item.key}
              title="Not built in this handoff"
              className="flex cursor-not-allowed items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </div>
          )
        )} */}

        <div className="px-[11px] pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Administration</div>
        {ADMIN_ROUTES.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`flex items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] ${active ? "bg-teal-100 font-semibold text-teal-700" : "font-medium text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}

        {ADMIN_SOON_NAV.map((item) => (
          <div
            key={item.key}
            title="Requires a future release"
            className="flex cursor-default items-center justify-between gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] font-medium text-slate-300"
          >
            <div className="flex items-center gap-[11px]">
              <Icon name={item.icon} size={18} />
              {item.label}
            </div>
            <span className="rounded-[5px] bg-slate-100 px-[6px] py-[2px] text-[9.5px] font-semibold tracking-[.04em] text-slate-400">
              SOON
            </span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
