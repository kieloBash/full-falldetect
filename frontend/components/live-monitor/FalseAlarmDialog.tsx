"use client";

import { useState } from "react";
import { FALSE_ALARM_REASONS } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";

export interface FalseAlarmDialogProps {
  room: Room | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * The one confirmation dialog in the flow — false-alarm dismissal requires a
 * reason so the analytics false-positive rate stays accurate. Acknowledge
 * deliberately has no such gate; it must stay one tap.
 */
export function FalseAlarmDialog({ room, onCancel, onConfirm }: FalseAlarmDialogProps) {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fa-dialog-title"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-[440px] max-w-full overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,.16)]">
        <div className="px-[22px] pb-1 pt-5">
          <div id="fa-dialog-title" className="text-[17px] font-semibold text-slate-900">
            Flag as false alarm?
          </div>
          <div className="mt-[6px] text-[13px] leading-normal text-slate-600">
            {room ? `Room ${room.label} · ${room.resident}. ` : ""}
            Select a reason to keep analytics accurate.
          </div>
        </div>

        <div className="flex flex-col gap-2 px-[22px] py-4">
          {FALSE_ALARM_REASONS.map((r) => {
            const selected = reason === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-[11px] rounded-[9px] border px-[13px] py-[11px] text-left text-[13.5px] font-medium text-slate-900 ${
                  selected ? "border-[1.5px] border-teal-600 bg-teal-50" : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`box-border h-[18px] w-[18px] flex-none rounded-full ${
                    selected ? "border-[5px] border-teal-600" : "border-2 border-slate-300"
                  }`}
                />
                {r}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-[10px] px-[22px] pb-5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason}
            onClick={() => reason && onConfirm(reason)}
            className={`h-10 rounded-lg px-4 text-[13.5px] font-semibold text-white ${
              reason ? "cursor-pointer bg-slate-600" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            Flag false alarm
          </button>
        </div>
      </div>
    </div>
  );
}
