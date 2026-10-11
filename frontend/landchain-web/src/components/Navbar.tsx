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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="lc-navbar__title">LandChain</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Decentralized Land Registry
          </span>
        </div>
      </Link>

      {user && (
        <div className="lc-navbar__right">
          <div className="lc-navbar__user">
            <div className="lc-navbar__user-dot" />
            <span style={{ fontWeight: 600 }}>{user.username}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
            <span className={`lc-role-badge lc-role-badge--${user.role}`} style={{ padding: '0.15rem 0.55rem', fontSize: '0.65rem' }}>
              {user.role}
            </span>
          </div>
          <button
            type="button"
            className="lc-btn lc-btn-ghost"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.76rem', borderRadius: 'var(--radius-sm)' }}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
