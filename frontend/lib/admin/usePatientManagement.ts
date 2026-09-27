// location: frontend/lib/admin/usePatientManagement.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useCreatePatientMutation,
  useDeletePatientMutation,
  useFloorsQuery,
  usePatientsQuery,
  useRoomsQuery,
  useUpdatePatientMutation,
} from "./queries";
import { errorMessage } from "./errors";
import type { Patient, PatientFormValues } from "./types";
import { roomLabelWithFloor, roomOptionLabel } from "./utils";

const EMPTY_PATIENT_FORM: PatientFormValues = { name: "", roomId: "", notes: "", discharged: false };

/**
 * Owns all state for `/admin/patients` (Patient Management): the patients
 * table (name, current room, notes, active/discharged status) and the
 * add/edit patient modal.
 */
export function usePatientManagement() {
  const floorsQuery = useFloorsQuery();
  const roomsQuery = useRoomsQuery();
  const patientsQuery = usePatientsQuery();
  const floors = useMemo(() => floorsQuery.data ?? [], [floorsQuery.data]);
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);
  const patients = useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);

  const createPatientMutation = useCreatePatientMutation();
  const updatePatientMutation = useUpdatePatientMutation();
  const deletePatientMutation = useDeletePatientMutation();

  const openAddPatientModal = useCallback(() => {
    setEditingPatientId(null);
    setPatientForm(EMPTY_PATIENT_FORM);
    setFormError(null);
    setPatientModalOpen(true);
  }, []);

  const openEditPatientModal = useCallback((patient: Patient) => {
    setEditingPatientId(patient.id);
    setPatientForm({ name: patient.name, roomId: patient.roomId, notes: patient.notes, discharged: patient.discharged });
    setFormError(null);
    setPatientModalOpen(true);
  }, []);

  const closePatientModal = useCallback(() => setPatientModalOpen(false), []);

  const updatePatientFormField = useCallback(<K extends keyof PatientFormValues>(key: K, value: PatientFormValues[K]) => {
    setPatientForm((f) => ({ ...f, [key]: value }));
  }, []);

  const savePatient = useCallback(() => {
    if (!patientForm.name.trim()) return setFormError("Patient name is required.");
    setFormError(null);
    const onSuccess = () => setPatientModalOpen(false);
    const onError = (e: unknown) => setFormError(errorMessage(e));
    if (editingPatientId) {
      updatePatientMutation.mutate({ patientId: editingPatientId, values: patientForm }, { onSuccess, onError });
    } else {
      createPatientMutation.mutate(patientForm, { onSuccess, onError });
    }
  }, [patientForm, editingPatientId, createPatientMutation, updatePatientMutation]);

  const requestRemovePatient = useCallback(
    (patientId: string) => {
      deletePatientMutation.reset();
      setDeletePatientId(patientId);
    },
    [deletePatientMutation]
  );
  const cancelRemovePatient = useCallback(() => setDeletePatientId(null), []);
  const confirmRemovePatient = useCallback(() => {
    if (!deletePatientId) return;
    deletePatientMutation.mutate(deletePatientId, { onSuccess: () => setDeletePatientId(null) });
  }, [deletePatientId, deletePatientMutation]);
  const patientToDelete = patients.find((p) => p.id === deletePatientId) ?? null;

  const roomOptions = useMemo(() => rooms.map((r) => ({ value: r.id, label: roomOptionLabel(r, floors) })), [rooms, floors]);

  const patientRows = useMemo(
    () =>
      patients.map((patient) => ({
        patient,
        roomLabel: patient.roomId ? roomLabelWithFloor(rooms, floors, patient.roomId) : "Unassigned",
      })),
    [patients, rooms, floors]
  );

  return {
    patientRows,
    activePatientCount: patients.filter((p) => !p.discharged).length,
    roomOptions,

    patientModalOpen,
    isEditingPatient: editingPatientId !== null,
    patientForm,
    updatePatientFormField,
    openAddPatientModal,
    openEditPatientModal,
    closePatientModal,
    savePatient,
    savingPatient: createPatientMutation.isPending || updatePatientMutation.isPending,
    formError,

    removePatient: requestRemovePatient,
    deleteTarget: patientToDelete
      ? {
          title: `Delete ${patientToDelete.name}?`,
          description:
            "Their room becomes unassigned. Patients with incident history can't be deleted — mark them as discharged instead.",
          confirmLabel: "Delete patient",
        }
      : null,
    deleteError: errorMessage(deletePatientMutation.error),
    deletingPatient: deletePatientMutation.isPending,
    cancelRemovePatient,
    confirmRemovePatient,
  };
}

export type UsePatientManagementReturn = ReturnType<typeof usePatientManagement>;
