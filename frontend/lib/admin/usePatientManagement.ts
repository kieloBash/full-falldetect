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
  const floors = floorsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState<PatientFormValues>(EMPTY_PATIENT_FORM);

  const createPatientMutation = useCreatePatientMutation();
  const updatePatientMutation = useUpdatePatientMutation();
  const deletePatientMutation = useDeletePatientMutation();

  const openAddPatientModal = useCallback(() => {
    setEditingPatientId(null);
    setPatientForm(EMPTY_PATIENT_FORM);
    setPatientModalOpen(true);
  }, []);

  const openEditPatientModal = useCallback((patient: Patient) => {
    setEditingPatientId(patient.id);
    setPatientForm({ name: patient.name, roomId: patient.roomId, notes: patient.notes, discharged: patient.discharged });
    setPatientModalOpen(true);
  }, []);

  const closePatientModal = useCallback(() => setPatientModalOpen(false), []);

  const updatePatientFormField = useCallback(<K extends keyof PatientFormValues>(key: K, value: PatientFormValues[K]) => {
    setPatientForm((f) => ({ ...f, [key]: value }));
  }, []);

  const savePatient = useCallback(() => {
    if (!patientForm.name.trim()) return;
    const onSuccess = () => setPatientModalOpen(false);
    if (editingPatientId) {
      updatePatientMutation.mutate({ patientId: editingPatientId, values: patientForm }, { onSuccess });
    } else {
      createPatientMutation.mutate(patientForm, { onSuccess });
    }
  }, [patientForm, editingPatientId, createPatientMutation, updatePatientMutation]);

  const removePatient = useCallback((patientId: string) => deletePatientMutation.mutate(patientId), [deletePatientMutation]);

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
    removePatient,
  };
}

export type UsePatientManagementReturn = ReturnType<typeof usePatientManagement>;
