// location: frontend/components/auth/LoginForm.tsx
import { COPY } from "@/lib/auth/constants";
import type { UseAuthFormReturn } from "@/lib/auth/useAuthForm";
import { Icon } from "@/components/icons/Icon";
import { Checkbox } from "./fields/Checkbox";
import { PasswordField } from "./fields/PasswordField";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";

export interface LoginFormProps {
  form: UseAuthFormReturn["login"];
}

/**
 * Sign-in form. There is no self-registration: accounts are created by an
 * administrator in Admin → User Management, who also resets forgotten passwords.
 */
export function LoginForm({ form }: LoginFormProps) {
  return (
    <div className="mt-7 flex flex-1 flex-col">
      <h1 className="m-0 text-[22px] font-semibold tracking-tight text-slate-900">{COPY.loginTitle}</h1>
      <div className="mt-[6px] text-[13.5px] text-slate-600">{COPY.loginSubtitle}</div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.onSubmit();
        }}
        className="mt-[26px] flex flex-col gap-4"
      >
        <TextField id="login-email" label="Work email" type="email" value={form.email} onChange={form.onEmailChange} placeholder="you@sunrisesenior.com" autoComplete="email" />

        <PasswordField
          id="login-password"
          label="Password"
          value={form.password}
          onChange={form.onPasswordChange}
          placeholder="••••••••"
          autoComplete="current-password"
          error={form.error || undefined}
          visibilityToggle={{ visible: form.passwordVisible, onToggle: form.onTogglePasswordVisible }}
          labelRight={
            <span title={COPY.forgotPasswordHint} className="cursor-help text-[12.5px] font-semibold text-slate-500">
              Forgot password?
            </span>
          }
        />

        <Checkbox id="login-remember" checked={form.rememberMe} onChange={form.onToggleRememberMe}>
          {COPY.rememberMeLabel}
        </Checkbox>

        <SubmitButton busy={form.busy}>Sign in</SubmitButton>
      </form>

      {/* <div className="mt-[22px] flex items-center gap-3 text-slate-300">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11.5px] font-medium text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
 */}
      {/* <button
        type="button"
        onClick={form.onSsoLogin}
        className="mt-4 flex h-11 items-center justify-center gap-[9px] rounded-[9px] border border-slate-200 bg-white text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Icon name="lock" size={16} />
        {COPY.ssoLabel}
      </button> */}

      <div className="flex-1" />

      <div className="mt-[22px] text-center text-[13px] text-slate-600">{COPY.noAccountPrompt}</div>
    </div>
  );
}
