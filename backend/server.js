// Load environment variables from .env file
require('dotenv').config();

// Import required packages
const express = require('express');
const cors = require('cors');

// Import database connection
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients')
const analyticsRouter = require('./routes/analytics');

// Create Express application
const app = express();

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Middleware

//CORS - Allow frontend to communicate with backend
app.use(cors({
  origin: 'http://localhost:5173', //(change to 3000 if using Create React App)
  credentials: true
}));

//Body Parsers - Parse incoming request data
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

//Request Logger - Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Test Routes

// Simple test route to verify server is working
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Diabetic Risk Classification System API is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - includes database status
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await db.query('SELECT 1 as test');
    
    res.json({
      success: true,
      status: 'healthy',
      database: dbTest.success ? 'connected' : 'disconnected',
      ml_service: 'not connected yet',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      status: 'degraded',
      database: 'disconnected',
      ml_service: 'not connected yet',
      timestamp: new Date().toISOString()
    });
  }
});

// Test database query endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    // Try to get count of patients
    const result = await db.query('SELECT COUNT(*) as count FROM patients');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Database query successful!',
        patient_count: result.data[0].count
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database query failed',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

// Api routes

// Authentication routes (login, signup)
app.use('/api/auth', authRoutes);

// Patient routes (CRUD)
app.use('/api/patients', patientRoutes);

//Analytics route (Charts)
app.use('/api/analytics', analyticsRouter);

// TODO: Add dashboard route

// Error handling

// 404 Handler - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    errors: err.errors || []
  });
});

// Start Server
async function startServer() {
  try {
    // Test database connection before starting server
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      console.log('\n Database connection failed!');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log('==========================================');
      console.log('  Diabetic Risk Classification System API');
      console.log('==========================================');
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log('------------------------------------------');
      console.log('Available Endpoints:');
      console.log(`  GET  http://localhost:${PORT}/`);
      console.log(`  GET  http://localhost:${PORT}/api/health`);
      console.log(`  GET  http://localhost:${PORT}/api/test-db`);
      console.log(`  POST http://localhost:${PORT}/api/auth/signup`);
      console.log(`  POST http://localhost:${PORT}/api/auth/login`);
      console.log(`  GET  http://localhost:${PORT}/api/patients`);
      console.log('==========================================');
      console.log('Press Ctrl+C to stop the server');
      console.log('==========================================\n');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down server gracefully...');
  await db.closePool();
  process.exit(0);
});