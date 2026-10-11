import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertyApi, documentApi } from '../api/client';
import type { Property, PropertyDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';

export const PropertyDetailsPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === 'GOVERNMENT';
  const isRegistrar = user?.role === 'REGISTRAR';

  useEffect(() => {
    if (!propertyId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [propData, docsData] = await Promise.all([
          propertyApi.getById(propertyId),
          documentApi.getByProperty(propertyId).catch(() => []),
        ]);
        setProperty(propData);
        const docs = (docsData && docsData.length > 0) ? docsData : (propData.documents || []);
        setDocuments(docs);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load property details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [propertyId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderStatusPill = (status: string) => {
    let color = 'var(--emerald)';
    let bg = 'rgba(16, 185, 129, 0.15)';
    let border = 'rgba(16, 185, 129, 0.4)';

    if (status === 'PENDING_TRANSFER') {
      color = 'var(--gold)';
      bg = 'rgba(251, 191, 36, 0.15)';
      border = 'rgba(251, 191, 36, 0.4)';
    } else if (status === 'FROZEN') {
      color = 'var(--rose)';
      bg = 'rgba(244, 63, 94, 0.15)';
      border = 'rgba(244, 63, 94, 0.4)';
    } else if (status === 'MORTGAGED') {
      color = '#a855f7';
      bg = 'rgba(168, 85, 247, 0.15)';
      border = 'rgba(168, 85, 247, 0.4)';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          color,
          background: bg,
          border: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        {status}
      </span>
    );
  };

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      const blob = await documentApi.download(doc.documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || `${doc.documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Failed to download document: ' + (err.message || 'Network error'));
    }
  };

  if (!user) return null;

  // Role Protection: Admin cannot view property details
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

  return (
    <div className="lc-portal-wrapper">
      <DynamicSidebar
        activeTab="properties"
        onSelectTab={(tabId) => {
          if (tabId === 'desk' || tabId === 'profile' || tabId === 'privileges' || tabId === 'members' || tabId === 'logs') {
            navigate('/dashboard');
          } else if (tabId === 'properties') {
            navigate('/properties');
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
            <span className="lc-topbar__crumb-current">{propertyId}</span>
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
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
              <div className="lc-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
          ) : error || !property ? (
            <div className="lc-card" style={{ maxWidth: 500, margin: '2rem auto', textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--rose)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
                {error || 'Property not found.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/properties')}
                className="lc-btn lc-btn-ghost"
                style={{ margin: '0 auto' }}
              >
                ← Back to Registry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Header Title Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'var(--violet-dim)',
                    border: '1px solid var(--violet-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}>
                    🏛
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.02em', margin: 0 }}>
                        {property.propertyId}
                      </h1>
                      {renderStatusPill(property.status)}
                      {property.ownerUsername?.toLowerCase() === user.username.toLowerCase() ? (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#6ee7b7',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          ★ My Property (Title Owner)
                        </span>
                      ) : property.ownerUsername ? (
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          color: '#38bdf8',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          👤 Title Owner: @{property.ownerUsername}
                        </span>
                      ) : null}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                      Survey No: <strong style={{ color: '#fff' }}>{property.surveyNumber}</strong> · {property.village}, {property.district}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Link
                    to={`/properties/${property.propertyId}/documents`}
                    className="lc-btn lc-btn-primary"
                    style={{
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.82rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>📑</span>
                    <span>{isRegistrar ? 'Manage Documents' : 'View Documents'} ({documents.length})</span>
                  </Link>
                </div>
              </div>

              {/* Quick Spec Metrics Bar */}
              <div className="lc-mini-stats">
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Survey Number</span>
                  <span className="lc-mini-stat__val" style={{ fontFamily: 'monospace', color: '#fff' }}>
                    {property.surveyNumber}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Title Owner</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--gold)' }}>
                    {property.ownerUsername ? `@${property.ownerUsername}` : 'Unassigned'}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Property Type</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--violet-light)' }}>
                    {property.propertyType}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Area / Extent</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--emerald)' }}>
                    {property.area}
                  </span>
                </div>
                <div className="lc-mini-stat">
                  <span className="lc-mini-stat__label">Taluk / Tehsil</span>
                  <span className="lc-mini-stat__val" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {property.taluk}
                  </span>
                </div>
              </div>

              {/* Main Content Grid: 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                
                {/* Left Card: Geographic & Cadastral Specs */}
                <div className="lc-card">
                  <div className="lc-card__header">
                    <span className="lc-card__title">📍 Cadastral Specifications</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Jurisdiction Record</span>
                  </div>
                  <div className="lc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          Village
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {property.village}
                        </span>
                      </div>

                      <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          District
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {property.district}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                        Registered Legal Address
                      </span>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                        {property.address}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.8rem',
                      background: 'rgba(13, 148, 136, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(13, 148, 136, 0.2)',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                    }}>
                      <span>Registered Date</span>
                      <strong style={{ color: '#fff' }}>
                        {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : 'Active'}
                      </strong>
                    </div>

                  </div>
                </div>

                {/* Right Card: Documents & Immutability */}
                <div className="lc-card">
                  <div className="lc-card__header">
                    <span className="lc-card__title">📑 Title Deeds & Documents ({documents.length})</span>
                    <Link
                      to={`/properties/${property.propertyId}/documents`}
                      style={{ fontSize: '0.74rem', color: 'var(--violet-light)', textDecoration: 'none', fontWeight: 700 }}
                    >
                      {isRegistrar ? 'Manage Deeds →' : 'Verify SHA-256 →'}
                    </Link>
                  </div>

                  <div className="lc-card__body">
                    {documents.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2.5rem 1rem',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <span style={{ fontSize: '2rem' }}>📁</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          No documents registered on this parcel.
                        </p>
                        {isRegistrar && (
                          <Link
                            to={`/properties/${property.propertyId}/documents`}
                            className="lc-btn lc-btn-ghost"
                            style={{
                              marginTop: '0.5rem',
                              fontSize: '0.78rem',
                              padding: '0.4rem 0.9rem',
                              textDecoration: 'none',
                            }}
                          >
                            + Register Document
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {documents.map((doc) => (
                          <div
                            key={doc.documentId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--emerald)',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}>
                                  {doc.documentId}
                                </span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'var(--gold)',
                                  background: 'rgba(251, 191, 36, 0.1)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                }}>
                                  {doc.documentType}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                              📄 {doc.originalFileName}
                            </div>

                            {/* Monospace SHA-256 Box */}
                            <div style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(13, 148, 136, 0.15)',
                              borderRadius: '4px',
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              color: 'var(--text-secondary)',
                              wordBreak: 'break-all',
                            }}>
                              <span style={{ color: 'var(--text-muted)', marginRight: '0.4rem' }}>SHA-256:</span>
                              {doc.sha256Hash}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <button
                                type="button"
                                onClick={() => handleDownload(doc)}
                                className="lc-btn lc-btn-ghost"
                                style={{ padding: '0.3rem 0.7rem', fontSize: '0.74rem' }}
                              >
                                📥 Download
                              </button>
                              <Link
                                to={`/properties/${property.propertyId}/documents`}
                                className="lc-btn"
                                style={{
                                  padding: '0.3rem 0.7rem',
                                  fontSize: '0.74rem',
                                  textDecoration: 'none',
                                  background: 'rgba(13, 148, 136, 0.15)',
                                  color: '#2dd4bf',
                                  border: '1px solid rgba(13, 148, 136, 0.4)',
                                }}
                              >
                                🔍 Verify Hash
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
