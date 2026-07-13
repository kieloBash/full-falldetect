import type { ReactNode } from "react";
import type { ActivityItem } from "@/lib/live-monitor/types";

export interface InspectorSummaryProps {
  activeCount: number;
  clearCount: number;
  activity: ActivityItem[];
}

const QUICK_GUIDE: { step: string; bgClass: string; textClass: string; content: ReactNode }[] = [
  {
    step: "1",
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
    content: (
      <>
        Acknowledge within 10 s — press <b className="text-slate-900">A</b> on the selected room.
      </>
    ),
  },
  {
    step: "2",
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
    content: (
      <>
        Respond, then <b className="text-slate-900">Mark resolved</b> with an outcome.
      </>
    ),
  },
  {
    step: "3",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    content: (
      <>
        Not a real fall? <b className="text-slate-900">Flag false alarm</b> (press <b className="text-slate-900">F</b>).
      </>
    ),
  },
];

/** Inspector content shown when no room is selected: shift stats, response guide, activity feed. */
export function InspectorSummary({ activeCount, clearCount, activity }: InspectorSummaryProps) {
  return (
    <div className="p-5">
      <div className="mb-[14px] text-[13px] font-semibold text-slate-600">Shift summary</div>

      <div className="grid grid-cols-2 gap-[10px]">
        <div className={`rounded-[10px] border p-[14px] ${activeCount > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
          <div className={`text-[26px] font-bold ${activeCount > 0 ? "text-red-600" : "text-slate-900"}`}>{activeCount}</div>
          <div className="mt-[2px] text-[11.5px] font-medium text-slate-600">Active {activeCount === 1 ? "fall" : "falls"}</div>
        </div>
        <div className="rounded-[10px] border border-slate-200 p-[14px]">
          <div className="text-[26px] font-bold text-slate-900">{clearCount}</div>
          <div className="mt-[2px] text-[11.5px] font-medium text-slate-600">Residents clear</div>
        </div>
      </div>

      <div className="mb-[10px] mt-[22px] text-[11px] font-semibold uppercase tracking-[.05em] text-slate-400">Quick response guide</div>
      <div className="flex flex-col gap-[9px]">
        {QUICK_GUIDE.map((g) => (
          <div key={g.step} className="flex items-start gap-[10px]">
            <span
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${g.bgClass} ${g.textClass}`}
            >
              {g.step}
            </span>
            <span className="text-[12.5px] leading-relaxed text-slate-600">{g.content}</span>
          </div>
        ))}
      </div>

      <div className="mb-[10px] mt-[22px] text-[11px] font-semibold uppercase tracking-[.05em] text-slate-400">Recent activity</div>
      <div>
        {activity.map((a) => (
          <div key={a.id} className="flex items-start gap-[10px] border-b border-slate-100 py-[9px]">
            <span className={`mt-[5px] h-[7px] w-[7px] flex-none rounded-full ${a.color}`} />
            <div>
              <div className="text-[12.5px] font-medium leading-snug text-slate-900">{a.text}</div>
              <div className="mt-[1px] text-[11px] text-slate-400">{a.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
