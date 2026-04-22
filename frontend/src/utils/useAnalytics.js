import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const API_BASE = import.meta.env.VITE_API_URL;

// Custom hook that fetches aggregated analytics data for the signed-in clinician
const useAnalytics = () => {
    const { user } = useUser();

    // Initialised with empty arrays so charts render without crashing before data arrives
    const [data, setData] = useState({
        ageDistribution: [],
        avgScoreByAge: [],
    });
    // Starts as true so the loading state is correct before the first effect runs
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Re-runs whenever the user object changes, e.g. after sign-in completes
    useEffect(() => {
        // Skips the fetch if Clerk hasn't resolved the user yet
        if (!user) return;

        // Allows the in-flight request to be cancelled if the component unmounts
        const controller = new AbortController();

        const fetchAnalytics = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/analytics?clerk_id=${user.id}`,
                    { signal: controller.signal }
                );
                // Treats non-2xx HTTP responses as errors since fetch doesn't throw on them
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setData(json);
            } catch (err) {
                // Ignores cancellation errors triggered by the cleanup function
                if (err.name !== 'AbortError') {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();

        // Cancels the fetch if the component unmounts before the response arrives
        return () => controller.abort();

    }, [user]);

    return { data, loading, error };
};

export default useAnalytics;