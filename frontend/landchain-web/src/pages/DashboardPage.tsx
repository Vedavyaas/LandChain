import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';
import { adminApi } from '../api/client';
import type { Role, User, AuditLog } from '../types';

/* ── Default Seed Members for immediate interactive management ───────────── */
const INITIAL_MEMBERS: User[] = [
  { id: 1,  username: 'admin1',      fullName: 'Admin Operator 01', email: 'admin1@demo.landchain.local', role: 'ADMIN',      organization: 'LandChain Demo Auth', enabled: true, createdAt: '2026-10-11T10:00:00' },
  { id: 2,  username: 'government1', fullName: 'Gov Officer Demo 1', email: 'gov1@demo.landchain.local',   role: 'GOVERNMENT', organization: 'Demo Land Authority', enabled: true, createdAt: '2026-10-11T10:01:00' },
  { id: 3,  username: 'government2', fullName: 'Gov Officer Demo 2', email: 'gov2@demo.landchain.local',   role: 'GOVERNMENT', organization: 'Demo Revenue Office', enabled: true, createdAt: '2026-10-11T10:02:00' },
  { id: 4,  username: 'registrar1',  fullName: 'Registrar Desk 01',  email: 'registrar1@demo.landchain.local',role: 'REGISTRAR',  organization: 'Sub-Registrar Unit A', enabled: true, createdAt: '2026-10-11T10:03:00' },
  { id: 5,  username: 'registrar2',  fullName: 'Registrar Desk 02',  email: 'registrar2@demo.landchain.local',role: 'REGISTRAR',  organization: 'Sub-Registrar Unit B', enabled: true, createdAt: '2026-10-11T10:04:00' },
  { id: 6,  username: 'owner1',      fullName: 'Demo Owner Alpha',   email: 'owner1@demo.landchain.local',    role: 'OWNER',      enabled: true, createdAt: '2026-10-11T10:05:00' },
  { id: 7,  username: 'owner2',      fullName: 'Demo Owner Beta',    email: 'owner2@demo.landchain.local',    role: 'OWNER',      enabled: true, createdAt: '2026-10-11T10:06:00' },
  { id: 8,  username: 'owner3',      fullName: 'Demo Owner Gamma',   email: 'owner3@demo.landchain.local',    role: 'OWNER',      enabled: true, createdAt: '2026-10-11T10:07:00' },
  { id: 9,  username: 'buyer1',      fullName: 'Demo Citizen Alpha',   email: 'buyer1@demo.landchain.local',    role: 'OWNER',      enabled: true, createdAt: '2026-10-11T10:08:00' },
  { id: 10, username: 'buyer2',      fullName: 'Demo Citizen Beta',    email: 'buyer2@demo.landchain.local',    role: 'OWNER',      enabled: true, createdAt: '2026-10-11T10:09:00' },
  { id: 11, username: 'bank1',       fullName: 'Bank Agent Demo 1',  email: 'bank1@demo.landchain.local',     role: 'BANK',       organization: 'Demo Commercial Bank', enabled: true, createdAt: '2026-10-11T10:10:00' },
  { id: 12, username: 'bank2',       fullName: 'Bank Agent Demo 2',  email: 'bank2@demo.landchain.local',     role: 'BANK',       organization: 'Demo Apex Bank',       enabled: true, createdAt: '2026-10-11T10:11:00' },
  { id: 13, username: 'auditor1',    fullName: 'Auditor Desk Demo 1', email: 'auditor1@demo.landchain.local', role: 'AUDITOR',    organization: 'Demo Oversight Bureau', enabled: true, createdAt: '2026-10-11T10:12:00' },
  { id: 14, username: 'auditor2',    fullName: 'Auditor Desk Demo 2', email: 'auditor2@demo.landchain.local', role: 'AUDITOR',    organization: 'Demo Compliance Unit',  enabled: true, createdAt: '2026-10-11T10:13:00' },
];

