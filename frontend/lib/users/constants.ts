// location: frontend/lib/users/constants.ts
import type { UserRole } from "./types";

export const MIN_PASSWORD_LENGTH = 8;

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "NURSE", label: "Nurse" },
  { value: "ADMIN", label: "Administrator" },
];

export const ROLE_LABEL: Record<UserRole, string> = { NURSE: "Nurse", ADMIN: "Administrator" };

export const COPY = {
  title: "User Management",
  countLine: (active: number, total: number) =>
    `${active} active account${active === 1 ? "" : "s"} · ${total} total`,
  addUser: "Add user",
  noUsers: "No accounts yet.",
  modalTitleAdd: "Add user",
  modalTitleEdit: "Edit user",
  modalSaveAdd: "Create account",
  modalSaveEdit: "Save changes",
  passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters. Give it to the user privately.`,
  resetTitle: (name: string) => `Reset password for ${name}`,
  resetSave: "Set new password",
  generate: "Generate",
  you: "You",
} as const;
