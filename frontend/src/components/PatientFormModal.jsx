import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema } from '../utils/schema.js';
import '../css/index.css';
import '../css/Modal.css';

// Empty strings for number fields — z.coerce.number() converts them to numbers on submit
// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_FORM = {
    age:           '',
    sex:           'male',
    social_life:   'city',
    bp_systolic:   '',
    bp_diastolic:  '',
    cholesterol:   '',
    triglycerides: '',
    hdl:           '',
    ldl:           '',
    vldl:          '',
    hba1c:         '',
    bmi:           '',
    rbs:           '',
};

// Reusable input field that shows a warning message when validation fails
const Field = ({ label, placeholder, registration, error }) => (
    <div className="modal-field">
        <label className="modal-field-label">{label}</label>
        <input
            type="number"
            placeholder={placeholder}
            // Adds a red border class when the field has an error
            className={`modal-input${error ? ' input-error' : ''}`}
            {...registration}
        />
        <p className="modal-input-error-msg">
            {error ? `⚠ ${error.message}` : ''}
        </p>
    </div>
);

// Shared modal used by both AddPatientModal and EditPatientModal
// Receives initialValues from the parent — empty for Add, existing record for Edit
const PatientFormModal = ({ isOpen, onClose, title, initialValues, onSave, saving, savingError }) => {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        // Zod schema drives all validation rules
        resolver: zodResolver(patientSchema),
        defaultValues: EMPTY_FORM,
        // Shows errors when the user leaves a field, clears them as they fix it
        mode: 'onBlur',
        reValidateMode: 'onChange',
    });

    // Populates the form when the modal opens — blank for Add, patient data for Edit
    useEffect(() => {
        if (isOpen) {
            reset(initialValues ?? EMPTY_FORM);
        }
    }, [isOpen, initialValues, reset]);

    // Avoids rendering the modal DOM entirely when it isn't needed
    if (!isOpen) return null;

    const onSubmit = (data) => onSave(data);

    // Resets to blank values before closing so the form is clean on next open
    const handleClose = () => {
        reset(EMPTY_FORM);
        onClose();
    };

    return (
        <>
            <div className="modal-overlay" onClick={handleClose} />
            <div className="modal-panel modal-panel--lg">

                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close-btn" onClick={handleClose}>✕</button>
                </div>

                {/* noValidate disables browser-native validation bubbles — Zod and RHF own all validation UI */}
                <form onSubmit={handleSubmit(onSubmit)} noValidate>

                    <p className="modal-section-label">
                        Patient Information <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-2">
                        <Field
                            label="Age (years)"
                            placeholder="e.g. 45"
                            registration={register('age')}
                            error={errors.age}
                        />
                        <div className="modal-field">
                            <label className="modal-field-label">Gender</label>
                            <div className="modal-radio-group">
                                {/* Generates radio buttons from the allowed sex values */}
                                {['male', 'female'].map((val) => (
                                    <label key={val} className="modal-radio-label">
                                        <input type="radio" value={val} {...register('sex')} />
                                        {val.charAt(0).toUpperCase() + val.slice(1)}
                                    </label>
                                ))}
                            </div>
                            <p className="modal-input-error-msg"></p>
                        </div>
                    </div>

                    <p className="modal-section-label modal-section-label--padded">
                        Social Life <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-field">
                        <select className="modal-select" {...register('social_life')}>
                            <option value="city">City (Urban)</option>
                            <option value="village">Village (Rural)</option>
                        </select>
                        <p className="modal-input-error-msg"></p>
                    </div>

                    <p className="modal-section-label modal-section-label--padded">
                        Blood Pressure (mmHg) <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-2">
                        <Field label="Systolic"  placeholder="5 – 25"  registration={register('bp_systolic')}  error={errors.bp_systolic}  />
                        <Field label="Diastolic" placeholder="3 – 15"  registration={register('bp_diastolic')} error={errors.bp_diastolic} />
                    </div>

                    <p className="modal-section-label modal-section-label--padded">
                        Lipid Profile (mg/dL) <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-5">
                        <Field label="Cholesterol"   placeholder="0 – 500"  registration={register('cholesterol')}   error={errors.cholesterol}   />
                        <Field label="Triglycerides" placeholder="0 – 1000" registration={register('triglycerides')} error={errors.triglycerides} />
                        <Field label="HDL"           placeholder="0 – 100"  registration={register('hdl')}           error={errors.hdl}           />
                        <Field label="LDL"           placeholder="0 – 300"  registration={register('ldl')}           error={errors.ldl}           />
                        <Field label="VLDL"          placeholder="0 – 100"  registration={register('vldl')}          error={errors.vldl}          />
                    </div>

                    <p className="modal-section-label modal-section-label--padded">
                        Blood Sugar &amp; Metabolic <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-3">
                        <Field label="HbA1c (%)"                      placeholder="0 – 20"  registration={register('hba1c')} error={errors.hba1c} />
                        <Field label="BMI (kg/m²)"                    placeholder="0 – 60"  registration={register('bmi')}   error={errors.bmi}   />
                        <Field label="Random Blood Sugar (mg/dL)"     placeholder="0 – 600" registration={register('rbs')}   error={errors.rbs}   />
                    </div>

                    {/* Displays server-side errors that Zod client validation cannot catch */}
                    {savingError && <div className="modal-error-banner">{savingError}</div>}

                    <div className="modal-footer">
                        <button type="button" className="btn-modal-cancel" onClick={handleClose}>
                            Cancel
                        </button>
                        {/* Disables the button while the save request is in flight to prevent duplicate submissions */}
                        <button type="submit" className="btn-modal-save" disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>

                </form>
            </div>
        </>
    );
};

export default PatientFormModal;