const { query } = require('../config/database');

const getAnalytics = async (req, res) => {
    // clerk_id identifies which clinician's patients to analyse
    const { clerk_id } = req.query;

    if (!clerk_id) {
        return res.status(400).json({ error: 'clerk_id is required' });
    }

    try {
        // Age Distribution
        // Groups each patient into an age band (20-29, 30-39, etc.)
        // then counts how many fall into each risk category within that band.
        // Result shape: [{ age_group: '50-59', risk_category: 'high', count: 1 }, ...]
        const { data: ageDistribution } = await query(
            `SELECT
                CASE
                    WHEN age BETWEEN 20 AND 29 THEN '20-29'
                    WHEN age BETWEEN 30 AND 39 THEN '30-39'
                    WHEN age BETWEEN 40 AND 49 THEN '40-49'
                    WHEN age BETWEEN 50 AND 59 THEN '50-59'
                    WHEN age BETWEEN 60 AND 69 THEN '60-69'
                    WHEN age >= 70             THEN '70+'
                    ELSE 'Other'
                END AS age_group,
                risk_category,
                COUNT(*) AS count
            FROM patients
            WHERE clerk_id = ?
            GROUP BY age_group, risk_category
            ORDER BY age_group`,
            [clerk_id]
        );

        // Risk Category Distribution
        // Counts total patients in each risk category (low / medium / high).
        // FIELD() in ORDER BY forces a fixed order: low → medium → high
        // instead of alphabetical order.
        // Result shape: [{ risk_category: 'low', count: 4 }, ...]
        const { data: scoreDistribution } = await query(
            `SELECT
                risk_category,
                COUNT(*) AS count
             FROM patients
             WHERE clerk_id = ?
             GROUP BY risk_category
             ORDER BY FIELD(risk_category, 'low', 'medium', 'high')`,
            [clerk_id]
        );

        // Send both datasets to the frontend in a single response
        res.json({ ageDistribution, scoreDistribution });

    } catch (error) {
        console.error('Analytics query error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

module.exports = { getAnalytics };