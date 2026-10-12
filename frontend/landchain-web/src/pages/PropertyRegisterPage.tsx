import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';
import { propertyApi } from '../api/client';
import type { CreatePropertyRequest, User } from '../types';

const FALLBACK_OWNERS: User[] = [
  { id: 6, username: 'owner1', fullName: 'Demo Owner Alpha', email: 'owner1@demo.landchain.local', role: 'OWNER', createdAt: '2026-10-11T10:05:00' },
  { id: 7, username: 'owner2', fullName: 'Demo Owner Beta', email: 'owner2@demo.landchain.local', role: 'OWNER', createdAt: '2026-10-11T10:06:00' },
  { id: 8, username: 'owner3', fullName: 'Demo Owner Gamma', email: 'owner3@demo.landchain.local', role: 'OWNER', createdAt: '2026-10-11T10:07:00' },
  { id: 9, username: 'buyer1', fullName: 'Demo Citizen Buyer Alpha', email: 'buyer1@demo.landchain.local', role: 'OWNER', createdAt: '2026-10-11T10:08:00' },
  { id: 10, username: 'buyer2', fullName: 'Demo Citizen Buyer Beta', email: 'buyer2@demo.landchain.local', role: 'OWNER', createdAt: '2026-10-11T10:09:00' },
];

const PropertyRegisterPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<CreatePropertyRequest>({
    propertyId: '',
    surveyNumber: '',
    address: '',
    village: '',
    taluk: '',
    district: '',
    area: '',
    propertyType: 'RESIDENTIAL',
    ownerUsername: 'owner1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ownersList, setOwnersList] = useState<User[]>(FALLBACK_OWNERS);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [customUsernameInput, setCustomUsernameInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close owner picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
        setShowCustomInput(false);
      }
    };
    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPickerOpen]);

  // Auto-focus search input when picker opens
  useEffect(() => {
    if (isPickerOpen && !showCustomInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isPickerOpen, showCustomInput]);

  useEffect(() => {
    propertyApi.getOwners()
      .then((data) => {
        if (data && data.length > 0) {
          setOwnersList(data);
        }
      })
      .catch(() => {
        // Fallback kept
      });
  }, []);

  const SAMPLE_PROPERTIES: CreatePropertyRequest[] = [
    {
      surveyNumber: '248/1A-Plot7',
      address: 'Plot No. 7, Kaveri Silicon Enclave, Outer Ring Road',
      village: 'Mahadevapura',
      taluk: 'Bengaluru East',
      district: 'Bengaluru Urban',
      area: '3,200 sq.ft',
      propertyType: 'RESIDENTIAL',
      ownerUsername: 'owner1',
    },
    {
      surveyNumber: '112/5B-TechZone',
      address: 'Tower C, Global Business Corridor, Whitefield Main Road',
      village: 'Whitefield',
      taluk: 'Bengaluru East',
      district: 'Bengaluru Urban',
      area: '45,000 sq.ft',
      propertyType: 'COMMERCIAL',
      ownerUsername: 'owner2',
    },
    {
      surveyNumber: '89/3-FarmExt',
      address: 'Survey 89/3, Sompura Hobli, Near Arkavathi River Basin',
      village: 'Nelamangala',
      taluk: 'Nelamangala',
      district: 'Bengaluru Rural',
      area: '4.5 Acres',
      propertyType: 'AGRICULTURAL',
      ownerUsername: 'owner1',
    },
  ];

  const handleAutoFillSample = () => {
    const randomSample = SAMPLE_PROPERTIES[Math.floor(Math.random() * SAMPLE_PROPERTIES.length)];
    const randomOwner = ownersList[Math.floor(Math.random() * ownersList.length)];
    setForm({
      ...randomSample,
      ownerUsername: randomOwner ? randomOwner.username : randomSample.ownerUsername,
    });
    setOwnerSearchQuery('');
    setIsPickerOpen(false);
    setShowCustomInput(false);
    setError('');
  };

  const selectOwner = (username: string) => {
    setForm((prev) => ({ ...prev, ownerUsername: username }));
    setIsPickerOpen(false);
    setOwnerSearchQuery('');
    setShowCustomInput(false);
    setError('');
  };

  const handleApplyCustomUsername = () => {
    const trimmed = customUsernameInput.trim();
    if (!trimmed) return;
    selectOwner(trimmed);
    setCustomUsernameInput('');
  };

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
                The <strong style={{ color: '#fff' }}>ADMIN</strong> role is restricted to system operations, identity management, and audit logs. Cadastral records and property registration are reserved for Government officers.
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

  const isAuthorized = user.role === 'GOVERNMENT';

  const selectedOwner = ownersList.find(
    (o) => o.username.toLowerCase() === (form.ownerUsername || '').toLowerCase()
  );

  const filteredOwners = ownersList.filter((o) => {
    if (!ownerSearchQuery.trim()) return true;
    const term = ownerSearchQuery.toLowerCase();
    return (
      o.username.toLowerCase().includes(term) ||
      o.fullName.toLowerCase().includes(term) ||
      o.email.toLowerCase().includes(term)
    );
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const created = await propertyApi.create(form);
      navigate(`/properties/${created.propertyId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to register property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lc-portal-wrapper">
      <DynamicSidebar
        activeTab="properties"
        onSelectTab={(tabId) => {
          if (tabId === 'desk' || tabId === 'profile' || tabId === 'privileges' || tabId === 'members' || tabId === 'logs') {
            navigate('/dashboard');
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
            <Link to="/properties" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>Properties</Link>
            <span className="lc-topbar__crumb-sep">/</span>
            <span className="lc-topbar__crumb-current">Register</span>
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

        <main className="lc-portal-content" style={{ maxWidth: 760 }}>
          {/* Unauthorized Guard View */}
          {!isAuthorized ? (
            <div className="lc-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--rose)', marginBottom: '0.5rem' }}>
                Registry Authorization Required
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: 480, margin: '0 auto 1.5rem' }}>
                Registration of official property parcels into the central registry is restricted to authorized Government Authorities (<strong style={{ color: 'var(--gold)' }}>GOVERNMENT</strong> role).
                Your current role is <strong style={{ color: 'var(--violet-light)' }}>{user.role}</strong>.
              </p>
              <Link to="/properties" className="lc-btn lc-btn-primary" style={{ padding: '0.5rem 1.2rem', textDecoration: 'none' }}>
                ← Return to Property Catalog
              </Link>
            </div>
          ) : (
            <div className="lc-clean-view">
              <div className="lc-desk-header">
                <div>
                  <h1 className="lc-desk-title">Register Property</h1>
                  <p className="lc-desk-sub">
                    Authoritative Municipal & Cadastral Onboarding · Official Registry Desk
                  </p>
                </div>
              </div>

              {error && (
                <div className="lc-error">
                  <span>⚠</span> {error}
                </div>
              )}

              <div className="lc-card">
                <div className="lc-card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="lc-card__title">🏛 Property Cadastral Entry</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={handleAutoFillSample}
                      className="lc-btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(13, 148, 136, 0.15)',
                        border: '1px solid rgba(13, 148, 136, 0.4)',
                        color: '#2dd4bf',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      title="Auto-fill form with realistic cadastral data"
                    >
                      <span>✨</span>
                      <span>Auto-Fill Sample Data</span>
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 700 }}>
                      Official Government Form
                    </span>
                  </div>
                </div>

                <div className="lc-card__body">
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                    {/* Property Cadastral ID (Fabric Key) */}
                    <div className="lc-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label className="lc-label" htmlFor="propertyId" style={{ margin: 0 }}>
                          Property Identifier (Fabric Ledger Key) <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>(Optional)</span>
                        </label>
                        <button
                          type="button"
                          id="btn-use-prop-tn-0001"
                          onClick={() => setForm((prev) => ({ ...prev, propertyId: 'PROP-TN-0001' }))}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                            borderRadius: '4px',
                            padding: '0.18rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Fill test value PROP-TN-0001"
                        >
                          ⚡ Use PROP-TN-0001
                        </button>
                      </div>
                      <input
                        id="propertyId"
                        name="propertyId"
                        className="lc-input"
                        placeholder="e.g. PROP-TN-0001 (or leave blank to auto-generate)"
                        value={form.propertyId || ''}
                        onChange={handleChange}
                        style={{ fontFamily: 'monospace', letterSpacing: '0.04em', borderColor: form.propertyId === 'PROP-TN-0001' ? '#10b981' : undefined }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Authoritative state key registered in Hyperledger Fabric chaincode ledger.
                      </span>
                    </div>

                    {/* Survey Number & Area */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="lc-form-group">
                        <label className="lc-label" htmlFor="surveyNumber">
                          Survey Number <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
                        <input
                          id="surveyNumber"
                          name="surveyNumber"
                          className="lc-input"
                          placeholder="e.g. 142/3A"
                          value={form.surveyNumber}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="lc-form-group">
                        <label className="lc-label" htmlFor="area">
                          Area / Extent <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
                        <input
                          id="area"
                          name="area"
                          className="lc-input"
                          placeholder="e.g. 2,400 sq.ft or 2.5 Acres"
                          value={form.area}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {/* Property Type Selector */}
                    <div className="lc-form-group">
                      <label className="lc-label">Property Classification</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                        {(['RESIDENTIAL', 'COMMERCIAL', 'AGRICULTURAL'] as const).map((type) => {
                          const isSel = form.propertyType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setForm({ ...form, propertyType: type })}
                              style={{
                                padding: '0.65rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: isSel ? '1px solid #0d9488' : '1px solid var(--border)',
                                background: isSel ? 'rgba(13, 148, 136, 0.18)' : 'rgba(13, 148, 136, 0.04)',
                                color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                              }}
                            >
                              {type === 'RESIDENTIAL' && '🏡 Residential'}
                              {type === 'COMMERCIAL' && '🏢 Commercial'}
                              {type === 'AGRICULTURAL' && '🌾 Agricultural'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Full Street Address */}
                    <div className="lc-form-group">
                      <label className="lc-label" htmlFor="address">
                        Address / Street Description <span style={{ color: 'var(--rose)' }}>*</span>
                      </label>
                      <input
                        id="address"
                        name="address"
                        className="lc-input"
                        placeholder="e.g. Plot 45, Green Meadows Avenue, Sector 2"
                        value={form.address}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    {/* Village, Taluk, District */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                      <div className="lc-form-group">
                        <label className="lc-label" htmlFor="village">
                          Village / Locality <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
                        <input
                          id="village"
                          name="village"
                          className="lc-input"
                          placeholder="e.g. Kengeri"
                          value={form.village}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="lc-form-group">
                        <label className="lc-label" htmlFor="taluk">
                          Taluk / Sub-District <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
                        <input
                          id="taluk"
                          name="taluk"
                          className="lc-input"
                          placeholder="e.g. Bengaluru South"
                          value={form.taluk}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="lc-form-group">
                        <label className="lc-label" htmlFor="district">
                          District <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
                        <input
                          id="district"
                          name="district"
                          className="lc-input"
                          placeholder="e.g. Bengaluru Urban"
                          value={form.district}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {/* Assigned Title Owner - Upgraded Seamless Card & Picker */}
                    <div className="lc-form-group" ref={pickerRef} style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <label className="lc-label" style={{ margin: 0 }}>
                          Legal Title Holder / Property Owner <span style={{ color: 'var(--rose)' }}>*</span>
                        </label>
                        <span style={{ fontSize: '0.74rem', color: 'var(--emerald)', fontWeight: 600 }}>
                          {selectedOwner ? '✓ Verified Citizen Participant' : 'Required Field'}
                        </span>
                      </div>

                      {/* Current Assigned Owner Display Card */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.1rem',
                          background: 'rgba(13, 148, 136, 0.08)',
                          border: isPickerOpen ? '1px solid #0d9488' : '1px solid rgba(13, 148, 136, 0.35)',
                          borderRadius: 'var(--radius-md)',
                          transition: 'all 0.2s ease',
                          boxShadow: isPickerOpen ? '0 0 15px rgba(13, 148, 136, 0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, minWidth: 0 }}>
                          {/* Avatar badge */}
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.35), rgba(16, 185, 129, 0.25))',
                              border: '2px solid rgba(45, 212, 191, 0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                            }}
                          >
                            {selectedOwner ? '👤' : '🏷️'}
                          </div>

                          {/* User Details */}
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                                {selectedOwner ? selectedOwner.fullName : `@${form.ownerUsername}`}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '999px',
                                  background: 'rgba(16, 185, 129, 0.18)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                }}
                              >
                                @{form.ownerUsername}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {selectedOwner?.email ? `${selectedOwner.email} · Citizen Owner` : 'Custom Assigned Username'}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPickerOpen(!isPickerOpen);
                              setShowCustomInput(false);
                            }}
                            className="lc-btn"
                            style={{
                              padding: '0.45rem 0.95rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: isPickerOpen ? 'rgba(13, 148, 136, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                              color: isPickerOpen ? '#2dd4bf' : 'var(--text-primary)',
                              border: isPickerOpen ? '1px solid #0d9488' : '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            <span>{isPickerOpen ? '▲ Close' : '🔄 Change Owner'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Popover / Dropdown Panel */}
                      {isPickerOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            right: 0,
                            zIndex: 80,
                            background: '#091515',
                            border: '1px solid #0d9488',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 18px 45px rgba(0, 0, 0, 0.85), 0 0 20px rgba(13, 148, 136, 0.25)',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Header with Quick Pick and Search */}
                          <div style={{ padding: '0.9rem', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', background: 'rgba(13, 148, 136, 0.08)' }}>
                            {/* Quick Select Chips */}
                            <div style={{ marginBottom: '0.75rem' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                ⚡ 1-Click Quick Select Citizen:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {ownersList.map((owner) => {
                                  const isCurrent = form.ownerUsername?.toLowerCase() === owner.username.toLowerCase();
                                  return (
                                    <button
                                      key={owner.username}
                                      type="button"
                                      onClick={() => selectOwner(owner.username)}
                                      style={{
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '999px',
                                        fontSize: '0.73rem',
                                        fontWeight: 700,
                                        background: isCurrent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                                        border: isCurrent ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                                        color: isCurrent ? '#6ee7b7' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        transition: 'all 0.15s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isCurrent) {
                                          e.currentTarget.style.background = 'rgba(13, 148, 136, 0.2)';
                                          e.currentTarget.style.color = '#2dd4bf';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isCurrent) {
                                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                          e.currentTarget.style.color = 'var(--text-secondary)';
                                        }
                                      }}
                                    >
                                      <span>@{owner.username}</span>
                                      <span style={{ opacity: 0.65 }}>({owner.fullName.split(' ')[0]})</span>
                                      {isCurrent && <span style={{ color: '#10b981' }}>✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Search Box */}
                            {!showCustomInput ? (
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  🔍
                                </span>
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  className="lc-input"
                                  style={{
                                    width: '100%',
                                    paddingLeft: '2.3rem',
                                    paddingRight: ownerSearchQuery ? '2rem' : '0.8rem',
                                    fontSize: '0.82rem',
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(13, 148, 136, 0.5)',
                                  }}
                                  placeholder="Type to filter registered owners by name, @username, or email…"
                                  value={ownerSearchQuery}
                                  onChange={(e) => setOwnerSearchQuery(e.target.value)}
                                />
                                {ownerSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setOwnerSearchQuery('')}
                                    style={{
                                      position: 'absolute',
                                      right: '0.6rem',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* Custom Username Form */
                              <div>
                                <div style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: 700, marginBottom: '0.4rem' }}>
                                  Assign Custom / Unlisted Citizen Username:
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <input
                                    type="text"
                                    className="lc-input"
                                    style={{
                                      flex: 1,
                                      fontSize: '0.82rem',
                                      background: 'rgba(0, 0, 0, 0.5)',
                                      border: '1px solid rgba(13, 148, 136, 0.5)',
                                    }}
                                    placeholder="Enter citizen username (e.g. rahul_k, citizen12)"
                                    value={customUsernameInput}
                                    onChange={(e) => setCustomUsernameInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleApplyCustomUsername();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleApplyCustomUsername}
                                    className="lc-btn lc-btn-primary"
                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                                    disabled={!customUsernameInput.trim()}
                                  >
                                    Apply
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowCustomInput(false)}
                                    className="lc-btn lc-btn-ghost"
                                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* List of Owners */}
                          {!showCustomInput && (
                            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                              <div style={{
                                padding: '0.4rem 0.85rem',
                                background: 'rgba(0, 0, 0, 0.3)',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}>
                                <span>REGISTERED CITIZENS ({filteredOwners.length})</span>
                                <span>Click any to assign</span>
                              </div>

                              {filteredOwners.length === 0 ? (
                                <div style={{ padding: '1.2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  No registered owners match "<strong>{ownerSearchQuery}</strong>"
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCustomUsernameInput(ownerSearchQuery);
                                        setShowCustomInput(true);
                                      }}
                                      className="lc-btn lc-btn-primary"
                                      style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem' }}
                                    >
                                      Use "{ownerSearchQuery}" as custom username →
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                filteredOwners.map((owner) => {
                                  const isSelected = form.ownerUsername?.toLowerCase() === owner.username.toLowerCase();
                                  return (
                                    <button
                                      key={owner.id || owner.username}
                                      type="button"
                                      onClick={() => selectOwner(owner.username)}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.65rem 0.95rem',
                                        background: isSelected ? 'rgba(13, 148, 136, 0.22)' : 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.12s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = isSelected ? 'rgba(13, 148, 136, 0.3)' : 'rgba(13, 148, 136, 0.12)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = isSelected ? 'rgba(13, 148, 136, 0.22)' : 'transparent';
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div
                                          style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(13, 148, 136, 0.2)',
                                            border: isSelected ? '1px solid #10b981' : '1px solid rgba(13, 148, 136, 0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.85rem',
                                            flexShrink: 0,
                                          }}
                                        >
                                          👤
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isSelected ? '#5eead4' : '#fff' }}>
                                            {owner.fullName}
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            <strong style={{ color: 'var(--text-secondary)' }}>@{owner.username}</strong> · {owner.email}
                                          </div>
                                        </div>
                                      </div>

                                      {isSelected ? (
                                        <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                          <span>✓</span> Assigned
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                          Select →
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}

                          {/* Footer with Manual Input Toggle */}
                          <div style={{
                            padding: '0.5rem 0.9rem',
                            background: 'rgba(0, 0, 0, 0.4)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            {!showCustomInput ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCustomInput(true);
                                  setCustomUsernameInput(ownerSearchQuery);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#2dd4bf',
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  padding: 0,
                                  textDecoration: 'underline',
                                }}
                              >
                                + Enter unlisted / custom citizen username
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowCustomInput(false)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                ← Back to registered citizens list
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setIsPickerOpen(false);
                                setShowCustomInput(false);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Close ✕
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Hidden native input for HTML form validation */}
                      <input
                        type="hidden"
                        name="ownerUsername"
                        value={form.ownerUsername}
                        required
                      />

                      <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                        The citizen who holds official title to this cadastral parcel. The parcel will immediately populate inside their personal registry dashboard.
                      </small>
                    </div>

                    {/* Submit Button */}
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                      <Link
                        to="/properties"
                        className="lc-btn lc-btn-ghost"
                        style={{ padding: '0.55rem 1.2rem', textDecoration: 'none' }}
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        className="lc-btn lc-btn-primary"
                        disabled={loading}
                        style={{ padding: '0.55rem 1.5rem' }}
                      >
                        {loading ? 'Registering on Registry…' : '✓ Register Property'}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PropertyRegisterPage;
