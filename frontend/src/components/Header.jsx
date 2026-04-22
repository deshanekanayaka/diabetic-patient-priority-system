import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';

const Header = () => {
    // Used to determine which nav link should be marked as active
    const location = useLocation();
    const { user } = useUser();

    // Builds a display name in the format "FirstName L." from the Clerk user object
    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`.trim()
        : '';

    return (
        <div className="header">
            <div className="header-left">
                <div className="header-title">Diabetic Patient Priority System</div>
            </div>

            <nav className="header-nav">
                <Link
                    to="/dashboard"
                    // Highlights the link when the current path matches
                    className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                    Dashboard
                </Link>
                <Link
                    to="/analytics"
                    className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}
                >
                    Analytics
                </Link>
            </nav>

            <div className="header-right">
                {/* Shows the abbreviated name next to the Clerk avatar button */}
                <span className="user-name">{displayName}</span>
                <UserButton />
            </div>
        </div>
    );
};

export default Header;