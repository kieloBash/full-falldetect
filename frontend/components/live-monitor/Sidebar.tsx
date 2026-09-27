// location: frontend/components/live-monitor/Sidebar.tsx
"use client";

import Link from "next/link";
import { COPY, STATE_DOT_CLASS } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { effState } from "@/lib/live-monitor/utils";
import { useProfileMe } from "@/lib/auth/queries";
import { Icon } from "@/components/icons/Icon";

export interface SidebarProps {
  pinnedRooms: Room[];
  onSelectPinnedRoom: (room: Room) => void;
  onUnpin: (id: string) => void;
}

/**
 * Navigation + pinned residents. Nurses see Live Monitor only; administrators
 * also get a link back to Administration (role from GET /api/me).
 * Pinned residents from every floor are listed; clicking one switches floors.
 */
export function Sidebar({ pinnedRooms, onSelectPinnedRoom, onUnpin }: SidebarProps) {
  const { data: me } = useProfileMe();

  return (
    <aside className="flex w-[240px] flex-none flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-[2px] p-3">
        <div className="flex items-center gap-[11px] rounded-lg bg-teal-100 px-[11px] py-[9px] text-[13.5px] font-semibold text-teal-700">
          <Icon name="grid" size={18} />
          Live Monitor
        </div>
        {me?.role === "ADMIN" && (
          <Link
            href="/admin"
            data-testid="nav-admin"
            className="flex items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-[13.5px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="settings" size={18} />
            Administration
          </Link>
        )}
      </nav>

      <div className="mx-4 h-px bg-slate-200" />

      <div className="p-4">
        <div className="mb-[10px] text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Pinned residents</div>
        <div className="flex flex-col gap-[3px]">
          {pinnedRooms.map((room) => (
            <div key={room.id} className="-mx-[6px] flex items-center gap-[9px] rounded-[7px] px-[6px] py-1 hover:bg-slate-50">
              <div onClick={() => onSelectPinnedRoom(room)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-[9px]">
                <div className="relative flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-teal-600">
                  {room.initials}
                  <span
                    className={`absolute -bottom-px -right-px h-2 w-2 rounded-full border-[1.5px] border-white ${STATE_DOT_CLASS[effState(room)]}`}
                  />
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-slate-600">
                  {room.resident}
                  <span className="font-normal text-slate-400"> · {room.label}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUnpin(room.id)}
                title="Unpin"
                className="flex h-5 w-5 flex-none items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          ))}
          {pinnedRooms.length === 0 && <div className="text-xs text-slate-400">{COPY.noPinnedSide}</div>}
        </div>
      </div>
    </aside>
  );
}
