/*
  controllers/patientController.js
  Handles all patient-related operations (CRUD)
*/

const db = require('../config/database');
const axios = require('axios');
const { validatePatientData } = require('../utils/validation');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

const createPatient = async (req, res) => {
  try {
    const errors = validatePatientData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Call ML model with 7 essential features
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      age: req.body.age,
      sex: req.body.sex,
      hba1c: req.body.hba1c,
      bmi: req.body.bmi,
      bp_systolic: req.body.bp_systolic,
      bp_diastolic: req.body.bp_diastolic,
      rbs: req.body.rbs
    });

    const { risk_score, risk_category } = mlResponse.data;

    const sql = `
      INSERT INTO patients (
        age, sex, social_life, cholesterol, triglycerides, 
        hdl, ldl, vldl, bp_systolic, bp_diastolic, 
        hba1c, bmi, rbs, genetic_family_history, 
        risk_score, risk_category, clinician_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      req.body.age,
      req.body.sex,
      req.body.social_life,
      req.body.cholesterol,
      req.body.triglycerides,
      req.body.hdl,
      req.body.ldl,
      req.body.vldl,
      req.body.bp_systolic,
      req.body.bp_diastolic,
      req.body.hba1c,
      req.body.bmi,
      req.body.rbs,
      req.body.genetic_family_history,
      risk_score,
      risk_category,
      req.body.clinician_id
    ];

    const result = await db.execute(sql, values);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: {
        patient_id: result.data.insertId,
        ...req.body,
        risk_score: risk_score,
        risk_category: risk_category
      }
    });

  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patient',
      errors: [error.message]
    });
  }
};

const getAllPatients = async (req, res) => {
  try {
    const { clinician_id, sortBy, riskLevel } = req.query;

    if (!clinician_id) {
      return res.status(400).json({
        success: false,
        message: 'clinician_id query parameter is required'
      });
    }

    let sql = 'SELECT * FROM patients WHERE clinician_id = ?';
    const values = [clinician_id];

    if (riskLevel) {
      sql += ' AND risk_category = ?';
      values.push(riskLevel);
    }

    if (sortBy === 'risk') {
      sql += ' ORDER BY risk_score DESC';
    } else {
      sql += ' ORDER BY patient_id DESC';
    }

    const result = await db.query(sql, values);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.status(200).json({
      success: true,
      count: result.data.length,
      data: result.data
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      errors: [error.message]
    });
  }
};

const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.queryOne(
      'SELECT * FROM patients WHERE patient_id = ?',
      [id]
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      errors: [error.message]
    });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const existing = await db.queryOne(
      'SELECT * FROM patients WHERE patient_id = ?',
      [id]
    );

    if (!existing.success) {
      throw new Error(existing.error);
    }

    if (!existing.data) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const errors = validatePatientData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Recalculate risk with 7 features
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
      age: req.body.age,
      sex: req.body.sex,
      hba1c: req.body.hba1c,
      bmi: req.body.bmi,
      bp_systolic: req.body.bp_systolic,
      bp_diastolic: req.body.bp_diastolic,
      rbs: req.body.rbs
    });

    const { risk_score, risk_category } = mlResponse.data;

    const sql = `
      UPDATE patients 
      SET age = ?, sex = ?, social_life = ?, cholesterol = ?, 
          triglycerides = ?, hdl = ?, ldl = ?, vldl = ?, 
          bp_systolic = ?, bp_diastolic = ?, hba1c = ?, 
          bmi = ?, rbs = ?, genetic_family_history = ?,
          risk_score = ?, risk_category = ?
      WHERE patient_id = ?
    `;

    const values = [
      req.body.age,
      req.body.sex,
      req.body.social_life,
      req.body.cholesterol,
      req.body.triglycerides,
      req.body.hdl,
      req.body.ldl,
      req.body.vldl,
      req.body.bp_systolic,
      req.body.bp_diastolic,
      req.body.hba1c,
      req.body.bmi,
      req.body.rbs,
      req.body.genetic_family_history,
      risk_score,
      risk_category,
      id
    ];

    const result = await db.execute(sql, values);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: {
        patient_id: parseInt(id),
        ...req.body,
        risk_score: risk_score,
        risk_category: risk_category
      }
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update patient',
      errors: [error.message]
    });
  }
};

const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const existing = await db.queryOne(
      'SELECT * FROM patients WHERE patient_id = ?',
      [id]
    );

    if (!existing.success) {
      throw new Error(existing.error);
    }

    if (!existing.data) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const result = await db.execute(
      'DELETE FROM patients WHERE patient_id = ?',
      [id]
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patient',
      errors: [error.message]
    });
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient
};