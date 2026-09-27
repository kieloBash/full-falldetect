// location: frontend/lib/auth/useAuthForm.ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { COPY } from "./constants";
import { useLoginMutation } from "./queries";
import type { AuthMode } from "./types";

export interface UseAuthFormOptions {
  /** Called when a NURSE clicks through from the success screen (e.g. go to ?next= or /live-monitor). */
  onAuthenticated?: () => void;
}

/**
 * Owns all state for the sign-in screen. Admins go straight to /admin after
 * signing in; nurses see a short confirmation, then `onAuthenticated`.
 */
export function useAuthForm(options: UseAuthFormOptions = {}) {
  const { onAuthenticated } = options;
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  const loginMutation = useLoginMutation();

  const submitLogin = useCallback(() => {
    if (loginMutation.isPending) return;
    if (!email || !password) {
      setError(COPY.loginMissingFields);
      return;
    }
    setError("");
    loginMutation.mutate(
      { email, password, rememberMe },
      {
        onSuccess: (data) => {
          if (data.role === "ADMIN") {
            router.push("/admin");
            return;
          }
          setMode("done");
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Sign in failed."),
      }
    );
  }, [email, password, rememberMe, loginMutation, router]);

  const onContinue = useCallback(() => {
    onAuthenticated?.();
    setMode("login");
    setEmail("");
    setPassword("");
  }, [onAuthenticated]);

  return {
    mode,
    onContinue,
    login: {
      email,
      onEmailChange: setEmail,
      password,
      onPasswordChange: setPassword,
      passwordVisible,
      onTogglePasswordVisible: () => setPasswordVisible((v) => !v),
      rememberMe,
      onToggleRememberMe: () => setRememberMe((v) => !v),
      error,
      busy: loginMutation.isPending,
      onSubmit: submitLogin,
    },
  };
}

export type UseAuthFormReturn = ReturnType<typeof useAuthForm>;
