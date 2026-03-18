import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Show, SignIn } from '@clerk/react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import './index.css';

function App() {
    return (
        <>
            <Show when="signed-out">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    backgroundColor: '#f0f2f5'
                }}>
                    <SignIn />
                </div>
            </Show>

            <Show when="signed-in">
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/analytics" element={<Analytics />} />
                    </Routes>
                </BrowserRouter>
            </Show>
        </>
    );
}

export default App;