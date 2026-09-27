// location: frontend/lib/users/useUserManagement.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { useProfileMe } from "@/lib/auth/queries";
import { errorMessage } from "@/lib/admin/errors";
import { MIN_PASSWORD_LENGTH } from "./constants";
import { useCreateUserMutation, useResetPasswordMutation, useUpdateUserMutation, useUsersQuery } from "./queries";
import type { StaffUser, UserFormValues } from "./types";
import { generateTempPassword } from "./utils";

const EMPTY_FORM: UserFormValues = { firstName: "", lastName: "", email: "", role: "NURSE", password: "" };

/**
 * Owns all state for `/admin/users` (User Management): the accounts table,
 * the add/edit modal, the reset-password modal, and the deactivate confirmation.
 * Accounts are never deleted — deactivating blocks sign-in but keeps incident history.
 */
export function useUserManagement() {
  const usersQuery = useUsersQuery();
  const meQuery = useProfileMe();
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const currentUserId = meQuery.data?.id ?? null;

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const resetMutation = useResetPasswordMutation();

  /* ── Add / edit ─────────────────────────────────────────────────────── */

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = useCallback(() => {
    setEditingUserId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((user: StaffUser) => {
    setEditingUserId(user.id);
    setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, password: "" });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const updateFormField = useCallback(<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const generatePassword = useCallback(() => setForm((f) => ({ ...f, password: generateTempPassword() })), []);

  const saveUser = useCallback(() => {
    if (!form.firstName.trim() || !form.lastName.trim()) return setFormError("First and last name are required.");
    if (!form.email.trim()) return setFormError("Email is required.");
    if (!editingUserId && form.password.length < MIN_PASSWORD_LENGTH) {
      return setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    setFormError(null);
    const onSuccess = () => setModalOpen(false);
    const onError = (e: unknown) => setFormError(errorMessage(e));
    if (editingUserId) {
      const { password: _unused, ...values } = form;
      void _unused;
      updateMutation.mutate({ userId: editingUserId, values }, { onSuccess, onError });
    } else {
      createMutation.mutate(form, { onSuccess, onError });
    }
  }, [form, editingUserId, createMutation, updateMutation]);

  /* ── Reset password ─────────────────────────────────────────────────── */

  const [resetUser, setResetUser] = useState<StaffUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDoneFor, setResetDoneFor] = useState<string | null>(null);

  const openResetModal = useCallback((user: StaffUser) => {
    setResetUser(user);
    setResetPassword("");
    setResetError(null);
    setResetDoneFor(null);
  }, []);
  const closeResetModal = useCallback(() => setResetUser(null), []);
  const generateResetPassword = useCallback(() => setResetPassword(generateTempPassword()), []);

  const saveResetPassword = useCallback(() => {
    if (!resetUser) return;
    if (resetPassword.length < MIN_PASSWORD_LENGTH) {
      return setResetError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    setResetError(null);
    resetMutation.mutate(
      { userId: resetUser.id, password: resetPassword },
      {
        onSuccess: () => {
          setResetDoneFor(resetUser.name);
          setResetUser(null);
        },
        onError: (e) => setResetError(errorMessage(e)),
      }
    );
  }, [resetUser, resetPassword, resetMutation]);

  /* ── Deactivate (confirm) / reactivate (direct) ─────────────────────── */

  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const requestDeactivate = useCallback((user: StaffUser) => {
    setStatusError(null);
    setDeactivateUserId(user.id);
  }, []);
  const cancelDeactivate = useCallback(() => setDeactivateUserId(null), []);
  const confirmDeactivate = useCallback(() => {
    if (!deactivateUserId) return;
    updateMutation.mutate(
      { userId: deactivateUserId, values: { isActive: false } },
      { onSuccess: () => setDeactivateUserId(null), onError: (e) => setStatusError(errorMessage(e)) }
    );
  }, [deactivateUserId, updateMutation]);

  const reactivate = useCallback(
    (user: StaffUser) => {
      setStatusError(null);
      updateMutation.mutate(
        { userId: user.id, values: { isActive: true } },
        { onError: (e) => setStatusError(errorMessage(e)) }
      );
    },
    [updateMutation]
  );

  const userToDeactivate = users.find((u) => u.id === deactivateUserId) ?? null;

  return {
    users,
    loading: usersQuery.isPending,
    loadError: errorMessage(usersQuery.error),
    currentUserId,
    activeCount: users.filter((u) => u.isActive).length,

    modalOpen,
    isEditing: editingUserId !== null,
    isEditingSelf: editingUserId !== null && editingUserId === currentUserId,
    form,
    formError,
    updateFormField,
    generatePassword,
    openAddModal,
    openEditModal,
    closeModal,
    saveUser,
    saving: createMutation.isPending || updateMutation.isPending,

    resetUser,
    resetPassword,
    setResetPassword,
    resetError,
    resetDoneFor,
    dismissResetDone: () => setResetDoneFor(null),
    openResetModal,
    closeResetModal,
    generateResetPassword,
    saveResetPassword,
    resetting: resetMutation.isPending,

    deactivateTarget: userToDeactivate
      ? {
          title: `Deactivate ${userToDeactivate.name}?`,
          description:
            "They won't be able to sign in, and any open session ends on their next request. Their incident history is kept. You can reactivate the account later.",
          confirmLabel: "Deactivate",
        }
      : null,
    statusError: deactivateUserId ? statusError : null,
    rowError: deactivateUserId ? null : statusError,
    requestDeactivate,
    cancelDeactivate,
    confirmDeactivate,
    reactivate,
    updatingStatus: updateMutation.isPending,
  };
}

export type UseUserManagementReturn = ReturnType<typeof useUserManagement>;
