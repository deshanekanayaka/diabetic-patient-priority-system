/*
 * controllers/authController.js
 * Handles login and signup logic for clinicians
 */

const bcrypt = require('bcrypt');
const db = require('../config/database');

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    // Checks all required fields are present before any DB calls
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        errors: ['Please provide full name, email, and password']
      });
    }

    // Validates email follows standard format (e.g. user@domain.com)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: ['Please provide a valid email address']
      });
    }

    // Enforces minimum password length before hashing
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password too short',
        errors: ['Password must be at least 6 characters long']
      });
    }

    // queryOne returns the row directly or null — checks if email is already registered
    const existingUser = await db.queryOne(
        'SELECT email FROM clinicians WHERE email = ?',
        [email]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
        errors: ['This email is already in use. Please use a different email or login.']
      });
    }

    // Hashes password before storing — bcrypt automatically generates and applies a salt
    // 10 salt rounds is the standard balance between security and performance
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserts new clinician — stores hashed password, never plaintext
    const result = await db.execute(
        'INSERT INTO clinicians (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
    );

    // insertId is the auto-incremented ID assigned to the new row
    const newClinicianId = result.insertId;

    // Returns the new clinician's info — password excluded from response
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      clinician: {
        clinician_id: newClinicianId,
        name: name,
        email: email
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
      errors: [error.message]
    });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Checks both fields are present before any DB calls
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        errors: ['Please provide both email and password']
      });
    }

    // queryOne returns the row directly or null — null means no clinician with that email
    const clinician = await db.queryOne(
        'SELECT * FROM clinicians WHERE email = ?',
        [email]
    );

    // Generic error message intentional — does not reveal whether email or password is wrong
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      });
    }

    // Compares the plaintext password against the stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, clinician.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      });
    }

    // Returns clinician info on success — password excluded from response
    //auth session is managed by Clerk on the frontend
    res.json({
      success: true,
      message: 'Login successful!',
      clinician: {
        clinician_id: clinician.clinician_id,
        name: clinician.name,
        email: clinician.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      errors: [error.message]
    });
  }
}

module.exports = { signup, login };