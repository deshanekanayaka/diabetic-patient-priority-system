// frontend/src/App.jsx
import { SignIn, useUser } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

const App = () => {
    const { isLoaded, isSignedIn, user } = useUser();

    // Wait for Clerk to finish loading — prevents "Cannot read properties of
    // undefined (reading 'id')" crash on page refresh
    if (!isLoaded) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading…</p>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <SignIn />
            </div>
        );
    }

    // user.id is safe to access here — Clerk is loaded and user is signed in
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/"          element={<Dashboard clerkId={user.id} />} />
                <Route path="/analytics" element={<Analytics clerkId={user.id} />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;