// location: frontend/components/users/AddEditUserModal.tsx
"use client";

import { ModalShell } from "@/components/admin/ModalShell";
import { ModalSelectField } from "@/components/admin/fields/ModalSelectField";
import { ModalTextField } from "@/components/admin/fields/ModalTextField";
import { COPY, ROLE_OPTIONS } from "@/lib/users/constants";
import type { UserFormValues, UserRole } from "@/lib/users/types";
import { PasswordWithGenerate } from "./PasswordWithGenerate";

export interface AddEditUserModalProps {
  values: UserFormValues;
  onFieldChange: <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => void;
  onGeneratePassword: () => void;
  isEditing: boolean;
  /** Editing your own account: account type is locked. */
  isSelf: boolean;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/** Add user (with temporary password) / edit user (name, email, account type). */
export function AddEditUserModal({
  values,
  onFieldChange,
  onGeneratePassword,
  isEditing,
  isSelf,
  error,
  saving,
  onCancel,
  onSave,
}: AddEditUserModalProps) {
  return (
    <ModalShell
      title={isEditing ? COPY.modalTitleEdit : COPY.modalTitleAdd}
      widthClassName="w-[480px]"
      onClose={onCancel}
      error={error}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={`h-10 rounded-lg px-[18px] text-[13.5px] font-semibold text-white ${saving ? "cursor-wait bg-teal-700" : "cursor-pointer bg-teal-600 hover:bg-teal-700"}`}
          >
            {isEditing ? COPY.modalSaveEdit : COPY.modalSaveAdd}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalTextField id="user-first-name" label="First name" value={values.firstName} onChange={(v) => onFieldChange("firstName", v)} />
        <ModalTextField id="user-last-name" label="Last name" value={values.lastName} onChange={(v) => onFieldChange("lastName", v)} />
      </div>
      <ModalTextField
        id="user-email"
        label="Email"
        value={values.email}
        onChange={(v) => onFieldChange("email", v)}
        placeholder="name@facility.example"
      />
      {isSelf ? (
        <p className="text-[12.5px] text-slate-500">You can&apos;t change your own account type.</p>
      ) : (
        <ModalSelectField<UserRole>
          id="user-role"
          label="Account type"
          value={values.role}
          options={ROLE_OPTIONS}
          onChange={(v) => onFieldChange("role", v)}
        />
      )}
      {!isEditing && (
        <PasswordWithGenerate
          id="user-password"
          label="Temporary password"
          value={values.password}
          onChange={(v) => onFieldChange("password", v)}
          onGenerate={onGeneratePassword}
        />
      )}
    </ModalShell>
  );
}
