import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import type { Role } from '../types';

/* ── Role metadata ──────────────────────────────────────────────────────── */
const roleConfig: Record<Role, { icon: string; color: string }> = {
  ADMIN:      { icon: '🛡', color: 'var(--rose)' },
  GOVERNMENT: { icon: '🏛', color: 'var(--amber)' },
  REGISTRAR:  { icon: '📋', color: '#a78bfa' },
  OWNER:      { icon: '🏠', color: 'var(--cyan)' },
  BUYER:      { icon: '🤝', color: 'var(--emerald)' },
  BANK:       { icon: '🏦', color: '#fbbf24' },
  AUDITOR:    { icon: '🔍', color: '#94a3b8' },
};

/* ── Role permissions map ────────────────────────────────────────────────── */
const permissionMap: Record<Role, string[]> = {
  ADMIN:      ['Manage users', 'View all records', 'System configuration', 'Audit logs'],
  GOVERNMENT: ['Approve registrations', 'Issue land records', 'View all properties'],
  REGISTRAR:  ['Register properties', 'Process transfers', 'Upload documents'],
  OWNER:      ['View my properties', 'Initiate transfers', 'Upload documents'],
  BUYER:      ['Browse listings', 'Submit purchase requests', 'View documents'],
  BANK:       ['Verify ownership', 'Process mortgages', 'Access encumbrance records'],
  AUDITOR:    ['View audit trail', 'Generate reports', 'Read-only access'],
};

const ALL_PERMISSIONS = ['Manage users', 'Approve registrations', 'Register properties', 'View all records',
  'Process transfers', 'Upload documents', 'View my properties', 'Initiate transfers',
  'Browse listings', 'Submit purchase requests', 'View documents', 'Verify ownership',
  'Process mortgages', 'Access encumbrance records', 'View audit trail', 'Generate reports',
  'System configuration', 'Audit logs', 'Issue land records', 'View all properties',
  'Read-only access', 'Submit purchase requests'];

/* ── Fake activity feed (static for Step 1) ────────────────────────────── */
const makeActivity = (role: Role) => {
  const base = [
    { icon: '🔑', type: 'login', title: 'Authentication successful', hash: '0xa3f1…c8d2', time: 'Just now' },
    { icon: '⛓', type: 'block', title: 'Connected to LandChain network', hash: 'Block #00001', time: '1s ago' },
  ];
  if (['REGISTRAR', 'GOVERNMENT', 'ADMIN'].includes(role)) {
    base.push({ icon: '📜', type: 'reg', title: 'Registry node synchronized', hash: '0xb9e4…12f7', time: '2s ago' });
  }
  return base;
};

