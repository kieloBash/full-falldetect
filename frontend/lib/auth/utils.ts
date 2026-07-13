import type { PasswordStrengthScore } from "./types";

/**
 * Rough client-side password strength heuristic for the register form's
 * strength meter — not a substitute for real server-side password policy
 * checks.
 */
export function passwordStrengthScore(password: string): PasswordStrengthScore {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as PasswordStrengthScore;
}
