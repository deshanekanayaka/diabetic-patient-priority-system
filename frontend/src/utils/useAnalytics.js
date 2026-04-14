import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:3300';

const useAnalytics = () => {
    const { user } = useUser();
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        fetch(`${API_BASE}/api/analytics?clerk_id=${user.id}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [user]);

    return { data, loading, error };
};

export default useAnalytics;