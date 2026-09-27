// location: frontend/components/auth/AuthScreen.tsx
"use client";

import { useAuthForm, type UseAuthFormOptions } from "@/lib/auth/useAuthForm";
import { AuthSuccess } from "@/components/auth/AuthSuccess";
import { BrandPanel } from "./BrandPanel";
import { LoginForm } from "@/components/auth/LoginForm";

export type AuthScreenProps = UseAuthFormOptions;

/**
 * FallDetect — Sign in, split-panel layout: a dark brand panel on the left,
 * the form on the right. Self-registration was removed: an administrator
 * creates every staff account in Admin → User Management.
 */
export function AuthScreen(props: AuthScreenProps) {
  const auth = useAuthForm(props);

  return (
    <div className="flex min-h-screen items-center justify-center p-8 tabular-nums bg-slate-200">
      <div className="grid w-[960px] max-w-full min-h-[600px] grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,.08)]">
        <BrandPanel />

        <div className="flex flex-col p-11">
          {auth.mode === "login" && <LoginForm form={auth.login} />}
          {auth.mode === "done" && <AuthSuccess onContinue={auth.onContinue} />}
        </div>
      </div>
    </div>
  );
}
