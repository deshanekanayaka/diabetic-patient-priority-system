// frontend/src/components/PatientFormModal.jsx
//
// Single modal used for BOTH adding and editing patients.
// Uses React Hook Form (RHF) to replace all manual form state,
// validation timing, and error tracking.
//
// What RHF removes compared to our previous approach:
//   ❌ useState for form values
//   ❌ useState for errors
//   ❌ useState for blurred (which fields lost focus)
//   ❌ useState for edited  (which fields were changed)
//   ❌ handleChange with functional state updates
//   ❌ handleBlur with blurred+edited guard logic
//   ❌ manual validateField calls in handleSave
//   ❌ useEffect reset on open (replaced by reset())

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

// ─── Default values — one source of truth ────────────────────────────────────
// Exported so AddPatientModal can pass it as initialValues
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

// ─── Validation rules — mirrors backend validation.js ────────────────────────
// Each field declares its own rules. RHF enforces them and builds
// the errors object automatically. No manual validateField needed.
const RULES = {
    age:           { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 120,  message: 'Max 120'  }, valueAsNumber: true },
    bp_systolic:   { required: 'Required', min: { value: 50,  message: 'Min 50'  }, max: { value: 250,  message: 'Max 250'  }, valueAsNumber: true },
    bp_diastolic:  { required: 'Required', min: { value: 30,  message: 'Min 30'  }, max: { value: 150,  message: 'Max 150'  }, valueAsNumber: true },
    cholesterol:   { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 500,  message: 'Max 500'  }, valueAsNumber: true },
    triglycerides: { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 1000, message: 'Max 1000' }, valueAsNumber: true },
    hdl:           { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 100,  message: 'Max 100'  }, valueAsNumber: true },
    ldl:           { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 300,  message: 'Max 300'  }, valueAsNumber: true },
    vldl:          { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 100,  message: 'Max 100'  }, valueAsNumber: true },
    hba1c:         { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 20,   message: 'Max 20'   }, valueAsNumber: true },
    bmi:           { required: 'Required', min: { value: 10,  message: 'Min 10'  }, max: { value: 60,   message: 'Max 60'   }, valueAsNumber: true },
    rbs:           { required: 'Required', min: { value: 0,   message: 'Min 0'   }, max: { value: 600,  message: 'Max 600'  }, valueAsNumber: true },
};

