// location: frontend/lib/alert-sound/fallback-beep.ts
/**
 * Two short beeps with the Web Audio API. Used only when the alarm file in
 * `public/` is missing or can't be decoded, so the alarm never goes silent.
 */
export function playFallbackBeep(ctx: AudioContext): void {
  [0, 0.2].forEach((dt) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = dt === 0 ? 960 : 720;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime + dt;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  });
}

export function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctx ? new Ctx() : null;
}
