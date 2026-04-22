const { z } = require('zod');

// Coerces the incoming value to a number, returning a sentinel string "MISSING"
// for undefined/null/empty/NaN so Zod issues a validation error instead of
// passing NaN to the ML service
const requiredNumber = (min, max, minMsg, maxMsg) =>
    z.preprocess(
        (val) => {
            if (val === undefined || val === null || val === '') return 'MISSING';
            const num = Number(val);
            // Non-numeric strings like "abc" coerce to NaN, which is also treated as missing
            return isNaN(num) ? 'MISSING' : num;
        },
        z.number({
            required_error: 'This field is required',
            invalid_type_error: 'This field is required',
        })
            .min(min, minMsg)
            .max(max, maxMsg)
    );

// Defines the clinical value ranges for all patient fields
// Ranges reflect clinically plausible bounds rather than strict normal ranges
const patientSchema = z.object({
    age:           requiredNumber(0,    120,  'Min 0',   'Max 120'  ),
    sex:           z.enum(['male', 'female'],  { required_error: 'Required' }),
    social_life:   z.enum(['city', 'village'], { required_error: 'Required' }),
    // Blood pressure stored in kPa units, not mmHg — ranges reflect that scale
    bp_systolic:   requiredNumber(5,    25,   'Min 5',   'Max 25'   ),
    bp_diastolic:  requiredNumber(3,    15,   'Min 3',   'Max 15'   ),
    bmi:           requiredNumber(0,    60,   'Min 0',   'Max 60'   ),
    cholesterol:   requiredNumber(0,    500,  'Min 0',   'Max 500'  ),
    triglycerides: requiredNumber(0,    1000, 'Min 0',   'Max 1000' ),
    hdl:           requiredNumber(0,    100,  'Min 0',   'Max 100'  ),
    ldl:           requiredNumber(0,    300,  'Min 0',   'Max 300'  ),
    vldl:          requiredNumber(0,    100,  'Min 0',   'Max 100'  ),
    hba1c:         requiredNumber(0,    20,   'Min 0',   'Max 20'   ),
    rbs:           requiredNumber(0,    600,  'Min 0',   'Max 600'  ),
});

// Extends the base schema with clerk_id, which is only required when creating a new patient
const patientCreateSchema = patientSchema.extend({
    clerk_id: z.string().min(1, 'clerk_id is required'),
});

module.exports = { patientSchema, patientCreateSchema };