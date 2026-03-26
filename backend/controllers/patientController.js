// backend/controllers/patientController.js
const db = require('../config/database');
const axios = require('axios');
const { validateCreate, validateUpdate } = require('../utils/validation');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// ── POST /api/patients ────────────────────────────────────────────────────────
const createPatient = async (req, res) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const {
      clerk_id, age, sex, social_life,
      bp_systolic, bp_diastolic,
      cholesterol, triglycerides, hdl, ldl, vldl,
      hba1c, bmi, rbs,
    } = req.body;

    // Call ML service for risk scoring
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

    const result = await db.execute(sql, values);
    if (!result.success) throw new Error(result.error);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: {
        patient_id: result.data.insertId,
        ...req.body,
        risk_score,
        risk_category,
      },
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ success: false, message: 'Failed to create patient', errors: [error.message] });
  }
};

// ── GET /api/patients ─────────────────────────────────────────────────────────
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

    if (sortBy === 'risk') {
      sql += ' ORDER BY risk_score DESC';
    } else {
      sql += ' ORDER BY patient_id DESC';
    }

    const result = await db.query(sql, values);
    if (!result.success) throw new Error(result.error);

    res.status(200).json({ success: true, count: result.data.length, data: result.data });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patients', errors: [error.message] });
  }
};

// ── GET /api/patients/:id ─────────────────────────────────────────────────────
const getPatientById = async (req, res) => {
  try {
    const result = await db.queryOne('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
    if (!result.success) throw new Error(result.error);
    if (!result.data) return res.status(404).json({ success: false, message: 'Patient not found' });

    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patient', errors: [error.message] });
  }
};

// ── PUT /api/patients/:id ─────────────────────────────────────────────────────
// validateUpdate does NOT require clerk_id — the relationship is already set
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.queryOne('SELECT * FROM patients WHERE patient_id = ?', [id]);
    if (!existing.success) throw new Error(existing.error);
    if (!existing.data) return res.status(404).json({ success: false, message: 'Patient not found' });

    const errors = validateUpdate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const {
      age, sex, social_life,
      bp_systolic, bp_diastolic,
      cholesterol, triglycerides, hdl, ldl, vldl,
      hba1c, bmi, rbs,
    } = req.body;

    // Re-score via ML service
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

    const result = await db.execute(sql, values);
    if (!result.success) throw new Error(result.error);

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient_id: parseInt(id), ...req.body, risk_score, risk_category },
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ success: false, message: 'Failed to update patient', errors: [error.message] });
  }
};

// ── DELETE /api/patients/:id ──────────────────────────────────────────────────
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.queryOne('SELECT * FROM patients WHERE patient_id = ?', [id]);
    if (!existing.success) throw new Error(existing.error);
    if (!existing.data) return res.status(404).json({ success: false, message: 'Patient not found' });

    const result = await db.execute('DELETE FROM patients WHERE patient_id = ?', [id]);
    if (!result.success) throw new Error(result.error);

    res.status(200).json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ success: false, message: 'Failed to delete patient', errors: [error.message] });
  }
};

module.exports = { createPatient, getAllPatients, getPatientById, updatePatient, deletePatient };