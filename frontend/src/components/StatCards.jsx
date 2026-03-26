import React from 'react';

// StatCards no longer fetches on its own.
// Dashboard.jsx owns the data and passes counts + loading as props,
// so the cards update the instant a patient is added/edited/deleted.
const StatCards = ({ counts = { high: 0, medium: 0, low: 0 }, loading = false }) => {
    const display = (val) => (loading ? '…' : val);

    return (
        <div className="stat-cards-container">
            <div className="stat-card high">
                <p className="stat-card-title">High Risk Patients</p>
                <p className="stat-card-value">{display(counts.high)}</p>
            </div>
            <div className="stat-card medium">
                <p className="stat-card-title">Medium Risk Patients</p>
                <p className="stat-card-value">{display(counts.medium)}</p>
            </div>
            <div className="stat-card low">
                <p className="stat-card-title">Low Risk Patients</p>
                <p className="stat-card-value">{display(counts.low)}</p>
            </div>
        </div>
    );
};

export default StatCards;