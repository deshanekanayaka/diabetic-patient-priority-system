const axios = require('axios');
const db = require('../config/database');
const { patientSchema, patientCreateSchema } = require('../utils/schema.js');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// Flattens Zod's nested error structure into a flat array of readable strings
// e.g. ['age: Min 0', 'bp_systolic: Min 50']
const formatZodErrors = (zodError) =>
    zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

// clerk_id is included here because it must be stored with the record to scope it to the clinician
const REQUIRED_CREATE_FIELDS = [
  'clerk_id', 'age', 'sex', 'social_life',
  'bp_systolic', 'bp_diastolic', 'bmi',
  'cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl',
  'hba1c', 'rbs',
];

// clerk_id is omitted on updates since it cannot change after creation
const REQUIRED_UPDATE_FIELDS = [
  'age', 'sex', 'social_life',
  'bp_systolic', 'bp_diastolic', 'bmi',
  'cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl',
  'hba1c', 'rbs',
];

// Returns a list of fields that are absent or empty in the request body
const getMissingFields = (body, fields) =>
    fields.filter(
        (field) =>
            body[field] === undefined ||
            body[field] === null ||
            body[field] === ''
    );

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

    // Sends the seven key clinical indicators to the ML service to compute a risk score
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      age, sex, hba1c, bmi, bp_systolic, bp_diastolic, rbs,
    });
    const { risk_score, risk_category } = mlResponse.data;

    const sql = `
      INSERT INTO patients
        (clerk_id, age, sex, social_life,
         cholesterol, triglycerides, hdl, ldl, vldl,
         bp_systolic, bp_diastolic, hba1c, bmi, rbs,
         risk_score, risk_category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      clerk_id, age, sex, social_life,
      cholesterol, triglycerides, hdl, ldl, vldl,
      bp_systolic, bp_diastolic, hba1c, bmi, rbs,
      risk_score, risk_category,
    ];

    const dbResult = await db.execute(sql, values);

    // Returns the new patient's ID and ML-assigned risk so the frontend can display them immediately
    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: { patient_id: dbResult.insertId, risk_score, risk_category },
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

    // Appends a risk level filter only when a specific level is requested
    if (riskLevel && riskLevel !== 'all') {
      sql += ' AND risk_category = ?';
      values.push(riskLevel);
    }

    // Defaults to newest-first order; switches to highest risk first when sortBy is "risk"
    sql += sortBy === 'risk' ? ' ORDER BY risk_score DESC' : ' ORDER BY patient_id DESC';

    const patients = await db.query(sql, values);

    res.status(200).json({ success: true, count: patients.length, data: patients });

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

    res.status(200).json({ success: true, data: patient });

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

    // Re-scores the patient because any health data change may shift their risk category
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      age, sex, hba1c, bmi, bp_systolic, bp_diastolic, rbs,
    });
    const { risk_score, risk_category } = mlResponse.data;

    const sql = `
      UPDATE patients SET
        age=?, sex=?, social_life=?,
        cholesterol=?, triglycerides=?, hdl=?, ldl=?, vldl=?,
        bp_systolic=?, bp_diastolic=?,
        hba1c=?, bmi=?, rbs=?,
        risk_score=?, risk_category=?
      WHERE patient_id=?
    `;

    const values = [
      age, sex, social_life,
      cholesterol, triglycerides, hdl, ldl, vldl,
      bp_systolic, bp_diastolic,
      hba1c, bmi, rbs,
      risk_score, risk_category,
      id,
    ];

    await db.execute(sql, values);

    // Returns the updated risk details so the frontend can refresh the row without a separate fetch
    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient_id: parseInt(id), risk_score, risk_category },
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