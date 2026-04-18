import React, { useState } from 'react';
import axios from 'axios';
import PatientFormModal from './PatientFormModal';

const BASE_URL = import.meta.env.VITE_API_URL;

// Converts a DB patient record into the form's expected shape.
// DB values can be numbers or null; the form expects strings or ''.
const toFormValues = (patient) => ({
    age:           patient.age           ?? '',
    sex:           patient.sex           ?? 'male',
    social_life:   patient.social_life   ?? 'city',
    bp_systolic:   patient.bp_systolic   ?? '',
    bp_diastolic:  patient.bp_diastolic  ?? '',
    cholesterol:   patient.cholesterol   ?? '',
    triglycerides: patient.triglycerides ?? '',
    hdl:           patient.hdl           ?? '',
    ldl:           patient.ldl           ?? '',
    vldl:          patient.vldl          ?? '',
    hba1c:         patient.hba1c         ?? '',
    bmi:           patient.bmi           ?? '',
    rbs:           patient.rbs           ?? '',
});

// Handles the PUT request when an existing patient is updated via PatientFormModal.
// Keeps API logic here so PatientFormModal stays a pure form component.
const EditPatientModal = ({ isOpen, onClose, onPatientUpdated, patient }) => {
    const [saving,      setSaving]      = useState(false);
    const [savingError, setSavingError] = useState(null);

    const handleClose = () => {
        setSavingError(null);
        onClose();
    };

    const handleSave = async (payload) => {
        try {
            setSaving(true);
            setSavingError(null);

            const res = await axios.put(`${BASE_URL}/api/patients/${patient.patient_id}`, payload);

            if (!res.data.success) {
                setSavingError(res.data.errors?.join(', ') ?? res.data.message ?? 'Failed to update patient.');
                return;
            }

            onPatientUpdated();
            handleClose();

        } catch (err) {
            console.error(err);
            // Show the most specific error available, fall back to a generic message
            setSavingError(
                err.response?.data?.errors?.join(', ') ??
                err.response?.data?.message ??
                'Could not connect to server.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        // Guard against rendering with no patient data
        <PatientFormModal
            isOpen={isOpen && !!patient}
            onClose={handleClose}
            title={`Edit Patient — p${patient?.patient_id}`}
            initialValues={patient ? toFormValues(patient) : null}
            onSave={handleSave}
            saving={saving}
            savingError={savingError}
        />
    );
};

export default EditPatientModal;