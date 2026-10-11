import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface RoleOption {
  role: Role;
  emoji: string;
  title: string;
  desc: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: 'OWNER',      emoji: '🏠', title: 'Property Owner', desc: 'Hold & trade titles' },
  { role: 'BUYER',      emoji: '🤝', title: 'Buyer',          desc: 'Acquire & inspect deeds' },
  { role: 'REGISTRAR',  emoji: '📋', title: 'Registrar',      desc: 'Verify & execute deeds' },
  { role: 'GOVERNMENT', emoji: '🏛', title: 'Gov Authority',  desc: 'Municipal land records' },
  { role: 'BANK',       emoji: '🏦', title: 'Bank / Lender',  desc: 'Mortgage & liens' },
  { role: 'AUDITOR',    emoji: '🔍', title: 'Auditor',        desc: 'Audit & compliance' },
];

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'OWNER' as Role,
    organization: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleSelect = (role: Role) => {
    setForm(prev => ({ ...prev, role }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({ ...form, organization: form.organization || undefined });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const orgRequired = ['GOVERNMENT', 'REGISTRAR', 'BANK'].includes(form.role);

  return (
    <div className="lc-auth-layout">
      <div className="lc-auth-card" style={{ maxWidth: 540 }}>
        <div className="lc-auth-card__header">
          <div className="lc-auth-card__logo">⛓</div>
          <h1 className="lc-auth-card__title">Create Account</h1>
          <p className="lc-auth-card__subtitle">Join the LandChain registry network</p>
        </div>

        {error && (
          <div className="lc-error" style={{ marginBottom: '1rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        <form className="lc-form" onSubmit={handleSubmit}>
          {/* Role selector - visual interactive cards instead of awkward dropdown */}
          <div className="lc-form-group" style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label className="lc-label" style={{ marginBottom: 0 }}>Select Platform Role</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--violet-light)', fontWeight: 600 }}>
                {ROLE_OPTIONS.find(r => r.role === form.role)?.title}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
              gap: '0.45rem',
            }}>
              {ROLE_OPTIONS.map((item) => {
                const isSelected = form.role === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    id={`role-btn-${item.role.toLowerCase()}`}
                    onClick={() => handleRoleSelect(item.role)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.55rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected
                        ? 'rgba(13, 148, 136, 0.16)'
                        : 'rgba(13, 148, 136, 0.04)',
                      border: isSelected
                        ? '1px solid #0d9488'
                        : '1px solid rgba(13, 148, 136, 0.16)',
                      boxShadow: isSelected
                        ? '0 0 12px rgba(13, 148, 136, 0.28), inset 0 0 0 1px rgba(45, 212, 191, 0.2)'
                        : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                      fontFamily: 'inherit',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(13, 148, 136, 0.09)';
                        e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(13, 148, 136, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.16)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{item.emoji}</span>
                      {isSelected && (
                        <span style={{
                          fontSize: '0.62rem',
                          background: '#0d9488',
                          color: '#fff',
                          borderRadius: '999px',
                          padding: '0.1rem 0.35rem',
                          fontWeight: 700,
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      lineHeight: 1.2,
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontSize: '0.64rem',
                      color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
                      lineHeight: 1.2,
                      marginTop: '0.15rem',
                    }}>
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div className="lc-form-group">
              <label className="lc-label" htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                className="lc-input"
                name="username"
                placeholder="e.g. demo_user"
                value={form.username}
                onChange={handleChange}
                required
                minLength={3}
              />
            </div>
            <div className="lc-form-group">
              <label className="lc-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="lc-input"
                type="password"
                name="password"
                placeholder="Min 8 chars"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="lc-form-group">
            <label className="lc-label" htmlFor="reg-fullname">Full Name</label>
            <input
              id="reg-fullname"
              className="lc-input"
              name="fullName"
              placeholder="e.g. Demo User"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="lc-form-group">
            <label className="lc-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className="lc-input"
              type="email"
              name="email"
              placeholder="e.g. demo.user@landchain.local"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {(orgRequired || form.organization) && (
            <div className="lc-form-group">
              <label className="lc-label" htmlFor="reg-org">
                Organization {orgRequired && <span style={{ color: 'var(--rose)' }}>*</span>}
              </label>
              <input
                id="reg-org"
                className="lc-input"
                name="organization"
                placeholder="e.g. Demo Registry Office, Apex Bank"
                value={form.organization}
                onChange={handleChange}
                required={orgRequired}
              />
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="lc-btn lc-btn-primary lc-btn--full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading
              ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating account…</>
              : '→ Register on LandChain'}
          </button>
        </form>

        <div className="lc-auth-link">
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
