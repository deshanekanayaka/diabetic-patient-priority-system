import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:3300';

// Custom hook that fetches analytics data for the current clinician.
// Returns data, loading, and error so Analytics.jsx can handle each state.
// data shape: { ageDistribution: [...], scoreDistribution: [...] }
const useAnalytics = () => {
    const { user } = useUser();

    // Initialised with empty arrays so the chart builders never receive undefined
    // while waiting for the API response
    const [data,    setData]    = useState({
        ageDistribution: [],
        scoreDistribution: []
    });
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        // Wait until Clerk has resolved the user before fetching
        if (!user) return;

        setLoading(true);

        fetch(`${API_BASE}/api/analytics?clerk_id=${user.id}`)
            .then(res => {
                // Throw so the catch block handles non-2xx responses
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                // data shape from backend:
                // {
                //   ageDistribution:   [{ age_group, risk_category, count }, ...],
                //   scoreDistribution: [{ risk_category, count }, ...]
                // }
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });

    }, [user]); // re-fetch if the logged-in user changes

    return { data, loading, error };
};

export default useAnalytics;