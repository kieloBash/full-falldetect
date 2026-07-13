import { passwordStrengthMeta } from "@/lib/auth/constants";
import type { PasswordStrengthScore } from "@/lib/auth/types";

export interface PasswordStrengthMeterProps {
  score: PasswordStrengthScore;
  /** Whether the password field has any input yet — shows the neutral hint copy until it does. */
  hasValue: boolean;
}

/** Four-bar strength indicator + label for the register form's password field. */
export function PasswordStrengthMeter({ score, hasValue }: PasswordStrengthMeterProps) {
  const meta = passwordStrengthMeta(score);
  const bars = [0, 1, 2, 3] as const;

  return (
    <div>
      <div className="mt-2 flex gap-1">
        {bars.map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? meta.barClass : "bg-slate-200"}`} />
        ))}
      </div>
      <div className={`mt-[5px] text-[11.5px] font-medium ${hasValue ? meta.textClass : "text-slate-400"}`}>
        {hasValue ? meta.label : "Use 8+ characters"}
      </div>
    </div>
  );
}
