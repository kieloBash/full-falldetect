// location: frontend/components/admin/PatientManagementScreen.tsx
"use client";

import { COPY } from "@/lib/admin/constants";
import { usePatientManagement } from "@/lib/admin/usePatientManagement";
import { AddEditPatientModal } from "./AddEditPatientModal";
import { AdminSidebar } from "./AdminSidebar";
import { AdminToolbar } from "./AdminToolbar";
import { AdminTopBar } from "./AdminTopBar";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { PatientTable } from "./PatientTable";

/**
 * WatchCare — Admin · Patient Management (`/admin/patients`).
 *
 * Every patient, their current room assignment, care notes, and
 * active/discharged status, plus add/edit/remove. Backed by TanStack
 * Query + the /api/admin/patients routes. Fully self-contained: render
 * `<PatientManagementScreen />` and it owns its own state via
 * `usePatientManagement`.
 */
export function PatientManagementScreen() {
  const patient = usePatientManagement();

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <AdminTopBar />

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <AdminToolbar
            title={COPY.patient.title}
            subtitle={COPY.patient.countLine(patient.activePatientCount)}
            actionLabel={COPY.patient.addPatient}
            onAction={patient.openAddPatientModal}
          />

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <PatientTable rows={patient.patientRows} onEditPatient={patient.openEditPatientModal} onRemovePatient={patient.removePatient} />
          </div>
        </main>
      </div>

      {patient.patientModalOpen && (
        <AddEditPatientModal
          values={patient.patientForm}
          roomOptions={patient.roomOptions}
          onFieldChange={patient.updatePatientFormField}
          isEditing={patient.isEditingPatient}
          onCancel={patient.closePatientModal}
          onSave={patient.savePatient}
          saving={patient.savingPatient}
          error={patient.formError}
        />
      )}

      <ConfirmDeleteDialog
        target={patient.deleteTarget}
        busy={patient.deletingPatient}
        error={patient.deleteError}
        onCancel={patient.cancelRemovePatient}
        onConfirm={patient.confirmRemovePatient}
      />
    </div>
  );
}
