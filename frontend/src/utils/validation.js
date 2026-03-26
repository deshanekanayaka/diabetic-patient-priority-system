/**
 * validation.js — single source of truth
 *
 * Copy to BOTH locations (or symlink):
 *   backend/utils/validation.js
 *   frontend/src/utils/validation.js
 *
 * validateCreate  → used by POST /api/patients  (requires clerk_id)
 * validateUpdate  → used by PUT  /api/patients/:id  (no clerk_id needed)
 * validateField   → used by React inputs for live/blur validation
 */

const FIELD_RANGES = {
    age:           { min: 0,   max: 120  },
    bp_systolic:   { min: 50,  max: 250  },
    bp_diastolic:  { min: 30,  max: 150  },
    cholesterol:   { min: 0,   max: 500  },
    triglycerides: { min: 0,   max: 1000 },
    hdl:           { min: 0,   max: 100  },
    ldl:           { min: 0,   max: 300  },
    vldl:          { min: 0,   max: 100  },
    hba1c:         { min: 0,   max: 20   },
    bmi:           { min: 10,  max: 60   },
    rbs:           { min: 0,   max: 600  },
};

function isBlank(val) {
    return val === undefined || val === null || val === '';
}

// Validates all shared clinical fields (used by both create and update)
function validateClinicalFields(data) {
    const errors = [];

    // age
    if (isBlank(data.age)) {
        errors.push('Age is required');
    } else {
        const n = Number(data.age);
        if (isNaN(n) || n < 0 || n > 120) errors.push('Age must be between 0 and 120');
    }

    // sex
    if (isBlank(data.sex)) {
        errors.push('Sex is required');
    } else if (!['male', 'female'].includes(String(data.sex).toLowerCase())) {
        errors.push("Sex must be 'male' or 'female'");
    }

    // social_life
    if (isBlank(data.social_life)) {
        errors.push('Social life is required');
    } else if (!['city', 'village'].includes(String(data.social_life).toLowerCase())) {
        errors.push("Social life must be 'city' or 'village'");
    }

    // All numeric clinical fields — all required
    const numericFields = [
        'bp_systolic', 'bp_diastolic',
        'cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl',
        'hba1c', 'bmi', 'rbs',
    ];

    numericFields.forEach((field) => {
        if (isBlank(data[field])) {
            errors.push(`${field} is required`);
        } else {
            const n = Number(data[field]);
            const { min, max } = FIELD_RANGES[field];
            if (isNaN(n)) {
                errors.push(`${field} must be a number`);
            } else if (n < min || n > max) {
                errors.push(`${field} must be between ${min} and ${max}`);
            }
        }
    });

    return errors;
}

// POST — requires clerk_id
function validateCreate(data) {
    const errors = validateClinicalFields(data);
    if (isBlank(data.clerk_id)) errors.push('clerk_id is required');
    return errors;
}

// PUT — clerk_id not needed (patient already owns the relationship)
function validateUpdate(data) {
    return validateClinicalFields(data);
}

// Single-field validation for React inputs
function validateField(name, value) {
    if (isBlank(value)) return 'Required';
    if (FIELD_RANGES[name]) {
        const num = parseFloat(value);
        if (isNaN(num)) return 'Must be a number';
        const { min, max } = FIELD_RANGES[name];
        if (num < min || num > max) return `Valid range: ${min}–${max}`;
    }
    return null;
}

// Dual export — CommonJS (Node) + ES module (Vite)
const _exports = { validateCreate, validateUpdate, validateField, FIELD_RANGES };
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = _exports;
}
export { validateCreate, validateUpdate, validateField, FIELD_RANGES };