/** Shared types for the FallDetect Auth screen. */

export type AuthMode = "login" | "register" | "done";

/** Which flow the success screen is confirming, so its copy can differ. */
export type DoneKind = "login" | "register";

export type FacilityId = "sunrise" | "oakwood";

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  facility: FacilityId;
  password: string;
  agreedToTerms: boolean;
}

/** 0 = empty, 4 = strongest. Indexes `PASSWORD_STRENGTH_META` in constants.ts. */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;
