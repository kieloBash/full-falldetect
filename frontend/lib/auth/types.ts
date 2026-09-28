// location: frontend/lib/auth/types.ts
/** Shared types for the WatchCare sign-in screen. */

export type AuthMode = "login" | "done";

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface FacilityOption {
  value: string;
  label: string;
}
