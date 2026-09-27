// location: frontend/components/live-monitor/FallAlertModal.tsx
"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import type { Room } from "@/lib/live-monitor/types";
import { resolveScreenshotSrc } from "@/lib/detection-node/utils";

export interface FallAlertModalProps {
  /** Active (unacknowledged) falls on ALL floors. The modal is hidden when 0. */
  activeCount: number;
  /** The oldest active fall (current floor first). */
  activeRoom: Room | null;
  reducedMotion: boolean;
  /** Switch to the room's floor and select it. */
  onJumpToAlert: () => void;
  /** Acknowledge the shown room directly (stops the alarm if it's the last active fall). */
  onAcknowledge: () => void;
  /** Hide the pop-up. The alarm keeps sounding until someone acts. */
  onDismiss: () => void;
}

/**
 * Full-screen pop-up shown when a fall is detected on any floor. It no longer
 * plays its own chime: the looping alarm lives in `useAlertSound` and keeps
 * ringing until every active fall is acknowledged, resolved or flagged.
 */
export function FallAlertModal({ activeCount, activeRoom, reducedMotion, onJumpToAlert, onAcknowledge, onDismiss }: FallAlertModalProps) {
  const screenshotSrc = resolveScreenshotSrc(activeRoom?.screenshotPath);

  // Escape hides the pop-up; stop the page scrolling behind it.
  useEffect(() => {
    if (activeCount === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeCount, onDismiss]);

  if (activeCount === 0) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Fall detected"
      data-testid="fall-alert-modal"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
    >
      <div
        className={`relative mx-4 w-full max-w-[440px] overflow-hidden rounded-2xl border-4 border-white bg-red-600 text-white shadow-2xl ${
          reducedMotion ? "" : "animate-fd-modal-pulse"
        }`}
      >
        <div className="flex flex-col items-center gap-3 px-7 pt-8 pb-6 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ${reducedMotion ? "" : "animate-fd-modal-ring"}`}
          >
            <Icon name="alert" size={34} className="text-white" strokeWidth={2.4} />
          </div>
          <h2 className="text-xl font-bold leading-tight">
            {activeCount === 1 ? "Fall detected" : `${activeCount} falls detected`}
          </h2>
          {activeRoom && (
            <p className="text-sm font-medium text-white/90">
              Floor {activeRoom.floor.label} · Room {activeRoom.label} — {activeRoom.resident}
            </p>
          )}

          {activeRoom?.confidence != null && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold text-white">
              AI confidence: {Math.round(activeRoom.confidence)}%
            </span>
          )}

          {screenshotSrc && (
            <a href={screenshotSrc} target="_blank" rel="noreferrer" className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, not optimizable */}
              <img
                src={screenshotSrc}
                alt={`Fall screenshot, Room ${activeRoom?.label}`}
                className="w-full rounded-[8px] border-2 border-white/20 object-cover"
                style={{ maxHeight: 180 }}
              />
            </a>
          )}

          <p className="text-[12.5px] text-white/80">The alarm keeps sounding until someone acknowledges the fall.</p>
        </div>

        <div className="flex gap-2 border-t border-white/20 bg-black/10 px-5 py-4">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-[9px] border border-white/40 bg-white/[.08] px-3 py-[10px] text-[13.5px] font-semibold text-white hover:bg-white/[.18]"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={onJumpToAlert}
            className="flex-1 rounded-[9px] border border-white/40 bg-white/[.08] px-3 py-[10px] text-[13.5px] font-semibold text-white hover:bg-white/[.18]"
          >
            View room
          </button>
          <button
            type="button"
            onClick={onAcknowledge}
            data-testid="modal-acknowledge"
            className="flex-[1.3] rounded-[9px] bg-white px-3 py-[10px] text-[13.5px] font-bold text-red-600 hover:bg-white/90"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
