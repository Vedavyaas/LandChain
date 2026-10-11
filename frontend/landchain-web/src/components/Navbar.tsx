import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="lc-navbar">
      <Link to="/dashboard" className="lc-navbar__brand">
        <div className="lc-navbar__logo">⛓</div>
        <span className="lc-navbar__title">LandChain</span>
      </Link>

      {user && (
        <div className="lc-navbar__right">
          <div className="lc-navbar__user">
            <div className="lc-navbar__user-dot" />
            <span>{user.username}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
            <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: '0.72rem' }}>
              {user.role}
            </span>
          </div>
          <button className="lc-btn lc-btn-danger" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
