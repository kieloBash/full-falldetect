// location: frontend/components/alert-sound/EnableSoundBar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons/Icon";
import { COPY } from "@/lib/alert-sound/constants";

export interface EnableSoundBarProps {
  onEnable: () => void;
}

/** Shown while the browser is blocking audio (e.g. after a page refresh). */
export function EnableSoundBar({ onEnable }: EnableSoundBarProps) {
  return (
    <div
      role="status"
      data-testid="enable-sound-bar"
      className="flex flex-none items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2 text-amber-900"
    >
      <Icon name="volumeOff" size={17} />
      <div className="min-w-0 flex-1 text-[13px]">
        <span className="font-semibold">{COPY.enableTitle}.</span> {COPY.enableBody}
      </div>
      <Button size="sm" onClick={onEnable}>
        {COPY.enableButton}
      </Button>
    </div>
  );
}
