// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import StatCards from '../components/StatCards';
import PriorityTable from '../components/PriorityTable';

const BASE_URL = 'http://localhost:3300';

const Dashboard = ({ clerkId }) => {
    const [patients, setPatients] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);

    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${BASE_URL}/api/patients`, {
                params: { clerk_id: clerkId, sortBy: 'risk' },
            });
            if (!res.data.success) throw new Error(res.data.message || 'Failed to fetch');
            setPatients(res.data.data || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clerkId]);

    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    // Derive stat counts from the shared patients array
    const counts = { high: 0, medium: 0, low: 0 };
    patients.forEach((p) => {
        const lvl = (p.risk_category || '').toLowerCase();
        if (lvl in counts) counts[lvl]++;
    });

    return (
        <div className="app">
            <Header />
            <main className="main-content">
                <StatCards counts={counts} loading={loading} />
                <PriorityTable
                    patients={patients}
                    loading={loading}
                    error={error}
                    onRefresh={fetchPatients}
                    clerkId={clerkId}
                />
            </main>
        </div>
    );
};

export default Dashboard;