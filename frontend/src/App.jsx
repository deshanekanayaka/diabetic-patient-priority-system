import { Routes, Route, Navigate } from 'react-router-dom';
import {
    SignIn,
    SignUp,
    SignedIn,
    SignedOut,
    RedirectToSignIn,
    useUser,
} from '@clerk/clerk-react';
import LandingPage from './pages/LandingPage';
import Dashboard   from './pages/Dashboard';
import Analytics   from './pages/Analytics';

// Shown while Clerk is still resolving the user's auth state
const LoadingScreen = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading…</p>
    </div>
);

// Reusable style object that centres Clerk's sign-in and sign-up cards on the page
const centredPage = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f9fafb',
};

// Wraps any route that requires the user to be signed in
function ProtectedRoute({ children }) {
    // isLoaded becomes true once Clerk has finished checking the session
    const { isLoaded, isSignedIn, user } = useUser();

    // Holds rendering until Clerk has resolved the auth state
    if (!isLoaded) return <LoadingScreen />;

    return (
        <>
            {/* Renders the page and passes the user object down to the child */}
            <SignedIn>{children(user)}</SignedIn>
            {/* Redirects unauthenticated visitors to the sign-in page */}
            <SignedOut><RedirectToSignIn /></SignedOut>
        </>
    );
}

// Defines all client-side routes and their auth requirements
export default function App() {
    return (
        <Routes>

            {/* Landing page — accessible without authentication */}
            <Route path="/" element={<LandingPage />} />

            {/* routing="path" is required so Clerk can manage its own internal sub-routes */}
            <Route
                path="/sign-in/*"
                element={
                    <div style={centredPage}>
                        <SignIn routing="path" path="/sign-in" />
                    </div>
                }
            />

            <Route
                path="/sign-up/*"
                element={
                    <div style={centredPage}>
                        <SignUp routing="path" path="/sign-up" />
                    </div>
                }
            />

            {/* Passes the Clerk user ID to Dashboard so it can scope API requests */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        {(user) => <Dashboard clerkId={user.id} />}
                    </ProtectedRoute>
                }
            />

            {/* Passes the Clerk user ID to Analytics so it can scope API requests */}
            <Route
                path="/analytics"
                element={
                    // children is a function (render prop pattern)- ProtectedRoute calls it
                    // with the user object so the child component receives clerkId without
                    // needing to access Clerk directly
                    <ProtectedRoute>
                        {(user) => <Analytics clerkId={user.id} />}
                    </ProtectedRoute>
                }
            />

            {/* Redirects any unrecognised path back to the landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
    );
}