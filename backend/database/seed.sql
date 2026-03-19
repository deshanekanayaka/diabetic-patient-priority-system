import React, { useState } from 'react';
import axios from 'axios';
import './modals.css';

const BASE_URL = 'http://localhost:3300';
const DEFAULT_CLINICIAN_ID = 1;

const EMPTY_FORM = {
  age:                    '',
  sex:                    'male',
  social_life:            'city',
  bp_systolic:            '',
  bp_diastolic:           '',
  cholesterol:            '',
  triglycerides:          '',
  hdl:                    '',
  ldl:                    '',
  vldl:                   '',
  hba1c:                  '',
  bmi:                    '',
  rbs:                    '',
  genetic_family_history: '',
};

const RANGES = {
  age:                    { min: 0,  max: 120  },
  bp_systolic:            { min: 50, max: 250  },
  bp_diastolic:           { min: 30, max: 150  },
  cholesterol:            { min: 0,  max: 500  },
  triglycerides:          { min: 0,  max: 1000 },
  hdl:                    { min: 0,  max: 100  },
  ldl:                    { min: 0,  max: 300  },
  vldl:                   { min: 0,  max: 100  },
  hba1c:                  { min: 0,  max: 20   },
  bmi:                    { min: 10, max: 60   },
  rbs:                    { min: 0,  max: 600  },
  genetic_family_history: { min: 0,  max: 10   },
};

const validateField = (name, value) => {
  const range = RANGES[name];
  if (!range || value === '') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return 'Must be a number';
  if (num < range.min || num > range.max) return `Valid range: ${range.min}–${range.max}`;
return null;
};

const AddPatientModal = ({ isOpen, onClose, onPatientAdded }) => {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
};

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (RANGES[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
}
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    onClose();
};

  const handleSave = async () => {
    const freshErrors = {};
    Object.keys(RANGES).forEach((field) => {
      if (form[field] === '') {
        freshErrors[field] = 'Required';
      } else {
        const err = validateField(field, form[field]);
        if (err) freshErrors[field] = err;
      }
    });

    if (Object.keys(freshErrors).length > 0) {
      setErrors(freshErrors);
      return;
}

    try {
      setSaving(true);
      setApiError(null);

      const payload = {};
      Object.entries(form).forEach(([key, val]) => {
        payload[key] = RANGES[key] !== undefined ? parseFloat(val) : val;
      });

      const res = await axios.post(`${BASE_URL}/api/patients`, {
        ...payload,
        clinician_id: DEFAULT_CLINICIAN_ID,
      });

      if (!res.data.success) {
        const msg = res.data.errors?.length ? res.data.errors.join(', ') : res.data.message || 'Failed to add patient.';
        setApiError(msg);
        return;
}

      onPatientAdded();
      handleClose();
} catch (err) {
      console.error(err);
      const serverErrors = err.response?.data?.errors;
      setApiError(serverErrors?.length ? serverErrors.join(', ') : err.response?.data?.message || 'Could not connect to server.');
} finally {
      setSaving(false);
}
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const Field = ({ name, placeholder }) => (
    <div>
      <input
        type="number"
        name={name}
        value={form[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`modal-input${errors[name] ? ' input-error' : ''}`}
      />
      {errors[name] && <p className="modal-input-error-msg">⚠ {errors[name]}</p>}
    </div>
  );

return (
    <>
    <div className="modal-overlay" onClick={handleClose} />
    <div className="modal-panel">
    <div className="modal-header">
    <h2 className="modal-title">Add Patient Details</h2>
    <button className="modal-close-btn" onClick={handleClose}>✕</button>
    </div>

    <div className="modal-grid-2">
    <div>
    <p className="modal-section-label">Age</p>
    <Field name="age" placeholder="Age" />
    </div>
    <div>
    <p className="modal-section-label">Gender</p>
    <div className="modal-radio-group">
    {['male', 'female'].map((val) => (
                <label key={val} className="modal-radio-label">
                  <input type="radio" name="sex" value={val} checked={form.sex === val} onChange={handleChange} />
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>

        <p className="modal-section-label">Social Life</p>
        <select name="social_life" value={form.social_life} onChange={handleChange} className="modal-select">
          <option value="city">City</option>
          <option value="village">Village</option>
        </select>

        <p className="modal-section-label">Blood Pressure</p>
        <div className="modal-grid-2">
          <Field name="bp_systolic"  placeholder="Systolic"  />
          <Field name="bp_diastolic" placeholder="Diastolic" />
        </div>

        <p className="modal-section-label">Lipid Profile</p>
        <div className="modal-grid-5">
          <Field name="cholesterol"   placeholder="Chol" />
          <Field name="triglycerides" placeholder="Trig" />
          <Field name="hdl"           placeholder="HDL"  />
          <Field name="ldl"           placeholder="LDL"  />
          <Field name="vldl"          placeholder="VLDL" />
        </div>

        <p className="modal-section-label">Blood Sugar &amp; Metabolic</p>
        <div className="modal-grid-4">
          <Field name="hba1c" placeholder="HbA1c" />
          <Field name="bmi"   placeholder="BMI"   />
          <Field name="rbs"   placeholder="RBS"   />
        </div>

        <div className="modal-label-row">
          <span className="modal-section-label">Genetic Risk Count</span>
          <div className="info-icon-wrapper">
            <span className="info-icon">i</span>
            <div className="info-tooltip">
              Count of affected relatives with diabetes:<br />
              1 = Father &nbsp;&nbsp; 2 = Mother<br />
              3 = Uncle (maternal) &nbsp;&nbsp; 4 = Uncle (paternal)
            </div>
          </div>
        </div>
        <Field name="genetic_family_history" placeholder="e.g. 0, 1, 2…" />

        {apiError && <div className="modal-error-banner">{apiError}</div>}

        <div className="modal-footer">
          <button className="btn-modal-cancel" onClick={handleClose}>Cancel</button>
          <button className="btn-modal-save" onClick={handleSave} disabled={saving || hasErrors}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddPatientModal;