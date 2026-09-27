// location: frontend/components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MONITORING_NAV, ADMIN_ROUTES } from "@/lib/admin/constants";
import { Icon } from "@/components/icons/Icon";

/**
 * Admin section nav: Monitoring (Live Monitor) and Administration (Floor, Room,
 * Patient and User Management, Camera Laptops). Active state comes from
 * `usePathname()` against `ADMIN_ROUTES`. Only working pages are listed.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[240px] flex-none flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-[2px] p-3">
        <div className="px-[11px] pb-2 pt-[6px] text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Monitoring</div>
        {ADMIN_MONITORING_NAV.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        ))}

        <div className="px-[11px] pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Administration</div>
        {ADMIN_ROUTES.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`flex items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] ${
                active ? "bg-teal-100 font-semibold text-teal-700" : "font-medium text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
