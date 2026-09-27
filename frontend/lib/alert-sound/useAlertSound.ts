// location: frontend/lib/alert-sound/useAlertSound.ts
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ALERT_SOUND_URL, ALERT_SOUND_VOLUME, FALLBACK_BEEP_INTERVAL_MS, SNOOZE_MS } from "./constants";
import { createAudioContext, playFallbackBeep } from "./fallback-beep";

export interface UseAlertSoundOptions {
  /**
   * Ids of every room with an ACTIVE (not yet acknowledged) fall, on ALL floors.
   * The alarm loops while this is non-empty and stops when a nurse acknowledges,
   * resolves or flags every one of them.
   */
  activeIds: string[];
}

/**
 * Looping fall alarm for the Live Monitor.
 *
 *  - Plays ALERT_SOUND_URL (a file in `public/`) on loop while any fall is active.
 *  - "Silence" quiets it for SNOOZE_MS; it rings again if the fall is still active,
 *    and immediately if a NEW fall arrives during the silence.
 *  - Browsers block sound until the user has interacted with the page (e.g. after a
 *    refresh). `blocked` is then true so the screen can show an "Enable alert sound"
 *    bar; any click or key press anywhere unblocks it.
 *  - If the file is missing or can't be decoded, a Web Audio beep repeats instead.
 */
type UserActivation = { hasBeenActive: boolean };

function hasUserActivation(): boolean {
  const ua = (navigator as Navigator & { userActivation?: UserActivation }).userActivation;
  return ua ? ua.hasBeenActive : true; // unknown browser: rely on play() failing instead
}

function subscribeToInteraction(onChange: () => void): () => void {
  window.addEventListener("pointerdown", onChange);
  window.addEventListener("keydown", onChange);
  return () => {
    window.removeEventListener("pointerdown", onChange);
    window.removeEventListener("keydown", onChange);
  };
}

export function useAlertSound({ activeIds }: UseAlertSoundOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [fileFailed, setFileFailed] = useState(false);
  /** play() was rejected by the autoplay policy (cleared by the next click/key). */
  const [playRejected, setPlayRejected] = useState(false);
  /** Silence: until when, and which falls were active when it was pressed. */
  const [snooze, setSnooze] = useState<{ until: number; ids: Set<string> } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Has the user clicked/typed on this page yet? (Browsers block audio until then.)
  const activated = useSyncExternalStore(subscribeToInteraction, hasUserActivation, () => true);
  const blocked = !activated || playRejected;

  /* ── Create the <audio> element once; detect the autoplay block ─────── */
  useEffect(() => {
    const audio = new Audio(ALERT_SOUND_URL);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = ALERT_SOUND_VOLUME;
    const onError = () => setFileFailed(true);
    audio.addEventListener("error", onError);
    audioRef.current = audio;

    const unlock = () => {
      setPlayRejected(false);
      if (!ctxRef.current) ctxRef.current = createAudioContext();
      void ctxRef.current?.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      audio.pause();
      audio.removeEventListener("error", onError);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    };
  }, []);

  /* ── Countdown while silenced ───────────────────────────────────────── */
  useEffect(() => {
    if (!snooze) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= snooze.until) setSnooze(null);
    }, 1000);
    return () => clearInterval(id);
  }, [snooze]);

  const ringing = activeIds.length > 0;
  // A silence only covers the falls that were active when it was pressed:
  // a NEW fall rings immediately.
  const snoozed = snooze !== null && now < snooze.until && activeIds.every((id) => snooze.ids.has(id));
  const shouldPlay = ringing && !snoozed;

  /* ── Start / stop the loop ──────────────────────────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!shouldPlay) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }
    if (blocked) return; // wait for a click; the effect re-runs when unblocked

    if (!fileFailed && audio) {
      audio.play().catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") setPlayRejected(true);
        else if (name === "NotSupportedError") setFileFailed(true);
      });
      return;
    }

    // Fallback: repeat a synthesized beep.
    if (!ctxRef.current) ctxRef.current = createAudioContext();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const beep = () => {
      void ctx.resume().catch(() => undefined);
      playFallbackBeep(ctx);
    };
    beep();
    const id = setInterval(beep, FALLBACK_BEEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [shouldPlay, blocked, fileFailed]);

  /** Click handler for the "Enable alert sound" bar (runs inside the user gesture). */
  const enable = useCallback(() => {
    setPlayRejected(false);
    if (!ctxRef.current) ctxRef.current = createAudioContext();
    void ctxRef.current?.resume().catch(() => undefined);
    const audio = audioRef.current;
    if (audio && !fileFailed && shouldPlay) void audio.play().catch(() => undefined);
  }, [fileFailed, shouldPlay]);

  const silence = useCallback(() => {
    if (!ringing) return;
    const t = Date.now();
    setNow(t);
    setSnooze({ until: t + SNOOZE_MS, ids: new Set(activeIds) });
  }, [ringing, activeIds]);

  return {
    /** A fall is active somewhere (sound may still be silenced or blocked). */
    ringing,
    /** Sound is actually playing right now. */
    playing: shouldPlay && !blocked,
    blocked,
    enable,
    snoozed,
    snoozeSecondsLeft: snoozed && snooze ? Math.max(0, Math.ceil((snooze.until - now) / 1000)) : 0,
    snooze: silence,
    /** True when the file in public/ couldn't be loaded and the beep fallback is used. */
    usingFallback: fileFailed,
  };
}

export type UseAlertSoundReturn = ReturnType<typeof useAlertSound>;
