// location: frontend/components/alert-sound/SilenceButton.tsx
"use client";

import { Icon } from "@/components/icons/Icon";
import { COPY } from "@/lib/alert-sound/constants";

export interface SilenceButtonProps {
  ringing: boolean;
  snoozed: boolean;
  secondsLeft: number;
  onSilence: () => void;
}

/**
 * Replaces the old Mute toggle. The alarm can't be muted permanently: this
 * silences it for 30 s, then it rings again until someone acts on the alert.
 */
export function SilenceButton({ ringing, snoozed, secondsLeft, onSilence }: SilenceButtonProps) {
  return (
    <button
      type="button"
      onClick={onSilence}
      disabled={!ringing || snoozed}
      title={ringing ? COPY.silenceTitle : "No active alarm"}
      data-testid="silence-alarm"
      className={`flex h-9 items-center gap-[6px] rounded-lg border px-[10px] text-xs font-semibold ${
        ringing && !snoozed
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-400"
      }`}
    >
      <Icon name={snoozed ? "volumeOff" : "volume"} size={16} />
      {snoozed ? COPY.silenced(secondsLeft) : COPY.silence}
    </button>
  );
}
