// import React from 'react';
//
// const StatCards = () => {
//   return (
//     <div className="stat-cards-container">
//       <div className="stat-card high">
//         <div className="stat-card-title">High Risk Patients</div>
//         <div className="stat-card-value">24</div>
//       </div>
//
//       <div className="stat-card medium">
//         <div className="stat-card-title">Medium Risk Patients</div>
//         <div className="stat-card-value">8</div>
//       </div>
//
//       <div className="stat-card low">
//         <div className="stat-card-title">Low Risk Patients</div>
//         <div className="stat-card-value">12</div>
//       </div>
//     </div>
//   );
// };
//
// export default StatCards;

// frontend/src/components/StatCards.jsx
import React, { useEffect, useState } from 'react';
import axios from "axios";


const BASE_URL = 'http://localhost:3300';
const DEFAULT_CLINICIAN_ID = 1; // replace with Clerk user id when auth is wired

const StatCards = () => {
    const [counts, setCounts]   = useState({ high: 0, medium: 0, low: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Reuse the patients list — no extra endpoint needed
                const res = await axios.get(`${BASE_URL}/api/patients`, {
                    params: { clinician_id: DEFAULT_CLINICIAN_ID, sortBy: 'risk' },
                });

                if (res.data.success) {
                    const totals = { high: 0, medium: 0, low: 0 };
                    res.data.data.forEach((p) => {
                        const lvl = (p.risk_category || '').toLowerCase();
                        if (totals[lvl] !== undefined) totals[lvl]++;
                    });
                    setCounts(totals);
                }
            } catch (err) {
                console.error('StatCards fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCounts();
    }, []);

    return (
        <div className="stat-cards-container">
            <div className="stat-card high">
                <p className="stat-card-title">High Risk Patients</p>
                <p className="stat-card-value">{loading ? '…' : counts.high}</p>
            </div>
            <div className="stat-card medium">
                <p className="stat-card-title">Medium Risk Patients</p>
                <p className="stat-card-value">{loading ? '…' : counts.medium}</p>
            </div>
            <div className="stat-card low">
                <p className="stat-card-title">Low Risk Patients</p>
                <p className="stat-card-value">{loading ? '…' : counts.low}</p>
            </div>
        </div>
    );
};

export default StatCards;