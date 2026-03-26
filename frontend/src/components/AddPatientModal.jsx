// Handles what happens when PatientFormModal form is submitted (POST).

import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '@clerk/clerk-react';
import PatientFormModal, { EMPTY_FORM } from './PatientFormModal';

const BASE_URL = import.meta.env.VITE_API_URL;

const AddPatientModal = ({ isOpen, onClose, onPatientAdded }) => {
    const { user } = useUser();           // Clerk user
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

            const res = await axios.post(`${BASE_URL}/api/patients`, {
                ...payload,
                clerk_id: user.id,   // read directly from Clerk, never undefined
            });

            if (!res.data.success) {
                setApiError(res.data.errors?.join(', ') ?? res.data.message ?? 'Failed to add patient.');
                return;
            }

            onPatientAdded();
            handleClose();
        } catch (err) {
            console.error(err);
            setApiError(
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
            apiError={apiError}
        />
    );
};

export default AddPatientModal;