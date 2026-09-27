// location: frontend/components/users/UserManagementScreen.tsx
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { COPY } from "@/lib/users/constants";
import { useUserManagement } from "@/lib/users/useUserManagement";
import { AddEditUserModal } from "./AddEditUserModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { UserTable } from "./UserTable";

/**
 * FallDetect — Admin · User Management (`/admin/users`).
 * Admins create every staff account here (there is no self-registration),
 * edit account details, reset forgotten passwords, and deactivate/reactivate accounts.
 */
export function UserManagementScreen() {
  const u = useUserManagement();

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <AdminTopBar />

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <AdminToolbar
            title={COPY.title}
            subtitle={COPY.countLine(u.activeCount, u.users.length)}
            actionLabel={COPY.addUser}
            onAction={u.openAddModal}
          />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {u.resetDoneFor && (
              <Alert data-testid="reset-success">
                <AlertDescription>
                  Password updated for {u.resetDoneFor}. Give them the new temporary password privately.{" "}
                  <button type="button" className="font-semibold underline" onClick={u.dismissResetDone}>
                    Dismiss
                  </button>
                </AlertDescription>
              </Alert>
            )}
            {(u.loadError || u.rowError) && (
              <Alert variant="destructive" data-testid="users-error">
                <AlertDescription>{u.loadError ?? u.rowError}</AlertDescription>
              </Alert>
            )}

            {u.loading ? (
              <div className="py-10 text-center text-[13.5px] text-slate-500">Loading accounts…</div>
            ) : (
              <UserTable
                users={u.users}
                currentUserId={u.currentUserId}
                busy={u.updatingStatus}
                onEdit={u.openEditModal}
                onResetPassword={u.openResetModal}
                onDeactivate={u.requestDeactivate}
                onReactivate={u.reactivate}
              />
            )}
          </div>
        </main>
      </div>

      {u.modalOpen && (
        <AddEditUserModal
          values={u.form}
          onFieldChange={u.updateFormField}
          onGeneratePassword={u.generatePassword}
          isEditing={u.isEditing}
          isSelf={u.isEditingSelf}
          error={u.formError}
          saving={u.saving}
          onCancel={u.closeModal}
          onSave={u.saveUser}
        />
      )}

      {u.resetUser && (
        <ResetPasswordModal
          user={u.resetUser}
          password={u.resetPassword}
          onPasswordChange={u.setResetPassword}
          onGenerate={u.generateResetPassword}
          error={u.resetError}
          saving={u.resetting}
          onCancel={u.closeResetModal}
          onSave={u.saveResetPassword}
        />
      )}

      <ConfirmDeleteDialog
        target={u.deactivateTarget}
        busy={u.updatingStatus}
        error={u.statusError}
        onCancel={u.cancelDeactivate}
        onConfirm={u.confirmDeactivate}
      />
    </div>
  );
}
