const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');

// GET /api/analytics?clerk_id=xxx
router.get('/', getAnalytics);

module.exports = router;