"use client";

import { useCallback, useMemo, useState } from "react";
import { COPY } from "./constants";
import { useLoginMutation, useRegisterMutation } from "./queries";
import type { AuthMode, DoneKind, FacilityId } from "./types";
import { passwordStrengthScore } from "./utils";

export interface UseAuthFormOptions {
  /**
   * Called when the user clicks through from the success screen. Wire this
   * to your router (e.g. `router.push("/live-monitor")`) — the hook itself
   * only resets back to the login tab, matching the original prototype's
   * demo behavior when no navigation is wired up.
   */
  onAuthenticated?: (kind: DoneKind) => void;
}

/**
 * Owns all state for the Auth screen (login, register, and the success
 * state), mirroring `useLiveMonitor`'s shape: local form state, submission
 * going through `useMutation` hooks (currently mock-backed — see
 * `lib/auth/api.ts`), and a single hook consumed by the top-level
 * `<AuthScreen />` component.
 */
export function useAuthForm(options: UseAuthFormOptions = {}) {
  const { onAuthenticated } = options;

  const [mode, setMode] = useState<AuthMode>("login");
  const [doneKind, setDoneKind] = useState<DoneKind>("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [facility, setFacility] = useState<FacilityId>("sunrise");
  const [regPassword, setRegPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [regError, setRegError] = useState("");

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  const showLogin = useCallback(() => setMode("login"), []);
  const showRegister = useCallback(() => setMode("register"), []);

  const submitLogin = useCallback(() => {
    if (loginMutation.isPending) return;
    if (!loginEmail || !loginPassword) {
      setLoginError(COPY.loginMissingFields);
      return;
    }
    setLoginError("");
    loginMutation.mutate(
      { email: loginEmail, password: loginPassword, rememberMe },
      {
        onSuccess: () => {
          setDoneKind("login");
          setMode("done");
        },
      }
    );
  }, [loginEmail, loginPassword, rememberMe, loginMutation]);

  const submitRegister = useCallback(() => {
    if (registerMutation.isPending) return;
    if (!firstName || !lastName || !regEmail || !regPassword) {
      setRegError(COPY.registerMissingFields);
      return;
    }
    if (regPassword.length < COPY.minPasswordLength) {
      setRegError(COPY.registerPasswordTooShort);
      return;
    }
    if (!agreedToTerms) {
      setRegError(COPY.registerTermsRequired);
      return;
    }
    setRegError("");
    registerMutation.mutate(
      { firstName, lastName, email: regEmail, facility, password: regPassword, agreedToTerms },
      {
        onSuccess: () => {
          setDoneKind("register");
          setMode("done");
        },
      }
    );
  }, [firstName, lastName, regEmail, facility, regPassword, agreedToTerms, registerMutation]);

  const onContinue = useCallback(() => {
    onAuthenticated?.(doneKind);
    setMode("login");
    setLoginEmail("");
    setLoginPassword("");
  }, [doneKind, onAuthenticated]);

  const passwordStrength = useMemo(() => passwordStrengthScore(regPassword), [regPassword]);

  return {
    mode,
    doneKind,
    showLogin,
    showRegister,
    onContinue,

    login: {
      email: loginEmail,
      onEmailChange: setLoginEmail,
      password: loginPassword,
      onPasswordChange: setLoginPassword,
      passwordVisible: loginPasswordVisible,
      onTogglePasswordVisible: () => setLoginPasswordVisible((v) => !v),
      rememberMe,
      onToggleRememberMe: () => setRememberMe((v) => !v),
      error: loginError,
      busy: loginMutation.isPending,
      onSubmit: submitLogin,
      // TODO(auth): replace with a real SSO redirect (e.g. to your IdP's authorize URL).
      onSsoLogin: submitLogin,
    },

    register: {
      firstName,
      onFirstNameChange: setFirstName,
      lastName,
      onLastNameChange: setLastName,
      email: regEmail,
      onEmailChange: setRegEmail,
      facility,
      onFacilityChange: setFacility,
      password: regPassword,
      onPasswordChange: setRegPassword,
      passwordStrength,
      agreedToTerms,
      onToggleTerms: () => setAgreedToTerms((v) => !v),
      error: regError,
      busy: registerMutation.isPending,
      onSubmit: submitRegister,
    },
  };
}

export type UseAuthFormReturn = ReturnType<typeof useAuthForm>;
