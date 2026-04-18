const axios = require('axios');
const db = require('../config/database');
const { patientSchema, patientCreateSchema } = require('../utils/schema.js');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// Flattens Zod errors into a readable array
// e.g. ['age: Min 0', 'bp_systolic: Min 50']
const formatZodErrors = (zodError) =>
    zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

// POST /api/patients
const createPatient = async (req, res) => {
  try {
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

    // Get risk score from ML service
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

    if (!clerk_id) {
      return res.status(400).json({ success: false, message: 'clerk_id query parameter is required' });
    }

    let sql = 'SELECT * FROM patients WHERE clerk_id = ?';
    const values = [clerk_id];

    if (riskLevel && riskLevel !== 'all') {
      sql += ' AND risk_category = ?';
      values.push(riskLevel);
    }

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

    const existing = await db.queryOne(
        'SELECT * FROM patients WHERE patient_id = ?',
        [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

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

    // Re-score via ML service since health data changed
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