/* ── Initial Seed Audit Logs ─────────────────────────────────────────────── */
const INITIAL_LOGS: AuditLog[] = [
  { id: 'log-01', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), eventType: 'LOGIN_SUCCESS',        actor: 'admin1', target: '@admin1',              details: 'Admin console session authenticated via JWT', status: 'SUCCESS' },
  { id: 'log-02', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), eventType: 'USER_REGISTERED',      actor: 'owner1', target: '@owner1',              details: 'Participant joined registry as OWNER',        status: 'SUCCESS' },
  { id: 'log-03', timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(), eventType: 'SEED_ACCOUNTS_LOADED', actor: 'system', target: 'Identity Registry',     details: '14 seed participant accounts verified',       status: 'SUCCESS' },
  { id: 'log-04', timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(), eventType: 'RBAC_ENFORCED',         actor: 'system', target: 'Access Control Layer', details: 'Role permissions active across all participant classes', status: 'SUCCESS' },
  { id: 'log-05', timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(), eventType: 'SYSTEM_BOOTSTRAP',      actor: 'system', target: 'LandChain Core',       details: 'Registry core initialized · Centralized state confirmed', status: 'SUCCESS' },
];

/* ── Role Workspaces for Desk tab ────────────────────────────────────────── */
interface RoleWorkspace {
  sectionTitle: string;
  summary: string;
  buttonLabel: string;
}

const ROLE_WORKSPACES: Record<Role, RoleWorkspace> = {
  OWNER: {
    sectionTitle: 'My Properties & Title Purchases',
    summary: 'Manage owned cadastral titles and explore the public registry to acquire properties.',
    buttonLabel: '🏡 My Properties',
  },
  REGISTRAR: {
    sectionTitle: 'Deed Processing Queue',
    summary: 'Queue clear. 0 deeds awaiting execution.',
    buttonLabel: '📝 Review Deeds',
  },
  GOVERNMENT: {
    sectionTitle: 'Jurisdiction Records',
    summary: 'Cadastral records and zoning endorsements active.',
    buttonLabel: '🗺 Land Parcels',
  },
  BANK: {
    sectionTitle: 'Lien Operations',
    summary: '0 active mortgage encumbrances on file.',
    buttonLabel: '🏦 File Encumbrance',
  },
  AUDITOR: {
    sectionTitle: 'Ledger Inspection',
    summary: 'Ledger consistency and event log verified.',
    buttonLabel: '📊 Run Audit Check',
  },
  ADMIN: {
    sectionTitle: 'Platform Operations',
    summary: 'Identity provisioning and gateway security normal.',
    buttonLabel: '👥 Manage Access',
  },
};

/* ── Role Privileges list ────────────────────────────────────────────────── */
const ROLE_ACTIONS: Record<Role, string[]> = {
  ADMIN: [
    'User provisioning & access control',
    'System configuration & settings',
    'Audit & security log inspection',
    'Policy & role enforcement',
  ],
  GOVERNMENT: [
    'Zoning & parcel classification',
    'Government land endorsements',
    'Cadastral boundary governance',
    'Tax compliance verification',
  ],
  REGISTRAR: [
    'Deed registration & execution',
    'Title transfer approvals',
    'Document verification',
    'Public registry maintenance',
  ],
  OWNER: [
    'Manage owned land titles & property records',
    'Explore public cadastre & initiate purchases',
    'Inspect deeds & verify SHA-256 signatures',
    'Check property encumbrance & liens',
  ],
  BANK: [
    'Register mortgage encumbrances',
    'Check title lien status',
    'Issue lien clearance certificates',
    'Solvency verification',
  ],
  AUDITOR: [
    'Inspect registry transactions',
    'Verify cryptographic integrity',
    'Export compliance audits',
    'Track ownership history',
  ],
};

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'desk' | 'members' | 'logs' | 'profile' | 'privileges'>('desk');

  // Admin State
  const [members, setMembers] = useState<User[]>(() => {
    const saved = localStorage.getItem('lc_admin_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('lc_admin_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with backend if available
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      adminApi.getUsers().then(apiUsers => {
        if (apiUsers && apiUsers.length > 0) {
          setMembers(apiUsers);
          localStorage.setItem('lc_admin_members', JSON.stringify(apiUsers));
        }
      }).catch(() => {
        // Backend offline or mock fallback
      });

      adminApi.getLogs().then(apiLogs => {
        if (apiLogs && apiLogs.length > 0) {
          setLogs(apiLogs);
          localStorage.setItem('lc_admin_logs', JSON.stringify(apiLogs));
        }
      }).catch(() => {
        // Mock fallback
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const workspace = ROLE_WORKSPACES[user.role] || ROLE_WORKSPACES.OWNER;
  const actions = ROLE_ACTIONS[user.role] || ROLE_ACTIONS.OWNER;
  const initials = user.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Active';

  // Admin Toggle Member Status
  const handleToggleMember = async (targetUser: User) => {
    if (targetUser.username === user.username) {
      setToastMessage('Cannot disable your own administrator account.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setTogglingId(targetUser.id);
    const newStatus = !(targetUser.enabled ?? true);

    try {
      await adminApi.toggleUserStatus(targetUser.id);
    } catch {
      // offline fallback handled below
    }

    const updated = members.map(m => m.id === targetUser.id ? { ...m, enabled: newStatus } : m);
    setMembers(updated);
    localStorage.setItem('lc_admin_members', JSON.stringify(updated));

    // Append to audit logs
    const newLog: AuditLog = {
      id: 'log-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      eventType: newStatus ? 'USER_ENABLED' : 'USER_DISABLED',
      actor: user.username,
      target: `@${targetUser.username}`,
      details: `Account ${newStatus ? 're-enabled' : 'disabled'} by administrator`,
      status: newStatus ? 'SUCCESS' : 'WARNING',
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('lc_admin_logs', JSON.stringify(updatedLogs));

    setToastMessage(`@${targetUser.username} ${newStatus ? 'activated' : 'disabled'}`);
    setTimeout(() => setToastMessage(null), 3000);
    setTogglingId(null);
  };

  // Filtered members for Admin
  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const isEnabled = m.enabled ?? true;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isEnabled) ||
      (statusFilter === 'DISABLED' && !isEnabled);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.enabled ?? true).length;
  const disabledMembers = totalMembers - activeMembers;

  return (
    <div className="lc-portal-wrapper">
      {/* Sleek Dynamic Sidebar with sole Logout button */}
      <DynamicSidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          if (tabId === 'properties') {
            navigate('/properties');
          } else if (tabId === 'blockchain') {
            navigate('/blockchain');
          } else {
            setActiveTab(tabId as any);
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      <div className="lc-portal-main">
        {/* Unified Top Bar */}
        <header className="lc-topbar">
          <div className="lc-topbar__left">
            <span className="lc-topbar__crumb-section">LandChain</span>
            <span className="lc-topbar__crumb-sep">/</span>
            <span className="lc-topbar__crumb-current">
              {activeTab === 'desk' && 'Desk'}
              {activeTab === 'members' && 'Manage Members'}
              {activeTab === 'logs' && 'Audit Logs'}
              {activeTab === 'profile' && 'Profile'}
              {activeTab === 'privileges' && 'Privileges'}
            </span>
          </div>

          <div className="lc-topbar__right">
            <div className="lc-topbar__user">
              <span className="lc-topbar__user-name">{user.fullName}</span>
              <span className={`lc-role-badge lc-role-badge--${user.role}`} style={{ padding: '0.15rem 0.55rem', fontSize: '0.66rem' }}>
                {user.role}
              </span>
            </div>
          </div>
        </header>

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '4.5rem',
            right: '2rem',
            background: 'rgba(13, 148, 136, 0.95)',
            color: '#fff',
            padding: '0.65rem 1.1rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: '0.82rem',
            fontWeight: 600,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.25s ease',
          }}>
            <span>⚡</span> {toastMessage}
          </div>
        )}

        {/* Main Content Area */}
        <main className="lc-portal-content">

          {/* TAB 1: DESK */}
          {activeTab === 'desk' && (
            <div className="lc-clean-view">
              <div className="lc-desk-header">
                <div>
                  <h1 className="lc-desk-title">{user.role} Desk</h1>
                  <p className="lc-desk-sub">
                    {user.organization || 'Independent Portal'}
                  </p>
                </div>
                <div className="lc-status-pill">
                  <span className="lc-status-dot" />
                  <span>Online · Ready</span>
                </div>
              </div>

              {/* Quick metrics */}
              <div className="lc-mini-stats">
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Account</span>
                  <span className="lc-mini-stat__val">@{user.username}</span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Role</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--violet-light)' }}>{user.role}</span>
                </div>
                {user.role === 'ADMIN' ? (
                  <>
                    <div className="lc-mini-stat">
                      <span className="lc-mini-stat__label">Active Members</span>
                      <span className="lc-mini-stat__val" style={{ color: 'var(--emerald)' }}>{activeMembers}</span>
                    </div>
                    <div className="lc-mini-stat">
                      <span className="lc-mini-stat__label">Disabled</span>
                      <span className="lc-mini-stat__val" style={{ color: disabledMembers > 0 ? 'var(--rose)' : 'var(--text-muted)' }}>
                        {disabledMembers}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lc-mini-stat">
                      <span className="lc-mini-stat__label">Organization</span>
                      <span className="lc-mini-stat__val" style={{ fontSize: '0.8rem' }}>{user.organization || '—'}</span>
                    </div>
                    <div className="lc-mini-stat">
                      <span className="lc-mini-stat__label">ID</span>
                      <span className="lc-mini-stat__val">#{String(user.id).padStart(5, '0')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Operational Workspace Card */}
              <div className="lc-card">
                <div className="lc-card__header">
                  <span className="lc-card__title">{workspace.sectionTitle}</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--emerald)', fontWeight: 600 }}>Active</span>
                </div>
                <div className="lc-card__body">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                      {user.role === 'ADMIN'
                        ? `${totalMembers} registered participant accounts under administrative governance.`
                        : workspace.summary}
                    </p>
                    <button
                      type="button"
                      className="lc-btn lc-btn-primary"
                      style={{ padding: '0.5rem 1.1rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        if (user.role === 'ADMIN') {
                          setActiveTab('members');
                        } else if (user.role === 'GOVERNMENT') {
                          navigate('/properties/register');
                        } else {
                          navigate('/properties');
                        }
                      }}
                    >
                      {user.role === 'ADMIN' ? '👥 Manage Members Workflow' : workspace.buttonLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS MANAGEMENT WORKFLOW (ADMIN ONLY) */}
          {activeTab === 'members' && user.role === 'ADMIN' && (
            <div className="lc-clean-view">
              <div className="lc-desk-header">
                <div>
                  <h1 className="lc-desk-title">Manage Members</h1>
                  <p className="lc-desk-sub">
                    {activeMembers} active · {disabledMembers} disabled · {totalMembers} total members
                  </p>
                </div>
              </div>

              {/* Search & Filters */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                {/* Search box */}
                <input
                  type="text"
                  className="lc-input"
                  style={{ maxWidth: 300, padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  placeholder="🔍 Search member name or username…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />

                {/* Status filter pills */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['ALL', 'ACTIVE', 'DISABLED'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '999px',
                        border: statusFilter === s ? '1px solid #0d9488' : '1px solid var(--border)',
                        background: statusFilter === s ? 'rgba(13, 148, 136, 0.2)' : 'transparent',
                        color: statusFilter === s ? '#2dd4bf' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredMembers.map(m => {
                  const isSelf = m.username === user.username;
                  const isEnabled = m.enabled ?? true;
                  const initialsStr = m.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.1rem',
                        background: isEnabled ? 'rgba(9, 26, 26, 0.75)' : 'rgba(20, 10, 15, 0.6)',
                        border: isEnabled ? '1px solid var(--border-card)' : '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        flexWrap: 'wrap',
                        gap: '0.8rem',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {/* Left: Avatar & Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: isEnabled
                            ? 'linear-gradient(135deg, var(--violet), var(--gold))'
                            : '#2a1520',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                          opacity: isEnabled ? 1 : 0.6,
                        }}>
                          {initialsStr}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isEnabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {m.fullName}
                            </span>
                            <span className={`lc-role-badge lc-role-badge--${m.role}`} style={{ padding: '0.1rem 0.45rem', fontSize: '0.62rem' }}>
                              {m.role}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                            @{m.username} · {m.email} {m.organization && <>· <span style={{ color: 'var(--text-secondary)' }}>{m.organization}</span></>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Pill & Toggle Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {/* Status Badge */}
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: isEnabled ? 'var(--emerald)' : 'var(--rose)',
                        }}>
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isEnabled ? 'var(--emerald)' : 'var(--rose)',
                            boxShadow: isEnabled ? '0 0 6px var(--emerald)' : '0 0 6px var(--rose)',
                          }} />
                          {isEnabled ? 'Active' : 'Disabled'}
                        </span>

                        {/* Disable/Enable Button */}
                        {isSelf ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.3rem 0.6rem' }}>
                            Protected (You)
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={togglingId === m.id}
                            onClick={() => handleToggleMember(m)}
                            className={isEnabled ? 'lc-btn lc-btn-danger' : 'lc-btn lc-btn-primary'}
                            style={{
                              padding: '0.32rem 0.85rem',
                              fontSize: '0.74rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {togglingId === m.id
                              ? 'Updating…'
                              : isEnabled
                              ? 'Disable'
                              : 'Re-enable'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No members match the current search or filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS ("he must see all") */}
          {activeTab === 'logs' && user.role === 'ADMIN' && (
            <div className="lc-clean-view">
              <div className="lc-desk-header">
                <div>
                  <h1 className="lc-desk-title">Audit Logs</h1>
                  <p className="lc-desk-sub">{logs.length} logged system & member events</p>
                </div>
              </div>

              {/* Logs Stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {logs.map(log => {
                  const isWarning = log.status === 'WARNING';
                  const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '0.8rem 1rem',
                        background: 'rgba(9, 26, 26, 0.7)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        gap: '0.8rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          background: isWarning ? 'rgba(244, 63, 94, 0.15)' : 'rgba(13, 148, 136, 0.18)',
                          color: isWarning ? '#fb7185' : '#2dd4bf',
                          border: `1px solid ${isWarning ? 'rgba(244, 63, 94, 0.3)' : 'rgba(13, 148, 136, 0.3)'}`,
                          whiteSpace: 'nowrap',
                          marginTop: '0.1rem',
                        }}>
                          {log.eventType}
                        </span>

                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {log.details}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.2rem', fontFamily: 'JetBrains Mono, monospace' }}>
                            Actor: <strong style={{ color: 'var(--gold)' }}>{log.actor}</strong> · Target: <strong style={{ color: 'var(--text-secondary)' }}>{log.target}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === 'profile' && (
            <div className="lc-clean-view">
              <div className="lc-desk-header">
                <div>
                  <h1 className="lc-desk-title">Profile</h1>
                  <p className="lc-desk-sub">Verified credentials</p>
                </div>
              </div>

              <div className="lc-card">
                <div className="lc-card__body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="lc-identity__avatar" style={{ width: 50, height: 50, fontSize: '1.1rem' }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.fullName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        @{user.username}
                      </div>
                    </div>
                  </div>

                  <div className="lc-identity__row">
                    <div className="lc-identity__field">
                      <label>Email</label>
                      <span>{user.email}</span>
                    </div>
                    <div className="lc-identity__field">
                      <label>Role</label>
                      <span>{user.role}</span>
                    </div>
                    <div className="lc-identity__field">
                      <label>Organization</label>
                      <span>{user.organization || '—'}</span>
                    </div>
                    <div className="lc-identity__field">
                      <label>User ID</label>
                      <span>#{String(user.id).padStart(5, '0')}</span>
                    </div>
                    <div className="lc-identity__field">
                      <label>Member Since</label>
                      <span>{joinDate}</span>
                    </div>
                    <div className="lc-identity__field">
                      <label>Status</label>
                      <span style={{ color: 'var(--emerald)' }}>Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVILEGES */}
          {activeTab === 'privileges' && (
            <div className="lc-clean-view">
              <div className="lc-desk-header">
                <div>
                  <h1 className="lc-desk-title">Privileges</h1>
                  <p className="lc-desk-sub">{actions.length} authorized permissions</p>
                </div>
              </div>

              <div className="lc-action-grid">
                {actions.map((act, i) => (
                  <div key={i} className="lc-action-card" style={{ padding: '0.9rem 1rem' }}>
                    <span className="lc-action-check">✓</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{act}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Active on LandChain</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
