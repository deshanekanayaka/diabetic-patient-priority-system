// frontend/src/components/EditPatientModal.jsx
//
// Thin wrapper around PatientFormModal.
// Responsibility: PUT the payload to the API. Nothing else.
// Note: clerk_id is NOT sent — the patient's clinician ownership is already
// set in the database (validateUpdate on the backend doesn't require it).

import React, { useState } from 'react';
import axios from 'axios';
import PatientFormModal from './PatientFormModal';

const BASE_URL = 'http://localhost:3300';

// Convert a patient record from the DB into the form's shape.
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

const EditPatientModal = ({ isOpen, onClose, onPatientUpdated, patient }) => {
    const [saving,   setSaving]   = useState(false);
    const [apiError, setApiError] = useState(null);

    const handleClose = () => {
        setApiError(null);
        onClose();
    };

    const handleSave = async (payload) => {
        try {
            setSaving(true);
            setApiError(null);

            const res = await axios.put(`${BASE_URL}/api/patients/${patient.patient_id}`, payload);

            if (!res.data.success) {
                setApiError(res.data.errors?.join(', ') ?? res.data.message ?? 'Failed to update patient.');
                return;
            }

            onPatientUpdated();
            handleClose();
        } catch (err) {
            console.error(err);
            setApiError(err.response?.data?.errors?.join(', ') ?? err.response?.data?.message ?? 'Could not connect to server.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PatientFormModal
            isOpen={isOpen && !!patient}
            onClose={handleClose}
            title={`Edit Patient — p${patient?.patient_id}`}
            initialValues={patient ? toFormValues(patient) : null}
            onSave={handleSave}
            saving={saving}
            apiError={apiError}
        />
    );
};

export default EditPatientModal;