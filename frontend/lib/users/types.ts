// location: frontend/lib/users/types.ts
export type UserRole = "ADMIN" | "NURSE";

/** A staff account as shown in User Management (never includes the password hash). */
export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  /** "First Last", for display. */
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  /** ISO string, null if the user has never signed in. */
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserValues {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  /** Temporary password the admin gives to the nurse. */
  password: string;
}

export type UpdateUserValues = Partial<Pick<StaffUser, "firstName" | "lastName" | "email" | "role" | "isActive">>;

/** Form state for the add/edit modal. `password` is only used when adding. */
export interface UserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  password: string;
}