// ─── Field component — MODULE LEVEL ──────────────────────────────────────────
// Receives the RHF-registered input props via spread.
// Must stay outside PatientFormModal to prevent remount on each render.
const Field = ({ label, placeholder, registration, error }) => (
    <div className="modal-field">
        <label className="modal-field-label">{label}</label>
        <input
            type="number"
            placeholder={placeholder}
            className={`modal-input${error ? ' input-error' : ''}`}
            {...registration}  // spreads: name, ref, onChange, onBlur from RHF
        />
        <p className="modal-input-error-msg">
            {error ? `⚠ ${error.message}` : ''}
        </p>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const PatientFormModal = ({ isOpen, onClose, title, initialValues, onSave, saving, apiError }) => {

    // useForm replaces: useState(form), useState(errors),
    // useState(blurred), useState(edited), handleChange, handleBlur
    const {
        register,           // connects inputs to RHF
        handleSubmit,       // validates then calls onSubmit
        reset,              // resets form to given values
        formState: { errors},  // live error state, validity flag
    } = useForm({
        defaultValues: EMPTY_FORM,
        mode: 'onBlur',         // show errors when user leaves a field
        reValidateMode: 'onChange', // clear errors as user fixes them
    });

    // Reset the form whenever the modal opens with new values.
    // For Add: resets to empty. For Edit: populates with patient data.
    useEffect(() => {
        if (isOpen) {
            reset(initialValues ?? EMPTY_FORM);
        }
    }, [isOpen, initialValues, reset]);

    if (!isOpen) return null;

    // handleSubmit runs RULES validation first.
    // If all pass, it calls this with clean numeric values (valueAsNumber: true).
    // If any fail, it populates errors and does NOT call this.
    const onSubmit = (data) => {
        onSave(data);
    };

    const handleClose = () => {
        reset(EMPTY_FORM);
        onClose();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="modal-overlay" onClick={handleClose} />
            <div className="modal-panel modal-panel--lg">

                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close-btn" onClick={handleClose}>✕</button>
                </div>

                {/* Using a real <form> tag — RHF works with native form submission */}
                <form onSubmit={handleSubmit(onSubmit)}>

                    {/* Patient Information */}
                    <p className="modal-section-label">
                        Patient Information <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-2">
                        <Field
                            label="Age (years)"
                            placeholder="e.g. 45"
                            registration={register('age', RULES.age)}
                            error={errors.age}
                        />
                        <div className="modal-field">
                            <label className="modal-field-label">Gender</label>
                            <div className="modal-radio-group">
                                {['male', 'female'].map((val) => (
                                    <label key={val} className="modal-radio-label">
                                        <input
                                            type="radio"
                                            value={val}
                                            {...register('sex')}
                                        />
                                        {val.charAt(0).toUpperCase() + val.slice(1)}
                                    </label>
                                ))}
                            </div>
                            <p className="modal-input-error-msg"></p>
                        </div>
                    </div>

                    {/* Social Life */}
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

                    {/* Blood Pressure (mmHg) */}
                    <p className="modal-section-label modal-section-label--padded">
                        Blood Pressure (mmHg) <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-2">
                        <Field label="Systolic"  placeholder="50 – 250" registration={register('bp_systolic',  RULES.bp_systolic)}  error={errors.bp_systolic}  />
                        <Field label="Diastolic" placeholder="30 – 150" registration={register('bp_diastolic', RULES.bp_diastolic)} error={errors.bp_diastolic} />
                    </div>

                    {/* Lipid Profile (mg/dL) */}
                    <p className="modal-section-label modal-section-label--padded">
                        Lipid Profile (mg/dL) <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-5">
                        <Field label="Cholesterol"   placeholder="0 – 500"  registration={register('cholesterol',   RULES.cholesterol)}   error={errors.cholesterol}   />
                        <Field label="Triglycerides" placeholder="0 – 1000" registration={register('triglycerides', RULES.triglycerides)} error={errors.triglycerides} />
                        <Field label="HDL"           placeholder="0 – 100"  registration={register('hdl',           RULES.hdl)}           error={errors.hdl}           />
                        <Field label="LDL"           placeholder="0 – 300"  registration={register('ldl',           RULES.ldl)}           error={errors.ldl}           />
                        <Field label="VLDL"          placeholder="0 – 100"  registration={register('vldl',          RULES.vldl)}          error={errors.vldl}          />
                    </div>

                    {/* Blood Sugar & Metabolic */}
                    <p className="modal-section-label modal-section-label--padded">
                        Blood Sugar &amp; Metabolic <span className="modal-required-star">*</span>
                    </p>
                    <div className="modal-grid-3">
                        <Field label="HbA1c (%)"                  placeholder="0 – 20"  registration={register('hba1c', RULES.hba1c)} error={errors.hba1c} />
                        <Field label="BMI (kg/m²)"                placeholder="10 – 60" registration={register('bmi',   RULES.bmi)}   error={errors.bmi}   />
                        <Field label="Random Blood Sugar (mg/dL)" placeholder="0 – 600" registration={register('rbs',   RULES.rbs)}   error={errors.rbs}   />
                    </div>

                    {apiError && <div className="modal-error-banner">{apiError}</div>}

                    <div className="modal-footer">
                        <button type="button" className="btn-modal-cancel" onClick={handleClose}>
                            Cancel
                        </button>
                        {/* type="submit" triggers handleSubmit → validates → calls onSubmit */}
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