/* ── Stat cards ─────────────────────────────────────────────────────────── */
const statColors = ['--cyan', '--green', '--violet', '--amber'] as const;

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const rc = roleConfig[user.role];
  const perms = permissionMap[user.role];
  const activity = useMemo(() => makeActivity(user.role), [user.role]);
  const initials = user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      <Navbar />
      <main className="lc-dashboard">
        {/* Hero */}
        <div className="lc-dashboard__hero">
          <p className="lc-dashboard__welcome">⛓ LandChain Registry — Step 1</p>
          <h1 className="lc-dashboard__title">
            Welcome back, <span>{user.fullName.split(' ')[0]}</span>
          </h1>
          <p className="lc-dashboard__subtitle">
            You are authenticated as <strong style={{ color: 'var(--cyan)' }}>{user.role}</strong>
            {user.organization && <> · <strong style={{ color: 'var(--text-secondary)' }}>{user.organization}</strong></>}
          </p>
        </div>

        {/* Stats */}
        <div className="lc-stats">
          {[
            { label: 'Block Height', value: '000001', sub: 'Genesis block', color: 'cyan' },
            { label: 'Properties', value: '0', sub: 'On-chain records', color: 'green' },
            { label: 'Transactions', value: '0', sub: 'Pending: 0', color: 'violet' },
            { label: 'Network Peers', value: '0', sub: 'Step 2 onwards', color: 'amber' },
          ].map((s) => (
            <div key={s.label} className={`lc-stat-card lc-stat-card--${s.color}`}>
              <div className="lc-stat-card__label">{s.label}</div>
              <div className="lc-stat-card__value">{s.value}</div>
              <div className="lc-stat-card__sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="lc-dashboard__grid">

          {/* Identity card */}
          <div className="lc-card">
            <div className="lc-card__header">
              <span className="lc-card__title">⚿ &nbsp;Identity</span>
              <span className={`lc-role-badge lc-role-badge--${user.role}`}>
                {rc.icon} {user.role}
              </span>
            </div>
            <div className="lc-card__body">
              <div className="lc-identity">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="lc-identity__avatar">{initials}</div>
                  <div className="lc-identity__info">
                    <div className="lc-identity__name">{user.fullName}</div>
                    <div className="lc-identity__username">@{user.username}</div>
                  </div>
                </div>
                <div className="lc-identity__row">
                  <div className="lc-identity__field">
                    <label>User ID</label>
                    <span>#{String(user.id).padStart(6, '0')}</span>
                  </div>
                  <div className="lc-identity__field">
                    <label>Joined</label>
                    <span>{joinDate}</span>
                  </div>
                  <div className="lc-identity__field">
                    <label>Email</label>
                    <span style={{ fontSize: '0.78rem' }}>{user.email}</span>
                  </div>
                  {user.organization && (
                    <div className="lc-identity__field">
                      <label>Organization</label>
                      <span>{user.organization}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chain activity */}
          <div className="lc-card">
            <div className="lc-card__header">
              <span className="lc-card__title">📡 &nbsp;Chain Activity</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--emerald)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block', animation: 'pulse 2s infinite', boxShadow: '0 0 6px var(--emerald)' }} />
                LIVE
              </span>
            </div>
            <div className="lc-card__body">
              <div className="lc-activity">
                {activity.map((a, i) => (
                  <div key={i} className="lc-activity__item">
                    <div className={`lc-activity__icon lc-activity__icon--${a.type}`}>{a.icon}</div>
                    <div className="lc-activity__text">
                      <div className="lc-activity__title">{a.title}</div>
                      <div className="lc-activity__hash">{a.hash}</div>
                    </div>
                    <div className="lc-activity__time">{a.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="lc-card">
            <div className="lc-card__header">
              <span className="lc-card__title">🔒 &nbsp;Permissions</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {perms.length} / {ALL_PERMISSIONS.length} granted
              </span>
            </div>
            <div className="lc-card__body">
              <div className="lc-permissions">
                {['Approve registrations', 'Register properties', 'View all records', 'Process transfers', 'Upload documents', 'Audit logs', 'System configuration'].map((p) => (
                  <div key={p} className="lc-permission">
                    <span className="lc-permission__name">{p}</span>
                    <span className={`lc-permission__status lc-permission__status--${perms.includes(p) ? 'granted' : 'denied'}`}>
                      {perms.includes(p) ? '✓ Granted' : '— Denied'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Block counter */}
          <div className="lc-card">
            <div className="lc-card__header">
              <span className="lc-card__title">📦 &nbsp;Blockchain Status</span>
            </div>
            <div className="lc-card__body">
              <div className="lc-block-counter">
                <div className="lc-block-counter__number">000001</div>
                <div className="lc-block-counter__label">Current Block Height</div>
                <div className="lc-block-counter__status">
                  <div className="lc-block-counter__status-dot" />
                  Network Online — Awaiting Step 2
                </div>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.9rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  width: '100%',
                  fontSize: '0.75rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-muted)',
                  lineHeight: 1.9,
                }}>
                  <div><span style={{ color: 'var(--cyan)' }}>chain:</span>  landchain-dev</div>
                  <div><span style={{ color: 'var(--cyan)' }}>fabric:</span> v2.x (Step 3)</div>
                  <div><span style={{ color: 'var(--cyan)' }}>db:</span>     H2 in-memory</div>
                  <div><span style={{ color: 'var(--cyan)' }}>jwt:</span>    HS256 · 24h TTL</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
};

export default DashboardPage;
