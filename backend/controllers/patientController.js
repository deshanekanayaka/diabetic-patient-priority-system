const axios = require('axios');
const db = require('../config/database');
const { patientSchema, patientCreateSchema, checkWarnings } = require('../utils/schema.js');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// Valid risk levels — used to validate the riskLevel query parameter in getAllPatients
const VALID_RISK_LEVELS = ['low', 'medium', 'high'];

// Flattens Zod's nested error structure into a flat array of readable strings
// e.g. ['age: Min 0', 'bp_systolic: Min 50']
const formatZodErrors = (zodError) =>
    zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

// Adding a field to patientSchema automatically updates both field lists.
const REQUIRED_UPDATE_FIELDS = Object.keys(patientSchema.shape);
const REQUIRED_CREATE_FIELDS = [...REQUIRED_UPDATE_FIELDS, 'clerk_id'];

// Checks which required fields are missing or empty in the request body
const getMissingFields = (body, fields) => {
  const missing = [];

  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }

  return missing;
};

// MySQL stores top_factors as a JSON string — converts it back to an array
const parseTopFactors = (patient) => {
  if (typeof patient.top_factors === 'string') {
    patient.top_factors = JSON.parse(patient.top_factors);
  }
  return patient;
};

// POST /api/patients
const createPatient = async (req, res) => {
  try {

    // Runs a manual presence check before Zod so missing fields get a clear error message
    const missingFields = getMissingFields(req.body, REQUIRED_CREATE_FIELDS);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: missingFields.map((f) => `${f}: This field is required`),
      });
    }

    // Validates field types and clinical value ranges using the create schema
    const result = patientCreateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodErrors(result.error),
      });
    }

    const {
      clerk_id, age, sex, social_life,
      bp_systolic, bp_diastolic,
      cholesterol, triglycerides, hdl, ldl, vldl,
      hba1c, bmi, rbs,
    } = result.data;

    // Checks validated data against clinical warning thresholds.
    // Warnings are informational — they do not block the record from being saved.
    const warnings = checkWarnings(result.data);

    // Sends the seven key clinical indicators to the ML service to compute a risk score.
    // Handled separately so a service failure returns a clear 503 instead of a generic 500.
    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
        age, sex, hba1c, bmi, bp_systolic, bp_diastolic, rbs,
      });
    } catch (mlError) {
      return res.status(503).json({
        success: false,
        message: 'Risk scoring service unavailable. Please try again later.',
      });
    }

    // top_factors is the ranked list of clinical features that drove this score,
    // serialised to JSON string so MySQL can store it in the JSON column
    const { risk_score, risk_category, top_factors } = mlResponse.data;
    const top_factors_json = JSON.stringify(top_factors);

    const sql = `
            INSERT INTO patients
                (clerk_id, age, sex, social_life,
                 cholesterol, triglycerides, hdl, ldl, vldl,
                 bp_systolic, bp_diastolic, hba1c, bmi, rbs,
                 risk_score, risk_category, top_factors)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      clerk_id, age, sex, social_life,
      cholesterol, triglycerides, hdl, ldl, vldl,
      bp_systolic, bp_diastolic, hba1c, bmi, rbs,
      risk_score, risk_category, top_factors_json,
    ];

    const dbResult = await db.execute(sql, values);

    // Returns warnings alongside the patient data so the frontend can display
    // them to the clinician without blocking the successful save
    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      warnings,
      data: { patient_id: dbResult.insertId, risk_score, risk_category, top_factors },
    });

  } catch (error) {
    console.error('Error creating patient:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create patient' });
  }
};

// GET /api/patients
const getAllPatients = async (req, res) => {
  try {
    const { clerk_id, sortBy, riskLevel } = req.query;

    // clerk_id is mandatory — without it the query would return all patients across all clinicians
    if (!clerk_id) {
      return res.status(400).json({ success: false, message: 'clerk_id query parameter is required' });
    }

    let sql = 'SELECT * FROM patients WHERE clerk_id = ?';
    const values = [clerk_id];

    // Validates riskLevel against allowed values before appending to the query
    if (riskLevel && riskLevel !== 'all') {
      if (!VALID_RISK_LEVELS.includes(riskLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid riskLevel. Must be low, medium, or high',
        });
      }
      sql += ' AND risk_category = ?';
      values.push(riskLevel);
    }

    // Defaults to newest-first order; switches to highest risk first when sortBy is "risk"
    sql += sortBy === 'risk' ? ' ORDER BY risk_score DESC' : ' ORDER BY patient_id DESC';

    const patients = await db.query(sql, values);

    // Parses top_factors from JSON string back to array for each patient
    const parsed = patients.map(parseTopFactors);

    res.status(200).json({ success: true, count: parsed.length, data: parsed });

  } catch (error) {
    console.error('Error fetching patients:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    const patient = await db.queryOne(
        'SELECT * FROM patients WHERE patient_id = ?',
        [req.params.id]
    );

    // Returns 404 rather than an empty object so the frontend can handle it unambiguously
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.status(200).json({ success: true, data: parseTopFactors(patient) });

  } catch (error) {
    console.error('Error fetching patient:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch patient' });
  }
};

// PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Confirms the patient exists before attempting any validation or ML calls
    const existing = await db.queryOne(
        'SELECT * FROM patients WHERE patient_id = ?',
        [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Runs the same manual presence check as createPatient before passing data to Zod
    const missingFields = getMissingFields(req.body, REQUIRED_UPDATE_FIELDS);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: missingFields.map((f) => `${f}: This field is required`),
      });
    }

    // Uses the base schema (without clerk_id) since the clinician cannot change after creation
    const result = patientSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodErrors(result.error),
      });
    }

    const {
      age, sex, social_life,
      bp_systolic, bp_diastolic,
      cholesterol, triglycerides, hdl, ldl, vldl,
      hba1c, bmi, rbs,
    } = result.data;

    // Checks validated data against clinical warning thresholds
    const warnings = checkWarnings(result.data);

    // Re-scores the patient because any health data change may shift their risk category.
    // Handled separately so a service failure returns a clear 503 instead of a generic 500.
    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
        age, sex, hba1c, bmi, bp_systolic, bp_diastolic, rbs,
      });
    } catch (mlError) {
      return res.status(503).json({
        success: false,
        message: 'Risk scoring service unavailable. Please try again later.',
      });
    }

    // Extracts all three ML outputs including the refreshed top_factors for this patient
    const { risk_score, risk_category, top_factors } = mlResponse.data;
    const top_factors_json = JSON.stringify(top_factors);

    const sql = `
            UPDATE patients SET
                age=?, sex=?, social_life=?,
                cholesterol=?, triglycerides=?, hdl=?, ldl=?, vldl=?,
                bp_systolic=?, bp_diastolic=?,
                hba1c=?, bmi=?, rbs=?,
                risk_score=?, risk_category=?, top_factors=?
            WHERE patient_id=?
        `;

    const values = [
      age, sex, social_life,
      cholesterol, triglycerides, hdl, ldl, vldl,
      bp_systolic, bp_diastolic,
      hba1c, bmi, rbs,
      risk_score, risk_category, top_factors_json,
      id,
    ];

    await db.execute(sql, values);

    // Returns warnings alongside updated risk details so the frontend can display them
    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      warnings,
      data: { patient_id: parseInt(id), risk_score, risk_category, top_factors },
    });

  } catch (error) {
    console.error('Error updating patient:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update patient' });
  }
};

// DELETE /api/patients/:id
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Checks the patient exists before attempting deletion to return a meaningful 404
    const existing = await db.queryOne(
        'SELECT * FROM patients WHERE patient_id = ?',
        [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    await db.execute('DELETE FROM patients WHERE patient_id = ?', [id]);

    res.status(200).json({ success: true, message: 'Patient deleted successfully' });

  } catch (error) {
    console.error('Error deleting patient:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete patient' });
  }
};

module.exports = { createPatient, getAllPatients, getPatientById, updatePatient, deletePatient };