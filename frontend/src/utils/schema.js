// frontend/src/utils/schema.js
// Zod validation schema for patient data.
import { z } from 'zod';

export const patientSchema = z.object({
    age:           z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(120,  'Max 120'  ),
    sex:           z.enum(['male', 'female'],   { required_error: 'Required' }),
    social_life:   z.enum(['city', 'village'],  { required_error: 'Required' }),
    bp_systolic:  z.coerce.number({ required_error: 'Required' }).min(5,  'Min 5'  ).max(25,  'Max 25'  ),
    bp_diastolic: z.coerce.number({ required_error: 'Required' }).min(3,  'Min 3'  ).max(15,  'Max 15'  ),
    bmi:          z.coerce.number({ required_error: 'Required' }).min(0,  'Min 0'  ).max(60,  'Max 60'  ),
    cholesterol:   z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(500,  'Max 500'  ),
    triglycerides: z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(1000, 'Max 1000' ),
    hdl:           z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(100,  'Max 100'  ),
    ldl:           z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(300,  'Max 300'  ),
    vldl:          z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(100,  'Max 100'  ),
    hba1c:         z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(20,   'Max 20'   ),
    rbs:           z.coerce.number({ required_error: 'Required' }).min(0,   'Min 0'   ).max(600,  'Max 600'  ),
});

//Create schema — adds clerk_id (POST /api/patients only)
export const patientCreateSchema = patientSchema.extend({
    clerk_id: z.string().min(1, 'clerk_id is required'),
});