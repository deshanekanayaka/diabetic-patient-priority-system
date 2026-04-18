/*
 * Database.js
 * This file is responsible for creating and managing a reusable MySQL
 * connection pool for the application.
 *
 * This allows controllers to use the same connection instead of creating
 * new ones each time
 */

const mysql = require('mysql2');

// Create a connection pool
// A pool manages multiple connections and reuses them efficiently
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'diabetic_db',
  waitForConnections: true,
  connectionLimit: 10,  // Maximum 10 simultaneous connections
  queueLimit: 0         // No limit on queued connection requests
});

// Convert pool to use promises instead of callbacks
const promisePool = pool.promise();

// Test if database connection works
async function testConnection() {
  try {
    await promisePool.query('SELECT 1');
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Execute a SELECT query — throws on failure so the caller handles it
async function query(sql, params = []) {
  const [rows] = await promisePool.query(sql, params);
  return rows;
}

// Execute an INSERT/UPDATE/DELETE query — throws on failure so the caller handles it
async function execute(sql, params = []) {
  const [result] = await promisePool.execute(sql, params);
  return result;
}

// Get a single row — returns null if nothing found
async function queryOne(sql, params = []) {
  const [rows] = await promisePool.query(sql, params);
  return rows[0] || null;
}

// Close all connections when app shuts down
async function closePool() {
  try {
    await promisePool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
  }
}

module.exports = {
  pool: promisePool,  // Direct access to pool if needed
  testConnection,
  query,
  execute,
  queryOne,
  closePool
};