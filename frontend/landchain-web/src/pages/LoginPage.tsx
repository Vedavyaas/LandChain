import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SAMPLE_CREDS = [
  { label: 'Admin',         username: 'admin1',      role: 'ADMIN',      emoji: '🛡' },
  { label: 'Govt',          username: 'government1',  role: 'GOVERNMENT', emoji: '🏛' },
  { label: 'Registrar',     username: 'registrar1',   role: 'REGISTRAR',  emoji: '📋' },
  { label: 'Owner / Buyer', username: 'owner1',        role: 'OWNER',      emoji: '🏠' },
  { label: 'Bank',          username: 'bank1',         role: 'BANK',       emoji: '🏦' },
  { label: 'Auditor',       username: 'auditor1',      role: 'AUDITOR',    emoji: '🔍' },
];

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // Tap a sample → auto-fill username + derived password
  const handleQuickFill = (username: string) => {
    setForm({ username, password: `${username}@landchain123` });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lc-auth-layout">
      <div className="lc-auth-card">
        {/* Header */}
        <div className="lc-auth-card__header">
          <div className="lc-auth-card__logo">⛓</div>
          <h1 className="lc-auth-card__title">LandChain</h1>
          <p className="lc-auth-card__subtitle">
            Permissioned Land Registry · Blockchain Network<br />
            <span style={{ color: 'var(--violet-light)', fontSize: '0.78rem' }}>Sign in to access the registry</span>
          </p>
        </div>

        {/* Quick-fill sample accounts */}
        <div style={{ marginBottom: '1.4rem' }}>
          <p style={{
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            fontWeight: 700,
            marginBottom: '0.6rem',
          }}>
            ⚡ Quick fill — tap any role
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.45rem',
          }}>
            {SAMPLE_CREDS.map((c) => (
              <button
                key={c.username}
                type="button"
                id={`quickfill-${c.role.toLowerCase()}`}
                onClick={() => handleQuickFill(c.username)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.7rem',
                  background: form.username === c.username
                    ? 'rgba(13,148,136,0.15)'
                    : 'rgba(13,148,136,0.06)',
                  border: `1px solid ${form.username === c.username ? '#0d9488' : 'rgba(13,148,136,0.2)'}`,
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: form.username === c.username ? '#2dd4bf' : 'var(--text-muted)',
                  transition: 'all 0.18s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (form.username !== c.username) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(13,148,136,0.35)';
                  }
                }}
                onMouseLeave={e => {
                  if (form.username !== c.username) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(13,148,136,0.2)';
                  }
                }}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="lc-error" style={{ marginBottom: '1rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Form */}
        <form className="lc-form" onSubmit={handleSubmit}>
          <div className="lc-form-group">
            <label className="lc-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="lc-input"
              name="username"
              autoComplete="username"
              placeholder="e.g. owner1"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="lc-form-group">
            <label className="lc-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="lc-input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password hint when auto-filled */}
          {form.username && form.password && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '-0.4rem' }}>
              🔑 <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--gold)', letterSpacing: '0.03em' }}>
                {form.username}@landchain123
              </span>
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            className="lc-btn lc-btn-primary lc-btn--full"
            disabled={loading}
            style={{ marginTop: '0.4rem' }}
          >
            {loading
              ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Authenticating…</>
              : '→ Sign In'}
          </button>
        </form>

        <div className="lc-auth-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
