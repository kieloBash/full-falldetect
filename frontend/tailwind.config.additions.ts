/**
 * Merge these into your existing tailwind.config.{ts,js} `theme.extend`.
 * They back the keyframe animations referenced by className across the
 * FallDetect components (search "animate-fd-" to find every usage):
 *
 *   animate-fd-pulse     Live Monitor AlertTile — active-fall border pulse
 *   animate-fd-dot       Live Monitor CameraFeed — blinking REC dot
 *   animate-fd-toast-in  Live Monitor ToastStack — toast entrance
 *   animate-fd-banner    Live Monitor ActiveAlertBanner — banner color flash
 *   animate-fd-spin      Auth SubmitButton — busy-state spinner
 *   animate-fd-modal-in  Admin ModalShell — add/edit modal entrance
 *
 * Everything else on these screens is plain Tailwind utility classes (the
 * FallDetect brief's slate/teal/red/amber/green palette maps 1:1 onto
 * Tailwind's default color scale, so no custom colors are needed).
 *
 * Example tailwind.config.ts:
 *
 *   import type { Config } from "tailwindcss";
 *   import { fallDetectThemeExtend } from "./tailwind.config.additions";
 *
 *   export default {
 *     content: ["./**\/*.{ts,tsx}"],
 *     theme: { extend: { ...fallDetectThemeExtend } },
 *   } satisfies Config;
 */
export const fallDetectThemeExtend = {
  keyframes: {
    "fd-pulse": {
      "0%, 100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0)" },
      "50%": { boxShadow: "0 0 0 7px rgba(220,38,38,.16)" },
    },
    "fd-dot": {
      "0%, 100%": { transform: "scale(1)", opacity: "1" },
      "50%": { transform: "scale(.55)", opacity: ".5" },
    },
    "fd-toast-in": {
      from: { transform: "translateY(10px)", opacity: "0" },
      to: { transform: "translateY(0)", opacity: "1" },
    },
    "fd-banner": {
      "0%, 100%": { backgroundColor: "#DC2626" },
      "50%": { backgroundColor: "#B91C1C" },
    },
    "fd-spin": {
      to: { transform: "rotate(360deg)" },
    },
    "fd-modal-in": {
      from: { opacity: "0", transform: "translateY(6px) scale(.98)" },
      to: { opacity: "1", transform: "translateY(0) scale(1)" },
    },
  },
  animation: {
    "fd-pulse": "fd-pulse 1.4s ease-in-out infinite",
    "fd-dot": "fd-dot 1.2s ease-in-out infinite",
    "fd-toast-in": "fd-toast-in .2s ease",
    "fd-banner": "fd-banner 1.6s ease-in-out infinite",
    "fd-spin": "fd-spin .7s linear infinite",
    "fd-modal-in": "fd-modal-in .16s ease-out",
  },
  fontFamily: {
    sans: ['Inter', '"IBM Plex Sans"', "system-ui", "sans-serif"],
    mono: ['"IBM Plex Mono"', "ui-monospace", "Menlo", "monospace"],
  },
};

/** @deprecated use `fallDetectThemeExtend` — kept so existing imports don't break. */
export const liveMonitorThemeExtend = fallDetectThemeExtend;
