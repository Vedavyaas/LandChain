import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';
import { propertyApi } from '../api/client';
import type { Property } from '../types';

/* ── Fallback properties for offline resilience ─────────────────────────── */
const FALLBACK_PROPERTIES: Property[] = [
  {
    id: 1,
    propertyId: 'PROP-100201',
    surveyNumber: '142/3A',
    address: 'Plot 45, Green Meadows Avenue',
    village: 'Kengeri',
    taluk: 'Bengaluru South',
    district: 'Bengaluru Urban',
    area: '2,400 sq.ft',
    propertyType: 'RESIDENTIAL',
    ownerUsername: 'owner1',
    status: 'ACTIVE',
    createdAt: '2026-10-11T10:00:00',
    documentCount: 1,
  },
  {
    id: 2,
    propertyId: 'PROP-100202',
    surveyNumber: '88/1B',
    address: 'Tech Zone Block 4, EPIP',
    village: 'Whitefield',
    taluk: 'Bengaluru East',
    district: 'Bengaluru Urban',
    area: '15,000 sq.ft',
    propertyType: 'COMMERCIAL',
    ownerUsername: 'owner2',
    status: 'ACTIVE',
    createdAt: '2026-10-11T10:15:00',
    documentCount: 0,
  },
  {
    id: 3,
    propertyId: 'PROP-100203',
    surveyNumber: '314/7',
    address: 'Greenfield Agricultural Sector',
    village: 'Nelamangala',
    taluk: 'Nelamangala',
    district: 'Bengaluru Rural',
    area: '2.5 Acres',
    propertyType: 'AGRICULTURAL',
    ownerUsername: 'owner1',
    status: 'ACTIVE',
    createdAt: '2026-10-11T10:30:00',
    documentCount: 0,
  },
];

const PropertiesPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>(FALLBACK_PROPERTIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [ownerViewTab, setOwnerViewTab] = useState<'MY' | 'ALL'>('MY');

  useEffect(() => {
    propertyApi.getAll()
      .then((data) => {
        if (data && data.length > 0) {
          setProperties(data);
        }
      })
      .catch(() => {
        // Fallback to initial seed properties
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  if (user.role === 'ADMIN') {
    return (
      <div className="lc-portal-wrapper">
        <DynamicSidebar
          activeTab="desk"
          onSelectTab={() => navigate('/dashboard')}
          user={user}
          onLogout={handleLogout}
        />
        <div className="lc-portal-main">
          <header className="lc-topbar">
            <div className="lc-topbar__left">
              <span className="lc-topbar__crumb-section">LandChain</span>
              <span className="lc-topbar__crumb-sep">/</span>
              <span className="lc-topbar__crumb-current">Access Restricted</span>
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
          <main className="lc-portal-content">
            <div className="lc-card" style={{ maxWidth: 620, margin: '3rem auto', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Administrative Access Restriction
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                The <strong style={{ color: '#fff' }}>ADMIN</strong> role is restricted to system operations, identity management, and audit logs. Cadastral records and property details are reserved for operational participants (Government, Registrar, Owner, Bank, Auditor).
              </p>
              <button
                type="button"
                className="lc-btn lc-btn-primary"
                onClick={() => navigate('/dashboard')}
                style={{ margin: '0 auto' }}
              >
                ← Return to Admin Console
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const canRegister = user.role === 'GOVERNMENT';
  const isOwner = user.role === 'OWNER';

  const myPropertiesCount = properties.filter(
    (p) => p.ownerUsername?.toLowerCase() === user.username.toLowerCase()
  ).length;

  const allPropertiesCount = properties.length;

  const filtered = properties.filter((p) => {
    // If Owner is viewing "MY" tab, show only properties belonging to him
    if (isOwner && ownerViewTab === 'MY') {
      if (p.ownerUsername?.toLowerCase() !== user.username.toLowerCase()) {
        return false;
      }
    }

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.propertyId.toLowerCase().includes(term) ||
      p.surveyNumber.toLowerCase().includes(term) ||
      p.village.toLowerCase().includes(term) ||
      p.taluk.toLowerCase().includes(term) ||
      p.district.toLowerCase().includes(term) ||
      p.address.toLowerCase().includes(term) ||
      (p.ownerUsername && p.ownerUsername.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || p.propertyType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="lc-portal-wrapper">
      <DynamicSidebar
        activeTab="properties"
        onSelectTab={(tabId) => {
          if (tabId === 'desk' || tabId === 'profile' || tabId === 'privileges' || tabId === 'members' || tabId === 'logs') {
            navigate('/dashboard');
          } else if (tabId === 'blockchain') {
            navigate('/blockchain');
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      <div className="lc-portal-main">
        {/* Top bar */}
        <header className="lc-topbar">
          <div className="lc-topbar__left">
            <span className="lc-topbar__crumb-section">LandChain</span>
            <span className="lc-topbar__crumb-sep">/</span>
            <span className="lc-topbar__crumb-current">Properties</span>
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

        <main className="lc-portal-content">
          {/* Header */}
          <div className="lc-desk-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="lc-desk-title">
                {isOwner
                  ? (ownerViewTab === 'MY' ? 'My Registered Properties' : 'Explore Cadastre & Buy')
                  : 'Property Registry'}
              </h1>
              <p className="lc-desk-sub">
                {isOwner
                  ? (ownerViewTab === 'MY'
                      ? `Properties titled to ${user.fullName} (@${user.username}) · ${filtered.length} Parcels Owned`
                      : `State Cadastral Registry · Browse and inspect parcels for title purchase · ${filtered.length} Available`)
                  : `Centralized Land Records & Title Cadastre · ${filtered.length} Properties Found`}
              </p>
            </div>

            {canRegister && (
              <Link
                to="/properties/register"
                className="lc-btn lc-btn-primary"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', textDecoration: 'none' }}
              >
                + Register New Property
              </Link>
            )}
          </div>

          {/* Owner Tab Switcher: My Properties vs Explore / Buy */}
          {isOwner && (
            <div style={{
              display: 'flex',
              gap: '0.6rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '1.25rem',
              paddingBottom: '0.6rem',
            }}>
              <button
                type="button"
                onClick={() => setOwnerViewTab('MY')}
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: ownerViewTab === 'MY' ? '1px solid #10b981' : '1px solid var(--border)',
                  background: ownerViewTab === 'MY' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: ownerViewTab === 'MY' ? '#6ee7b7' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🏡</span>
                <span>My Properties ({myPropertiesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setOwnerViewTab('ALL')}
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: ownerViewTab === 'ALL' ? '1px solid var(--violet-glow)' : '1px solid var(--border)',
                  background: ownerViewTab === 'ALL' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: ownerViewTab === 'ALL' ? 'var(--violet-light)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🤝</span>
                <span>Explore Cadastre & Buy ({allPropertiesCount})</span>
              </button>
            </div>
          )}

          {/* Search & Filters */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.1rem',
            marginBottom: '1.5rem',
          }}>
            {/* Search Input */}
            <input
              type="text"
              className="lc-input"
              placeholder="🔍 Search by Survey Number, Property ID, Village, Taluk, District…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', fontSize: '0.88rem' }}
            />

            {/* Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Status Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Status:
                </span>
                {(['ALL', 'ACTIVE', 'PENDING_TRANSFER', 'MORTGAGED', 'FROZEN'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      borderRadius: '999px',
                      border: statusFilter === s ? '1px solid #0d9488' : '1px solid var(--border)',
                      background: statusFilter === s ? 'rgba(13, 148, 136, 0.2)' : 'transparent',
                      color: statusFilter === s ? '#2dd4bf' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Type Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Type:
                </span>
                {(['ALL', 'RESIDENTIAL', 'COMMERCIAL', 'AGRICULTURAL'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      borderRadius: '999px',
                      border: typeFilter === t ? '1px solid #fbbf24' : '1px solid var(--border)',
                      background: typeFilter === t ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                      color: typeFilter === t ? 'var(--gold)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.2rem' }}>
            {filtered.map((p) => (
              <div
                key={p.propertyId}
                className="lc-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.18s ease, border-color 0.18s ease',
                }}
              >
                <div className="lc-card__header">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold)' }}>
                    {p.propertyId}
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    background: p.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: p.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--rose)',
                    border: `1px solid ${p.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  }}>
                    {p.status}
                  </span>
                </div>

                <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Survey Number
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Survey {p.surveyNumber}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    📍 {p.address}, {p.village}, {p.taluk}, {p.district}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'rgba(13, 148, 136, 0.08)',
                      border: '1px solid var(--border)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--violet-light)',
                      fontWeight: 600,
                    }}>
                      📐 {p.area}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'rgba(13, 148, 136, 0.08)',
                      border: '1px solid var(--border)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}>
                      🏷 {p.propertyType}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'rgba(13, 148, 136, 0.08)',
                      border: '1px solid var(--border)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--gold)',
                      fontWeight: 600,
                    }}>
                      📄 {p.documentCount ?? 0} Docs
                    </span>
                    {p.ownerUsername?.toLowerCase() === user.username.toLowerCase() ? (
                      <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        color: '#6ee7b7',
                        fontWeight: 700,
                      }}>
                        ★ My Property
                      </span>
                    ) : p.ownerUsername ? (
                      <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        color: '#38bdf8',
                        fontWeight: 600,
                      }}>
                        👤 Owner: @{p.ownerUsername}
                      </span>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.8rem' }}>
                    <Link
                      to={`/properties/${p.propertyId}`}
                      className="lc-btn lc-btn-ghost"
                      style={{ padding: '0.4rem 0.5rem', fontSize: '0.74rem', textAlign: 'center', textDecoration: 'none' }}
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/properties/${p.propertyId}/documents`}
                      className="lc-btn lc-btn-primary"
                      style={{ padding: '0.4rem 0.5rem', fontSize: '0.74rem', textAlign: 'center', textDecoration: 'none' }}
                    >
                      Documents ➔
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isOwner && ownerViewTab === 'MY' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: 460, margin: '0 auto' }}>
                  <span style={{ fontSize: '2.5rem' }}>🏡</span>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 600 }}>
                    No properties currently titled under your account (@{user.username}).
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    You can browse the state cadastre to inspect available parcels and review deed verification digests.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOwnerViewTab('ALL')}
                    className="lc-btn lc-btn-ghost"
                    style={{ marginTop: '0.5rem', fontSize: '0.82rem', padding: '0.5rem 1.1rem' }}
                  >
                    🤝 Explore Cadastre & Parcels to Buy →
                  </button>
                </div>
              ) : (
                'No properties found matching your search criteria.'
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PropertiesPage;
