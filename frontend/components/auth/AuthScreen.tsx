"use client";

import { useAuthForm, type UseAuthFormOptions } from "@/lib/auth/useAuthForm";
import { AuthSuccess } from "./AuthSuccess";
import { AuthTabs } from "./AuthTabs";
import { BrandPanel } from "./BrandPanel";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export type AuthScreenProps = UseAuthFormOptions;

/**
 * FallDetect — Auth (sign in / create account / success), split-panel
 * layout: a dark brand panel on the left, the active form on the right.
 *
 * Fully self-contained: render `<AuthScreen />` and it owns its own state
 * via `useAuthForm`. Pass `onAuthenticated` to navigate once the user
 * clicks through from the success screen — without it, the component just
 * resets back to the sign-in tab (the original prototype's demo behavior).
 */
export function AuthScreen(props: AuthScreenProps) {
  const auth = useAuthForm(props);

  return (
    <div className="flex min-h-screen items-center justify-center p-8 tabular-nums bg-slate-200">
      <div className="grid w-[960px] max-w-full min-h-[600px] grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,.08)]">
        <BrandPanel />

        <div className="flex flex-col p-11">
          <AuthTabs mode={auth.mode} onShowLogin={auth.showLogin} onShowRegister={auth.showRegister} />

          {auth.mode === "login" && <LoginForm form={auth.login} onSwitchToRegister={auth.showRegister} />}
          {auth.mode === "register" && <RegisterForm form={auth.register} onSwitchToLogin={auth.showLogin} />}
          {auth.mode === "done" && <AuthSuccess kind={auth.doneKind} onContinue={auth.onContinue} />}
        </div>
      </div>
    </div>
  );
}
