// location: frontend/components/users/ResetPasswordModal.tsx
"use client";

import { ModalShell } from "@/components/admin/ModalShell";
import { COPY } from "@/lib/users/constants";
import type { StaffUser } from "@/lib/users/types";
import { PasswordWithGenerate } from "./PasswordWithGenerate";

export interface ResetPasswordModalProps {
  user: StaffUser;
  password: string;
  onPasswordChange: (value: string) => void;
  onGenerate: () => void;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/** Admin sets a new temporary password for a user who forgot theirs. */
export function ResetPasswordModal({ user, password, onPasswordChange, onGenerate, error, saving, onCancel, onSave }: ResetPasswordModalProps) {
  return (
    <ModalShell
      title={COPY.resetTitle(user.name)}
      widthClassName="w-[460px]"
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
            {COPY.resetSave}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-slate-600">{user.email}</p>
      <PasswordWithGenerate id="reset-password" label="New temporary password" value={password} onChange={onPasswordChange} onGenerate={onGenerate} />
    </ModalShell>
  );
}
