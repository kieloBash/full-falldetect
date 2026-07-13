"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COPY } from "./constants";
import { useFacilities, useLoginMutation, useRegisterMutation } from "./queries";
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
 * state). Structure is unchanged from the mock version — the only additions
 * are: mutation errors now surface real server messages, and the facility
 * <select> is driven by `useFacilities()` instead of a hardcoded list.
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
  const [facility, setFacility] = useState<FacilityId>("");
  const [regPassword, setRegPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [regError, setRegError] = useState("");

  const facilitiesQuery = useFacilities();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  // Default the facility select to the first fetched option once loaded.
  useEffect(() => {
    if (!facility && facilitiesQuery.data?.length) {
      setFacility(facilitiesQuery.data[0].value);
    }
  }, [facility, facilitiesQuery.data]);

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
        onError: (e) => setLoginError(e instanceof Error ? e.message : "Sign in failed."),
      }
    );
  }, [loginEmail, loginPassword, rememberMe, loginMutation]);

  const submitRegister = useCallback(() => {
    if (registerMutation.isPending) return;
    if (!firstName || !lastName || !regEmail || !regPassword || !facility) {
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
        onError: (e) => setRegError(e instanceof Error ? e.message : "Registration failed."),
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
      facilityOptions: facilitiesQuery.data ?? [],
      facilitiesLoading: facilitiesQuery.isPending,
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
