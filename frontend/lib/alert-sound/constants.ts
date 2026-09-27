// location: frontend/lib/alert-sound/constants.ts

/**
 * The alarm file, served from `frontend/public`. Replace
 * `public/sounds/fall-alert.mp3` with your own file, or put any file in
 * `public/sounds/` and point NEXT_PUBLIC_ALERT_SOUND_URL at it (e.g. "/sounds/siren.wav").
 * mp3, wav and ogg all work in Chrome and Edge. Short files (1–3 s) loop best.
 */
export const ALERT_SOUND_URL = process.env.NEXT_PUBLIC_ALERT_SOUND_URL || "/sounds/fall-alert.mp3";

/** Playback volume, 0–1. */
export const ALERT_SOUND_VOLUME = 1;

/** How long the "Silence" button quiets the alarm before it rings again. */
export const SNOOZE_MS = 30_000;

/** Fallback beep interval when the sound file can't be loaded. */
export const FALLBACK_BEEP_INTERVAL_MS = 1_200;

export const COPY = {
  enableTitle: "Alert sound is off until you click",
  enableBody: "Your browser blocks sound until you interact with the page. Click to turn on the fall alarm.",
  enableButton: "Enable alert sound",
  silence: "Silence 30 s",
  silenced: (s: number) => `Silenced · ${s}s`,
  silenceTitle: "Silence the alarm for 30 seconds. It rings again if the fall is still not acknowledged.",
} as const;
