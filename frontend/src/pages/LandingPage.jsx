import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="lp-root">
            <div className="lp-bg" />
            <div className="lp-grid" />

            {/* Decorative circle — right */}
            <svg className="lp-deco-right" width="200" height="200" viewBox="0 0 220 220" fill="none">
                <circle cx="110" cy="110" r="100" stroke="#2563eb" strokeWidth="1" />
                <circle cx="110" cy="110" r="72"  stroke="#2563eb" strokeWidth="1" />
                <circle cx="110" cy="110" r="44"  stroke="#2563eb" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="10"  y1="110" x2="210" y2="110" stroke="#2563eb" strokeWidth="0.8" strokeDasharray="3 6" />
                <line x1="110" y1="10"  x2="110" y2="210" stroke="#2563eb" strokeWidth="0.8" strokeDasharray="3 6" />
                <circle cx="110" cy="38"  r="4" fill="#2563eb" />
                <circle cx="182" cy="110" r="4" fill="#2563eb" />
                <circle cx="110" cy="182" r="4" fill="#2563eb" />
                <circle cx="38"  cy="110" r="4" fill="#2563eb" />
            </svg>

            {/* Decorative medical cross — left */}
            <svg className="lp-deco-left" width="140" height="140" viewBox="0 0 160 160" fill="none">
                <rect x="60" y="20" width="40" height="120" rx="6" stroke="#2563eb" strokeWidth="1.5" />
                <rect x="20" y="60" width="120" height="40" rx="6" stroke="#2563eb" strokeWidth="1.5" />
                <rect x="68" y="28" width="24" height="104" rx="4" fill="#2563eb" fillOpacity="0.08" />
                <rect x="28" y="68" width="104" height="24" rx="4" fill="#2563eb" fillOpacity="0.08" />
            </svg>

            {/* Navbar */}
            <nav className="lp-nav">
                <div className="lp-logo">
                    <div className="lp-logo-icon">
                        <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                            <rect x="6.5" y="1"   width="5"  height="16" rx="2" fill="white" />
                            <rect x="1"   y="6.5" width="16" height="5"  rx="2" fill="white" />
                        </svg>
                    </div>
                    <span className="lp-logo-wordmark">Diabetic Patient Priority System</span>
                </div>
            </nav>

            {/* Hero */}
            <section className="lp-hero">

                <h1 className="lp-headline">
                    Prioritise the patients<br />
                    who need you <em>most</em>
                </h1>

                <p className="lp-sub">
                    Web-based priority system for managing and prioritizing diabetic
                    patients using ML risk scoring.
                </p>

                <div className="lp-ctas">
                    <button
                        className="lp-btn-primary"
                        onClick={() => navigate('/sign-up')}
                    >
                        Create account
                    </button>
                    <button
                        className="lp-btn-secondary"
                        onClick={() => navigate('/sign-in')}
                    >
                        Sign in →
                    </button>
                </div>

            </section>

            <footer className="lp-footer">
                Diabetic Patient Priority System
            </footer>
        </div>
    );
}