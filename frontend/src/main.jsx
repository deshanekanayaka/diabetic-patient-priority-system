import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <ClerkProvider
                publishableKey={publishableKey}
                signInUrl="/sign-in"
                signUpUrl="/sign-up"
                signInFallbackRedirectUrl="/dashboard"
                signUpFallbackRedirectUrl="/dashboard"
            >
                <App />
            </ClerkProvider>
        </BrowserRouter>
    </StrictMode>
)