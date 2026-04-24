// Loads environment variables from .env before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const analyticsRouter = require('./routes/analytics');

const app = express();

const PORT = process.env.PORT || 3000;

// Allows requests from the Vite dev server
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://diabetic-patient-priority-system.vercel.app'
  ],
  credentials: true
}));

// Parses incoming JSON request bodies
app.use(express.json());

// Parses URL-encoded form bodies
app.use(express.urlencoded({ extended: true }));

// Logs every incoming request with timestamp, method, and path
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic ping route to confirm the server is running
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Diabetic Patient Priority System API is running!',
    timestamp: new Date().toISOString()
  });
});

// Mounts route handlers at their respective base paths
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/analytics', analyticsRouter);

// Returns 404 for any route not matched above
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Catches any unhandled errors thrown by route handlers
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    errors: err.errors || []
  });
});

async function startServer() {
  try {
    // Tests DB connection before accepting any requests
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
      console.log('\n Database connection failed!');
    }

    app.listen(PORT, () => {
      console.log('==========================================');
      console.log('  Diabetic Patient Priority System API');
      console.log('==========================================');
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log('------------------------------------------');
      console.log('Available Endpoints:');
      console.log(`  GET  http://localhost:${PORT}/`);
      console.log(`  POST http://localhost:${PORT}/api/auth/signup`);
      console.log(`  POST http://localhost:${PORT}/api/auth/login`);
      console.log(`  GET  http://localhost:${PORT}/api/patients`);
      console.log('==========================================\n');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Closes DB pool cleanly when the server is stopped with Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\nShutting down server gracefully...');
  await db.closePool();
  process.exit(0);
});