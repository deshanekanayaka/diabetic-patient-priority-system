const { query } = require('../config/database');

// Fetches aggregated analytics data for a given clinician's patient list
const getAnalytics = async (req, res) => {
    // Reads the clinician's Clerk ID from the request URL parameters
    const { clerk_id } = req.query;

    // Rejects the request early if no clerk_id was provided
    if (!clerk_id) {
        return res.status(400).json({ error: 'clerk_id is required' });
    }

    try {
        // Groups patients into 10-year age buckets, split by risk category
        const ageDistribution = await query(
            `SELECT
                CASE
                    WHEN age BETWEEN 20 AND 29 THEN '20-29'
                    WHEN age BETWEEN 30 AND 39 THEN '30-39'
                    WHEN age BETWEEN 40 AND 49 THEN '40-49'
                    WHEN age BETWEEN 50 AND 59 THEN '50-59'
                    WHEN age BETWEEN 60 AND 69 THEN '60-69'
                    -- Catches all patients aged 70 and older
                    WHEN age >= 70             THEN '70+'
                    -- Fallback for ages outside the expected range
                    ELSE 'Other'
                END AS age_group,
                -- Included so the chart can stack bars by severity
                risk_category,
                COUNT(*) AS count
            FROM patients
            -- Scopes results to only this clinician's patients
            WHERE clerk_id = ?
            -- One row per unique age group and risk level pair
            GROUP BY age_group, risk_category
            ORDER BY age_group`,
            [clerk_id]
        );

        // Counts patients per 10-point risk score band for the histogram; excludes unscored records
        const riskScoreDistribution = await query(
            `SELECT
                CASE
                    WHEN risk_score BETWEEN 0  AND 9.99  THEN '0-10'
                    WHEN risk_score BETWEEN 10 AND 19.99 THEN '10-20'
                    WHEN risk_score BETWEEN 20 AND 29.99 THEN '20-30'
                    WHEN risk_score BETWEEN 30 AND 39.99 THEN '30-40'
                    WHEN risk_score BETWEEN 40 AND 49.99 THEN '40-50'
                    WHEN risk_score BETWEEN 50 AND 59.99 THEN '50-60'
                    WHEN risk_score BETWEEN 60 AND 69.99 THEN '60-70'
                    WHEN risk_score BETWEEN 70 AND 79.99 THEN '70-80'
                    WHEN risk_score BETWEEN 80 AND 89.99 THEN '80-90'
                    -- Upper bound is inclusive at 100
                    WHEN risk_score BETWEEN 90 AND 100   THEN '90-100'
                END AS score_band,
                COUNT(*) AS count
            FROM patients
            -- Scopes results to this clinician's patients
            WHERE clerk_id = ?
            -- Excludes patients who have not been scored yet
              AND risk_score IS NOT NULL
            -- One row per 10-point band, ordered for the histogram x-axis
            GROUP BY score_band
            ORDER BY score_band`,
            [clerk_id]
        );

        // MySQL returns COUNT(*) as a string, so each count is cast to a number
        res.json({
            ageDistribution: ageDistribution.map(r => ({ ...r, count: Number(r.count) })),
            riskScoreDistribution: riskScoreDistribution.map(r => ({ ...r, count: Number(r.count) })),
        });

    } catch (error) {
        // Logs the full error server-side and returns a safe message to the client
        console.error('Analytics query error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

module.exports = { getAnalytics };