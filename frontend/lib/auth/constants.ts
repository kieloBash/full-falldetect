import type { DoneKind, PasswordStrengthScore } from "./types";

/**
 * NOTE: The old hardcoded `FACILITY_OPTIONS` array is gone — facilities now
 * come from the DB via `useFacilities()` (GET /api/facilities). The register
 * form should default its <select> to the first fetched option.
 */

interface PasswordStrengthMeta {
  label: string;
  textClass: string;
  barClass: string;
}

/** Indexed by `PasswordStrengthScore` (0–4). */
export const PASSWORD_STRENGTH_META: readonly PasswordStrengthMeta[] = [
  { label: "Enter a password", textClass: "text-slate-400", barClass: "bg-slate-200" },
  { label: "Weak", textClass: "text-red-600", barClass: "bg-red-600" },
  { label: "Fair", textClass: "text-amber-600", barClass: "bg-amber-600" },
  { label: "Good", textClass: "text-teal-600", barClass: "bg-teal-600" },
  { label: "Strong", textClass: "text-green-600", barClass: "bg-green-600" },
];

export function passwordStrengthMeta(score: PasswordStrengthScore): PasswordStrengthMeta {
  return PASSWORD_STRENGTH_META[score];
}

export const COPY = {
  brandName: "FallDetect",
  headline: "Real-time fall detection for every resident, on every floor.",
  subheadline: "Sign in to monitor live alerts, respond to incidents, and keep your care team coordinated.",
  features: ["Sub-second fall alerts, 24/7", "HIPAA-compliant, encrypted end-to-end"],
  copyright: `© ${new Date().getFullYear()} FallDetect. All rights reserved.`,

  loginTitle: "Welcome back",
  loginSubtitle: "Sign in with your facility credentials to continue.",
  loginMissingFields: "Enter your email and password to continue.",
  rememberMeLabel: "Keep me signed in on this device",
  ssoLabel: "Sign in with facility SSO",
  noAccountPrompt: "New to FallDetect?",

  registerTitle: "Create your account",
  registerSubtitle: "Set up staff access for your facility.",
  registerMissingFields: "Fill in every field to create your account.",
  registerPasswordTooShort: "Password must be at least 8 characters.",
  registerTermsRequired: "Please accept the terms to continue.",
  registerFacilitiesLoading: "Loading facilities…",
  hasAccountPrompt: "Already have an account?",
  minPasswordLength: 8,

  doneTitle: { login: "Signed in", register: "Account created" } satisfies Record<DoneKind, string>,
  doneSubtitle: {
    login: "Welcome back — your shift dashboard is ready.",
    register: "Your staff account is ready. An admin will confirm your facility access shortly.",
  } satisfies Record<DoneKind, string>,
  continueLabel: "Go to Live Monitor →",
} as const;
