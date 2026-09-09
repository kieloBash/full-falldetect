import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { Room } from "@/lib/live-monitor/types";

export interface FallAlertModalProps {
    /** Number of falls currently active. Modal is hidden when this is 0. */
    activeCount: number;
    /** Room/patient label for the most recent (or first) active fall, e.g. "Room 214 — J. Alvarez" */
    alertLabel?: string;
    /** Matches ActiveAlertBanner's prop: swaps pulsing/flashing for a static style */
    reducedMotion: boolean;
    /** Called when the user clicks "View alert" — jump to the camera/room */
    onJumpToAlert: () => void;
    /** Called when the user dismisses/acknowledges without jumping */
    onDismiss: () => void;
    /** Optional: play a chime when a new fall appears. Defaults to true. */
    playSound?: boolean;
    activeRoom?: Room | null;
}

/**
 * Full-screen, center-of-attention popup shown the moment a fall is
 * detected. Unlike the slim sticky ActiveAlertBanner, this is meant to
 * physically interrupt whoever is looking at the screen — dimmed backdrop,
 * large pulsing card, optional chime. Pairs with ActiveAlertBanner (which
 * can stay visible underneath/after this is dismissed) rather than
 * replacing it.
 */
export function FallAlertModal({
    activeCount,
    activeRoom,
    alertLabel,
    reducedMotion,
    onJumpToAlert,
    onDismiss,
    playSound = true,
}: FallAlertModalProps) {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastCountRef = useRef(0);

    // Play a short chime whenever the active count goes up (new fall detected)
    useEffect(() => {
        if (!playSound) return;
        if (activeCount > lastCountRef.current) {
            try {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctx) {
                    const ctx = audioCtxRef.current ?? new Ctx();
                    audioCtxRef.current = ctx;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.5);
                }
            } catch {
                // Audio not available/blocked — fail silently, visuals still work
            }
        }
        lastCountRef.current = activeCount;
    }, [activeCount, playSound]);

    // Let Escape dismiss, but don't let background scroll while it's open
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
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
        >
            <div
                className={`relative mx-4 w-full max-w-[420px] overflow-hidden rounded-2xl border-4 border-white bg-red-600 text-white shadow-2xl ${reducedMotion ? "" : "animate-fd-modal-pulse"
                    }`}
            >
                {/* Icon + heading */}
                <div className="flex flex-col items-center gap-3 px-7 pt-8 pb-6 text-center">
                    <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ${reducedMotion ? "" : "animate-fd-modal-ring"
                            }`}
                    >
                        <Icon name="alert" size={34} className="text-white" strokeWidth={2.4} />
                    </div>
                    <h2 className="text-xl font-bold leading-tight">
                        {activeCount === 1 ? "Fall detected" : `${activeCount} falls detected`}
                    </h2>
                    {activeRoom && (
                        <p className="text-sm font-medium text-white/90">
                            Room {activeRoom.label} — {activeRoom.resident}
                        </p>
                    )}

                    {activeRoom?.confidence != null && (
                        <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold text-white">
                            AI confidence: {Math.round(activeRoom.confidence)}%
                        </span>
                    )}

                    <p className="text-[13px] text-white/80">
                        Respond now to acknowledge and view the live feed.
                    </p>
                    {activeRoom?.screenshotPath && (
                        <div className="px-5 pb-4">
                            <div className="mb-[6px] text-[10px] font-semibold uppercase tracking-[.06em] text-white/60">
                                Detection snapshot
                            </div>
                            <a
                                href={`/${activeRoom.screenshotPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <img
                                    src={`/${activeRoom.screenshotPath}`}
                                    alt="Fall detection screenshot"
                                    className="w-full rounded-[8px] border-2 border-white/20 object-cover"
                                    style={{ maxHeight: 180 }}
                                />
                                <p className="mt-1 text-center text-[10px] text-white/50">
                                    Tap to open full image
                                </p>
                            </a>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-white/20 bg-black/10 px-5 py-4">
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="flex-1 rounded-[9px] border border-white/40 bg-white/[.08] px-3 py-[10px] text-[13.5px] font-semibold text-white hover:bg-white/[.18]"
                    >
                        Dismiss
                    </button>
                    <button
                        type="button"
                        onClick={onJumpToAlert}
                        className="flex-[1.4] rounded-[9px] bg-white px-3 py-[10px] text-[13.5px] font-bold text-red-600 hover:bg-white/90"
                    >
                        View alert →
                    </button>
                </div>
            </div>
        </div>
    );
}