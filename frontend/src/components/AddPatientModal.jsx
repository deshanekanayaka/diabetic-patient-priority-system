import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '@clerk/clerk-react';
import PatientFormModal, { EMPTY_FORM } from './PatientFormModal';

const BASE_URL = import.meta.env.VITE_API_URL;

// Handles the POST request when a new patient is submitted.
// Keeps API logic here so PatientFormModal stays a pure form component.
const AddPatientModal = ({ isOpen, onClose, onPatientAdded }) => {
    const { user } = useUser();

    const [saving, setSaving] = useState(false);
    const [savingError, setSavingError] = useState(null);

    const handleClose = () => {
        setSavingError(null);
        onClose();
    };

    const handleSave = async (payload) => {
        try {
            setSaving(true);
            setSavingError(null);

            // Zod already coerces strings to numbers, so only clerk_id needs adding
            const res = await axios.post(`${BASE_URL}/api/patients`, {
                ...payload,
                clerk_id: user.id,
            });

            if (!res.data.success) {
                setSavingError(res.data.errors?.join(', ') ?? res.data.message ?? 'Failed to add patient.');
                return;
            }

            // Pass the new patient ID up so the success popup can display it
            onPatientAdded(res.data.data.patient_id);
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
        <PatientFormModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add Patient Details"
            initialValues={EMPTY_FORM}
            onSave={handleSave}
            saving={saving}
            savingError={savingError}
        />
    );
};

export default AddPatientModal;