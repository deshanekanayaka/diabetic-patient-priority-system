import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';

const Header = () => {
    const location = useLocation();
    const { user } = useUser();

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
                    to="/"
                    className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
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
                <span className="user-name">{displayName}</span>
                <UserButton />
            </div>
        </div>
    );
};

export default Header;