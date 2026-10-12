import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertyApi, documentApi, blockchainApi, transferApi, mortgageApi, buyRequestApi } from '../api/client';
import type { Property, PropertyDocument, BlockchainHistoryRecord, BlockchainTransferRecord, BuyRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import DynamicSidebar from '../components/DynamicSidebar';

export const PropertyDetailsPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [history, setHistory] = useState<BlockchainHistoryRecord[]>([]);
  const [transfers, setTransfers] = useState<BlockchainTransferRecord[]>([]);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [buyerUsername, setBuyerUsername] = useState('buyer1');
  const [selectedDeedId, setSelectedDeedId] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  // Mortgage modal state (for BANK)
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState('5000000');
  const [mortgageDeedId, setMortgageDeedId] = useState('');
  const [mortgageSubmitting, setMortgageSubmitting] = useState(false);

  // Buy Request modal state (for BUYER)
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('7500000');
  const [offerMessage, setOfferMessage] = useState('Official purchase offer on registered parcel.');
  const [buySubmitting, setBuySubmitting] = useState(false);

  const canApproveTransfer = user?.role === 'REGISTRAR' || user?.role === 'GOVERNMENT';
  const isRegistrar = user?.role === 'REGISTRAR';
  const isBanker = user?.role === 'BANK';
  const isCurrentOwner = user?.role === 'OWNER' && user?.username?.toLowerCase() === property?.ownerUsername?.toLowerCase();
  const isPotentialBuyer = user?.role === 'OWNER' && !isCurrentOwner;

  const loadData = async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const [propData, docsData, historyData, transfersData, offersData] = await Promise.all([
        propertyApi.getById(propertyId),
        documentApi.getByProperty(propertyId).catch(() => []),
        blockchainApi.getHistory(propertyId).catch(() => []),
        transferApi.getAll().catch(() => []),
        buyRequestApi.getByProperty(propertyId).catch(() => []),
      ]);
      setProperty(propData);
      const docs = (docsData && docsData.length > 0) ? docsData : (propData.documents || []);
      setDocuments(docs);
      setHistory(historyData || []);
      const propTransfers = (transfersData || []).filter((t: BlockchainTransferRecord) => t.propertyId === propertyId);
      setTransfers(propTransfers);
      setBuyRequests(offersData || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setTransferSubmitting(true);
    setTransferFeedback(null);
    try {
      await transferApi.initiate({
        propertyId: property.propertyId,
        newOwner: buyerUsername,
        deedDocumentId: selectedDeedId || undefined,
      });
      setTransferFeedback('✓ Transfer proposal initiated on Hyperledger Fabric! Status set to PENDING_TRANSFER awaiting Registrar review.');
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferFeedback(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      setTransferFeedback('✗ Error: ' + (err.response?.data?.message || err.message || 'Failed to initiate transfer'));
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    if (!window.confirm('Confirm executing title conveyance on Hyperledger Fabric blockchain?')) return;
    setLoading(true);
    try {
      await transferApi.approve(transferId);
      alert('✓ Title conveyance successfully committed to Hyperledger Fabric! New owner is now authoritative.');
      loadData();
    } catch (err: any) {
      alert('Failed to approve transfer: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleFileMortgage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setMortgageSubmitting(true);
    try {
      await mortgageApi.file({
        propertyId: property.propertyId,
        amount: parseFloat(loanAmount),
        bankName: user?.organization || 'Commercial Apex Bank',
        documentId: mortgageDeedId || undefined,
      });
      alert('✓ Mortgage lien filed on Hyperledger Fabric! Property state is now MORTGAGED.');
      setShowMortgageModal(false);
      loadData();
    } catch (err: any) {
      alert('Failed to file mortgage: ' + (err.response?.data?.message || err.message));
    } finally {
      setMortgageSubmitting(false);
    }
  };

  const handleReleaseMortgage = async () => {
    if (!property) return;
    if (!window.confirm('Confirm releasing mortgage encumbrance on Hyperledger Fabric blockchain?')) return;
    setLoading(true);
    try {
      await mortgageApi.release(property.propertyId);
      alert('✓ Mortgage encumbrance released on Hyperledger Fabric! Property status restored to ACTIVE.');
      loadData();
    } catch (err: any) {
      alert('Failed to release mortgage: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleCreateBuyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setBuySubmitting(true);
    try {
      await buyRequestApi.create({
        propertyId: property.propertyId,
        offeredPrice: parseFloat(offerPrice),
        message: offerMessage,
      });
      alert('✓ Purchase offer submitted to deed owner! Owner can review and accept to initiate Fabric title conveyance.');
      setShowBuyModal(false);
      loadData();
    } catch (err: any) {
      alert('Failed to submit purchase offer: ' + (err.response?.data?.message || err.message));
    } finally {
      setBuySubmitting(false);
    }
  };

  const handleAcceptBuyRequest = async (requestId: string) => {
    if (!window.confirm('Accept purchase offer and initiate title conveyance proposal on Hyperledger Fabric?')) return;
    setLoading(true);
    try {
      await buyRequestApi.accept(requestId);
      alert('✓ Offer accepted! Transfer proposal registered on Fabric awaiting Sub-Registrar review.');
      loadData();
    } catch (err: any) {
      alert('Failed to accept offer: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleRejectBuyRequest = async (requestId: string) => {
    try {
      await buyRequestApi.reject(requestId);
      loadData();
    } catch (err: any) {
      alert('Failed to reject offer: ' + (err.response?.data?.message || err.message));
    }
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
                      {property.blockchainTxId ? (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}>
                          <span>⛓️ Fabric Block #{property.blockchainBlockNumber || 1}</span>
                          <span>·</span>
                          <span>Tx: {property.blockchainTxId.substring(0, 12)}…</span>
                        </span>
                      ) : null}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                      Survey No: <strong style={{ color: '#fff' }}>{property.surveyNumber}</strong> · {property.village}, {property.district}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {/* Owner: Initiate Transfer */}
                  {isCurrentOwner && property.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(true)}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #0d9488, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🔄</span>
                      <span>Initiate Transfer</span>
                    </button>
                  )}

                  {/* Banker: File Mortgage Lien */}
                  {isBanker && property.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setShowMortgageModal(true)}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🏦</span>
                      <span>File Mortgage Lien</span>
                    </button>
                  )}

                  {/* Banker: Release Mortgage */}
                  {isBanker && property.status === 'MORTGAGED' && (
                    <button
                      type="button"
                      onClick={handleReleaseMortgage}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>🔓</span>
                      <span>Release Mortgage</span>
                    </button>
                  )}

                  {/* Buyer: Submit Buy Request / Purchase Offer */}
                  {isPotentialBuyer && property.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setShowBuyModal(true)}
                      className="lc-btn"
                      style={{
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>💼</span>
                      <span>Make Purchase Offer</span>
                    </button>
                  )}

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

                {/* Incoming Purchase Offers for Deed Owner */}
                {buyRequests.length > 0 && (
                  <div className="lc-card" style={{ gridColumn: '1 / -1', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.03)' }}>
                    <div className="lc-card__header">
                      <span className="lc-card__title">💼 Incoming Citizen Purchase Offers ({buyRequests.length})</span>
                      <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700 }}>Citizen Trading Desk</span>
                    </div>
                    <div className="lc-card__body">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {buyRequests.map((offer) => (
                          <div
                            key={offer.requestId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '1rem',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: '0.8rem' }}>
                                  {offer.requestId}
                                </span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '999px',
                                  background: offer.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.15)' : (offer.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                                  color: offer.status === 'ACCEPTED' ? 'var(--emerald)' : (offer.status === 'REJECTED' ? 'var(--rose)' : '#60a5fa'),
                                  border: `1px solid ${offer.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.4)' : (offer.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)')}`,
                                }}>
                                  {offer.status}
                                </span>
                                <strong style={{ color: 'var(--emerald)', fontSize: '0.9rem' }}>
                                  ₹{offer.offeredPrice.toLocaleString()}
                                </strong>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff' }}>
                                Buyer: <strong style={{ color: 'var(--gold)' }}>@{offer.buyerUsername}</strong>
                                {offer.message && <span style={{ color: 'var(--text-secondary)' }}> — "{offer.message}"</span>}
                              </p>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Offered on {new Date(offer.createdAt).toLocaleString()}
                              </span>
                            </div>

                            {isCurrentOwner && offer.status === 'PENDING' && property.status === 'ACTIVE' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptBuyRequest(offer.requestId)}
                                  className="lc-btn"
                                  style={{
                                    padding: '0.45rem 1rem',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✓ Accept & Transfer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectBuyRequest(offer.requestId)}
                                  className="lc-btn lc-btn-ghost"
                                  style={{
                                    padding: '0.45rem 0.8rem',
                                    fontSize: '0.76rem',
                                    color: 'var(--rose)',
                                    borderColor: 'rgba(244, 63, 94, 0.3)',
                                  }}
                                >
                                  ✗ Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Conveyance Review for Sub-Registrar / Government */}
                {(canApproveTransfer || transfers.length > 0) && (
                  <div className="lc-card" style={{ gridColumn: '1 / -1', border: '1px solid rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.03)' }}>
                    <div className="lc-card__header">
                      <span className="lc-card__title">⚖️ Pending Conveyance Review ({transfers.filter(t => t.status === 'INITIATED').length} Pending)</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 700 }}>Sub-Registrar Authority Desk</span>
                    </div>
                    <div className="lc-card__body">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {transfers.map((trf) => (
                          <div
                            key={trf.transferId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '1rem',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24', fontSize: '0.8rem' }}>
                                  {trf.transferId}
                                </span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '999px',
                                  background: trf.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                  color: trf.status === 'APPROVED' ? 'var(--emerald)' : 'var(--gold)',
                                  border: `1px solid ${trf.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
                                }}>
                                  {trf.status}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff' }}>
                                Conveyance from <strong style={{ color: 'var(--gold)' }}>@{trf.currentOwner}</strong> to Buyer <strong style={{ color: 'var(--emerald)' }}>@{trf.newOwner}</strong>
                              </p>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Initiated: {new Date(trf.initiatedAt).toLocaleString()} · Initial Tx: {trf.txId ? trf.txId.substring(0, 12) + '…' : 'N/A'}
                              </span>
                            </div>

                            {trf.status === 'INITIATED' && (
                              <button
                                type="button"
                                onClick={() => handleApproveTransfer(trf.transferId)}
                                className="lc-btn"
                                style={{
                                  padding: '0.5rem 1.1rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                }}
                              >
                                ✓ Execute On-Chain Conveyance
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hyperledger Fabric Ownership History Timeline */}
                <div className="lc-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="lc-card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="lc-card__title">⛓️ Authoritative Hyperledger Fabric Ledger History ({history.length} Blocks)</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 700, fontFamily: 'monospace' }}>
                      GET /api/blockchain/properties/{property.propertyId}/history
                    </span>
                  </div>
                  <div className="lc-card__body">
                    {history.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '0.5rem 0' }}>
                        No on-chain state transitions recorded yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {history.slice().reverse().map((h, idx) => (
                          <div
                            key={h.txId || idx}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.9rem 1.1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: '#34d399',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}>
                                  Block #{h.blockNumber}
                                </span>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: h.action === 'TRANSFER_CONVEYED' ? '#38bdf8' : (h.action === 'REGISTER_PROPERTY' ? 'var(--gold)' : 'var(--emerald)'),
                                  background: 'rgba(255,255,255,0.06)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                }}>
                                  {h.action}
                                </span>
                                {h.status && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    State: <strong>{h.status}</strong>
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.84rem', color: '#fff', margin: '0.2rem 0' }}>
                              {h.details}
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              color: 'var(--text-muted)',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '4px',
                            }}>
                              <span>TxID: <strong style={{ color: 'var(--text-secondary)' }}>{h.txId}</strong></span>
                              <span>Endorser: <strong style={{ color: 'var(--gold)' }}>{h.actorMsp || 'Org1MSP'}</strong> (@{h.actor})</span>
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

          {/* Transfer Initiation Modal */}
          {showTransferModal && property && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                width: '100%',
                maxWidth: 520,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                    🔄 Initiate Title Transfer on Fabric
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
                  Conveying ownership of parcel <strong style={{ color: '#fff' }}>{property.propertyId}</strong>.
                  The proposal will be signed by Owner MSP and submitted to the Registrar desk for review.
                </p>

                {transferFeedback && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    background: transferFeedback.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: transferFeedback.startsWith('✓') ? '#34d399' : '#f87171',
                    border: `1px solid ${transferFeedback.startsWith('✓') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                  }}>
                    {transferFeedback}
                  </div>
                )}

                <form onSubmit={handleInitiateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="lc-form-group">
                    <label className="lc-label">Designated Buyer Account Username *</label>
                    <input
                      className="lc-input"
                      value={buyerUsername}
                      onChange={(e) => setBuyerUsername(e.target.value)}
                      placeholder="e.g. buyer1"
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Available seed buyers: <strong>buyer1</strong>, <strong>buyer2</strong>, or any registered citizen.
                    </span>
                  </div>

                  {documents.length > 0 && (
                    <div className="lc-form-group">
                      <label className="lc-label">Associated Deed Document Proof (Optional)</label>
                      <select
                        className="lc-input"
                        value={selectedDeedId}
                        onChange={(e) => setSelectedDeedId(e.target.value)}
                      >
                        <option value="">-- Attach deed document --</option>
                        {documents.map((d) => (
                          <option key={d.documentId} value={d.documentId}>
                            {d.documentId} ({d.documentType}) - {d.originalFileName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(false)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transferSubmitting}
                      className="lc-btn lc-btn-primary"
                    >
                      {transferSubmitting ? 'Submitting to Fabric…' : 'Submit Transfer Proposal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Mortgage Filing Modal for Bankers */}
          {showMortgageModal && property && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                width: '100%',
                maxWidth: 520,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                    🏦 File Mortgage Encumbrance
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMortgageModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
                  Registering a formal banking encumbrance against parcel <strong style={{ color: '#fff' }}>{property.propertyId}</strong> on Hyperledger Fabric.
                  The title will be marked <strong style={{ color: '#a855f7' }}>MORTGAGED</strong>, locking any transfers until released.
                </p>

                <form onSubmit={handleFileMortgage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="lc-form-group">
                    <label className="lc-label">Loan Disbursed / Encumbrance Amount (₹) *</label>
                    <input
                      type="number"
                      className="lc-input"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="e.g. 5000000"
                      required
                    />
                  </div>

                  {documents.length > 0 && (
                    <div className="lc-form-group">
                      <label className="lc-label">Associated Title Deed Document (Optional)</label>
                      <select
                        className="lc-input"
                        value={mortgageDeedId}
                        onChange={(e) => setMortgageDeedId(e.target.value)}
                      >
                        <option value="">-- Select mortgaged document deed --</option>
                        {documents.map((d) => (
                          <option key={d.documentId} value={d.documentId}>
                            {d.documentId} ({d.documentType}) - {d.originalFileName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowMortgageModal(false)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mortgageSubmitting}
                      className="lc-btn"
                      style={{
                        padding: '0.6rem 1.2rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {mortgageSubmitting ? 'Registering Lien on Fabric…' : '✓ Commit Mortgage to Ledger'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Buy Request Modal for Buyers */}
          {showBuyModal && property && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                width: '100%',
                maxWidth: 520,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>
                    💼 Send Purchase Offer / Buy Request
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
                  Submitting formal acquisition proposal for parcel <strong style={{ color: '#fff' }}>{property.propertyId}</strong> to owner <strong style={{ color: 'var(--gold)' }}>@{property.ownerUsername}</strong>.
                </p>

                <form onSubmit={handleCreateBuyRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="lc-form-group">
                    <label className="lc-label">Purchase Offer Amount (₹) *</label>
                    <input
                      type="number"
                      className="lc-input"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="e.g. 7500000"
                      required
                    />
                  </div>

                  <div className="lc-form-group">
                    <label className="lc-label">Message / Terms for Title Deed Owner</label>
                    <textarea
                      className="lc-input"
                      rows={3}
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      placeholder="e.g. Official purchase offer with pre-approved banking finance."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowBuyModal(false)}
                      className="lc-btn lc-btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={buySubmitting}
                      className="lc-btn"
                      style={{
                        padding: '0.6rem 1.2rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {buySubmitting ? 'Sending Offer…' : '✓ Send Purchase Offer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};
