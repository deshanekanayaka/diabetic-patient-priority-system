import React, {useState, useEffect, useCallback, useMemo} from 'react';
import axios from 'axios';
import Header from '../components/Header';
import StatCards from '../components/StatCards';
import PriorityTable from '../components/PriorityTable';

const BASE_URL = import.meta.env.VITE_API_URL;

// clerkId is passed from App.jsx and used to fetch only this clinician's patients
const Dashboard = ({ clerkId }) => {

    const [patients, setPatients] = useState([]); //Patients list fetched from backend
    const [loading,  setLoading]  = useState(true); //loading indicators in StatCards and PriorityTable
    const [error,    setError]    = useState(null); //error messages in PriorityTable

    // useCallback ensures fetchPatients is only re-created when clerkId changes
    // otherwise a new function reference is created on every render, causing infinite re-fetches
    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetches all patients for this clinician sorted by highest risk score first
            const res = await axios.get(`${BASE_URL}/api/patients`, {
                params: { clerk_id: clerkId, sortBy: 'risk' },
            });

            // Manually check the success field and throws an error if it's false,
            // forcing the code to jump to the catch block
            if (!res.data.success) throw new Error(res.data.message || 'Failed to fetch');

            // Falls back to empty array if data is missing so the table renders safely
            setPatients(res.data.data || []);

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            // Runs whether the request succeeds or fails — always clears the loading state
            setLoading(false);
        }
    }, [clerkId]);

    // Runs fetchPatients on mount and whenever clerkId changes
    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    //Only recalculates when the patients array actually changes. Or the loop would run
    // on every re-render
    const counts = useMemo(() => {

        const result = { high: 0, medium: 0, low: 0 };
        patients.forEach((patient) => {
            const riskLevel = (patient.risk_category || '').toLowerCase();
            if (riskLevel === 'high')   result.high++;
            if (riskLevel === 'medium') result.medium++;
            if (riskLevel === 'low')    result.low++;
        });
        return result;
    }, [patients]);

    return (
        <div className="app">
            <Header />
            <main className="main-content">

                {/* Receives derived counts — updates automatically when patients list changes */}
                <StatCards counts={counts} loading={loading} />

                {/* onRefresh allows PriorityTable to trigger a re-fetch after add/edit/delete */}
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